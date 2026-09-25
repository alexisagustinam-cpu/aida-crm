import 'server-only'
import { createHmac } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { decrypt, encrypt, maskSecret, randomToken } from './secrets'
import { CLAUDE_DEFAULT_MODEL, claudeComplete, claudeModels } from './ai/claude'
import { openaiComplete, openaiModels } from './ai/openai'
import { geminiComplete, geminiModels } from './ai/gemini'

export type IntegrationKey = 'whatsapp' | 'email' | 'n8n' | 'claude' | 'openai' | 'gemini'
export const AI_KEYS = ['claude', 'openai', 'gemini'] as const
export type AiKey = (typeof AI_KEYS)[number]

type Secrets = Record<string, string>
type Settings = Record<string, string>
export class IntegrationError extends Error {}

// ---------- lectura ----------

export async function getIntegration(key: IntegrationKey) {
  const db = await getDb()
  const [row] = await db.select().from(s.integrations).where(eq(s.integrations.key, key))
  if (!row) return null
  return { ...row, secrets: row.secret ? decrypt<Secrets>(row.secret) : {} }
}

// Estado de todas las integraciones para la pantalla (sin exponer claves completas).
export async function listIntegrations() {
  const db = await getDb()
  const rows = await db.select().from(s.integrations)
  const [def] = await db.select().from(s.settings).where(eq(s.settings.key, 'ai_default'))
  return {
    aiDefault: (def?.value as AiKey | undefined) ?? null,
    items: Object.fromEntries(rows.map(r => {
      const secrets = r.secret ? decrypt<Secrets>(r.secret) : {}
      const primary = secrets.apiKey ?? secrets.token ?? ''
      return [r.key, { status: r.status, lastError: r.lastError, settings: r.settings, masked: primary ? maskSecret(primary) : null, connectedBy: r.connectedBy, connectedAt: r.connectedAt.toISOString(), signingSecret: r.key === 'n8n' ? secrets.signingSecret ?? null : null }]
    })) as Record<string, { status: string; lastError: string | null; settings: Settings; masked: string | null; connectedBy: string | null; connectedAt: string; signingSecret: string | null }>,
  }
}

async function save(key: IntegrationKey, secrets: Secrets, settings: Settings, by: string) {
  const db = await getDb()
  const values = { secret: encrypt(secrets), settings, status: 'connected', lastError: null, connectedBy: by, connectedAt: new Date() }
  await db.insert(s.integrations).values({ key, ...values }).onConflictDoUpdate({ target: s.integrations.key, set: values })
}

export async function disconnect(key: IntegrationKey) {
  const db = await getDb()
  await db.delete(s.integrations).where(eq(s.integrations.key, key))
  const [def] = await db.select().from(s.settings).where(eq(s.settings.key, 'ai_default'))
  if (def?.value === key) await db.delete(s.settings).where(eq(s.settings.key, 'ai_default'))
}

async function markError(key: IntegrationKey, message: string) {
  const db = await getDb()
  await db.update(s.integrations).set({ status: 'error', lastError: message.slice(0, 300) }).where(eq(s.integrations.key, key))
}

// ---------- conectar (cada una se prueba contra el servicio real antes de guardarse) ----------

const need = (v: string | null | undefined, label: string) => { if (!v?.trim()) throw new IntegrationError(`Falta ${label}.`); return v.trim() }

export async function connectIntegration(key: IntegrationKey, input: Record<string, string | null>, member: { name: string; email: string }) {
  switch (key) {
    case 'whatsapp': {
      const token = need(input.token, 'el token de acceso'), phoneNumberId = need(input.phoneNumberId, 'el ID del número de teléfono')
      const r = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(phoneNumberId)}?fields=display_phone_number,verified_name`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000) })
      const body = (await r.json().catch(() => ({}))) as { display_phone_number?: string; verified_name?: string; error?: { message?: string } }
      if (!r.ok) throw new IntegrationError(`Meta rechazó los datos: ${body.error?.message ?? r.status}`)
      await save(key, { token }, { phoneNumberId, display: `${body.verified_name ?? ''} ${body.display_phone_number ?? ''}`.trim() }, member.name)
      return `Conectado a ${body.verified_name ?? 'WhatsApp'} (${body.display_phone_number ?? phoneNumberId}).`
    }
    case 'email': {
      const apiKey = need(input.apiKey, 'la API key de Resend'), from = need(input.from, 'el remitente')
      // La prueba es un correo real a quien conecta la integración.
      await resendSend(apiKey, from, [member.email], 'Correo conectado al CRM de AIDA', `Hola ${member.name}:\n\nEste correo confirma que el CRM de AIDA ya puede enviar correos desde ${from}.`)
      await save(key, { apiKey }, { from }, member.name)
      return `Conectado. Te enviamos un correo de prueba a ${member.email}.`
    }
    case 'n8n': {
      const url = need(input.url, 'la URL del webhook')
      const localDev = process.env.NODE_ENV === 'development' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)
      if (!/^https:\/\//.test(url) && !localDev) throw new IntegrationError('La URL del webhook debe empezar con https://')
      const existing = await getIntegration('n8n')
      const signingSecret = existing?.secrets.signingSecret ?? randomToken(24)
      const res = await postWebhook(url, signingSecret, 'crm.test', { mensaje: 'Prueba de conexión desde el CRM de AIDA' })
      if (!res.ok) throw new IntegrationError(`El webhook respondió ${res.status}. Revisa que el flujo de n8n esté activo.`)
      await save(key, { signingSecret }, { url }, member.name)
      return 'Conectado. n8n recibió un evento de prueba (crm.test).'
    }
    case 'claude': case 'openai': case 'gemini': {
      const apiKey = need(input.apiKey, 'la API key')
      let models: string[]
      try { models = key === 'claude' ? await claudeModels(apiKey) : key === 'openai' ? await openaiModels(apiKey) : await geminiModels(apiKey) }
      catch (e) { throw new IntegrationError(e instanceof Error && e.message ? humanAiError(key, e) : 'No se pudo verificar la llave.') }
      if (!models.length) throw new IntegrationError('La llave funciona, pero la cuenta no tiene modelos de texto disponibles.')
      const preferred = input.model && models.includes(input.model) ? input.model : key === 'claude' && models.includes(CLAUDE_DEFAULT_MODEL) ? CLAUDE_DEFAULT_MODEL : models[0]!
      await save(key, { apiKey }, { model: preferred, models: JSON.stringify(models.slice(0, 40)) }, member.name)
      const db = await getDb()
      const [def] = await db.select().from(s.settings).where(eq(s.settings.key, 'ai_default'))
      if (!def) await db.insert(s.settings).values({ key: 'ai_default', value: key })
      return `Conectado. Modelo: ${preferred}.`
    }
  }
}

function humanAiError(key: AiKey, e: Error) {
  const status = (e as { status?: number }).status
  if (status === 401 || /invalid|válida/i.test(e.message)) return `La llave de ${key === 'claude' ? 'Claude' : key === 'openai' ? 'OpenAI' : 'Gemini'} no es válida.`
  return e.message
}

export async function setAiModel(key: AiKey, model: string) {
  const db = await getDb()
  const row = await getIntegration(key)
  if (!row) throw new IntegrationError('Esa IA no está conectada.')
  const models: string[] = JSON.parse(row.settings.models ?? '[]')
  if (!models.includes(model)) throw new IntegrationError('Ese modelo no está disponible para la llave.')
  await db.update(s.integrations).set({ settings: { ...row.settings, model } }).where(eq(s.integrations.key, key))
}

export async function setAiDefault(key: AiKey) {
  const db = await getDb()
  if (!(await getIntegration(key))) throw new IntegrationError('Primero conecta esa IA.')
  await db.insert(s.settings).values({ key: 'ai_default', value: key }).onConflictDoUpdate({ target: s.settings.key, set: { value: key } })
}

// ---------- usar ----------

async function resendSend(apiKey: string, from: string, to: string[], subject: string, text: string) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(20_000),
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, text }),
  })
  if (!r.ok) {
    const body = (await r.json().catch(() => ({}))) as { message?: string }
    throw new IntegrationError(`Resend rechazó el correo: ${body.message ?? r.status}`)
  }
}

export async function sendEmail(to: string[], subject: string, text: string) {
  const row = await getIntegration('email')
  if (!row) throw new IntegrationError('El correo no está conectado (Configuración → Integraciones).')
  try { await resendSend(row.secrets.apiKey!, row.settings.from!, to, subject, text) }
  catch (e) { await markError('email', (e as Error).message); throw e }
}

export async function sendWhatsApp(to: string, body: string) {
  const row = await getIntegration('whatsapp')
  if (!row) throw new IntegrationError('WhatsApp no está conectado (Configuración → Integraciones).')
  const digits = to.replace(/\D/g, '')
  if (digits.length < 8) throw new IntegrationError('El número de WhatsApp no es válido.')
  const r = await fetch(`https://graph.facebook.com/v21.0/${row.settings.phoneNumberId}/messages`, {
    method: 'POST', signal: AbortSignal.timeout(20_000),
    headers: { Authorization: `Bearer ${row.secrets.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: digits, type: 'text', text: { body } }),
  })
  const res = (await r.json().catch(() => ({}))) as { error?: { message?: string; code?: number } }
  if (!r.ok) {
    // 131047: fuera de la ventana de 24 h, Meta exige una plantilla aprobada
    const msg = res.error?.code === 131047 ? 'Pasaron más de 24 h desde el último mensaje del cliente: Meta solo permite plantillas aprobadas. Usa el enlace de WhatsApp.' : `Meta rechazó el mensaje: ${res.error?.message ?? r.status}`
    throw new IntegrationError(msg)
  }
}

function postWebhook(url: string, secret: string, event: string, data: unknown) {
  const body = JSON.stringify({ event, data, at: new Date().toISOString(), source: 'aida-crm' })
  const signature = createHmac('sha256', secret).update(body).digest('hex')
  return fetch(url, { method: 'POST', signal: AbortSignal.timeout(8_000), headers: { 'Content-Type': 'application/json', 'x-aida-event': event, 'x-aida-signature': `sha256=${signature}` }, body })
}

// Envía un evento al webhook de n8n; devuelve false si no hay webhook conectado.
export async function sendWebhookEvent(event: string, data: unknown) {
  const row = await getIntegration('n8n')
  if (!row) return false
  const r = await postWebhook(row.settings.url!, row.secrets.signingSecret!, event, data).catch(e => { throw new IntegrationError(`No se pudo llamar al webhook: ${(e as Error).message}`) })
  if (!r.ok) { await markError('n8n', `El webhook respondió ${r.status}`); throw new IntegrationError(`El webhook respondió ${r.status}`) }
  return true
}

export async function aiAvailable() {
  const { aiDefault } = await listIntegrations()
  return aiDefault
}

// Pide texto a la IA elegida como predeterminada.
export async function aiComplete(system: string, prompt: string) {
  const db = await getDb()
  const [def] = await db.select().from(s.settings).where(eq(s.settings.key, 'ai_default'))
  const key = def?.value as AiKey | undefined
  if (!key) throw new IntegrationError('Conecta una IA (Claude, OpenAI o Gemini) en Configuración → Integraciones.')
  const row = await getIntegration(key)
  if (!row) throw new IntegrationError('La IA predeterminada ya no está conectada.')
  const run = key === 'claude' ? claudeComplete : key === 'openai' ? openaiComplete : geminiComplete
  try { return { text: await run(row.secrets.apiKey!, row.settings.model!, system, prompt), provider: key, model: row.settings.model! } }
  catch (e) { await markError(key, (e as Error).message); throw new IntegrationError(`La IA no respondió: ${(e as Error).message}`) }
}
