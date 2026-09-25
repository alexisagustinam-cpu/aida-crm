'use server'

import { getDb, schema as s } from '@/db'
import { action, req, str, UserError, type ActionState } from './action-helpers'
import { connectIntegration, disconnect, aiComplete, sendEmail, sendWebhookEvent, sendWhatsApp, setAiDefault, setAiModel, type AiKey, type IntegrationKey } from './integrations'
import { createApiKey, revokeApiKey } from './api-keys'
import { logActivity, runDailyChecks } from './automations'
import { getClientDetail } from './queries'
import { formatLongDate, formatMoney } from './format'

const KEYS: IntegrationKey[] = ['whatsapp', 'email', 'n8n', 'claude', 'openai', 'gemini']
const AI: AiKey[] = ['claude', 'openai', 'gemini']
const adminOnly = (role: string) => { if (role !== 'Administrador') throw new UserError('Solo un administrador puede cambiar las integraciones.') }

// ---------- integraciones ----------

export const connectAction = action(async (member, fd: FormData): Promise<ActionState> => {
  adminOnly(member.role)
  const key = req(fd, 'key', 'la integración') as IntegrationKey
  if (!KEYS.includes(key)) throw new UserError('Integración desconocida.')
  const input = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : null]))
  const message = await connectIntegration(key, input, { name: member.name, email: member.email })
  return { ok: true, message }
})

export const disconnectAction = action(async (member, key: IntegrationKey) => {
  adminOnly(member.role)
  if (!KEYS.includes(key)) throw new UserError('Integración desconocida.')
  await disconnect(key)
})

export const setAiModelAction = action(async (member, key: AiKey, model: string) => {
  adminOnly(member.role)
  if (!AI.includes(key)) throw new UserError('IA desconocida.')
  await setAiModel(key, model)
})

export const setAiDefaultAction = action(async (member, key: AiKey) => {
  adminOnly(member.role)
  if (!AI.includes(key)) throw new UserError('IA desconocida.')
  await setAiDefault(key)
})

// Prueba en vivo de cada integración conectada.
export const testIntegrationAction = action(async (member, key: IntegrationKey): Promise<ActionState> => {
  switch (key) {
    case 'email': await sendEmail([member.email], 'Prueba del CRM de AIDA', `Hola ${member.name}: este es un correo de prueba enviado desde el CRM.`); return { ok: true, message: `Correo de prueba enviado a ${member.email}.` }
    case 'n8n': await sendWebhookEvent('crm.test', { mensaje: 'Prueba manual', por: member.name }); return { ok: true, message: 'n8n recibió el evento crm.test.' }
    case 'claude': case 'openai': case 'gemini': {
      const r = await aiComplete('Responde en una sola frase corta, en español.', 'Saluda al equipo de AIDA Digital Solutions.')
      return { ok: true, message: `${r.model}: “${r.text.slice(0, 160)}”` }
    }
    case 'whatsapp': return { ok: true, message: 'WhatsApp está conectado. Pruébalo enviando un mensaje desde la ficha de un cliente.' }
  }
})

// ---------- llaves de API (MCP y n8n) ----------

export const createApiKeyAction = action(async (member, fd: FormData): Promise<ActionState> => {
  adminOnly(member.role)
  const token = await createApiKey(req(fd, 'name', 'un nombre para la llave'), member.name)
  return { ok: true, message: token }
})

export const revokeApiKeyAction = action(async (member, id: string) => {
  adminOnly(member.role)
  await revokeApiKey(id)
})

// ---------- automatizaciones ----------

export const runDailyNowAction = action(async (): Promise<ActionState> => {
  await runDailyChecks({ force: true })
  return { ok: true, message: 'Revisión diaria ejecutada. Mira el historial.' }
})

// ---------- IA y mensajes ----------

const SYSTEM_WRITER = 'Eres parte del equipo de AIDA Digital Solutions, una agencia digital en Ecuador (sitios web, branding, SEO, CRM, WhatsApp y automatización). Escribes en español neutro de Ecuador, cálido, claro y profesional, sin exagerar ni inventar datos que no te dieron. Devuelve solo el texto final, sin comillas ni explicaciones.'

export const draftMessageAction = action(async (member, fd: FormData): Promise<ActionState> => {
  const clientId = str(fd, 'clientId')
  const channel = str(fd, 'channel') ?? 'whatsapp'
  const intent = req(fd, 'intent', 'qué quieres decir')
  const context = clientId ? await clientContext(clientId) : ''
  const format = channel === 'email' ? 'un correo (sin asunto, solo el cuerpo, con saludo y despedida firmada por el equipo)' : 'un mensaje de WhatsApp breve (máximo 4 líneas, sin firma formal)'
  const r = await aiComplete(SYSTEM_WRITER, `Redacta ${format} de parte de ${member.name}.\n\nQué quiere decir: ${intent}\n\n${context ? `Datos del cliente:\n${context}` : ''}`)
  return { ok: true, message: r.text }
})

export const clientSummaryAction = action(async (_member, clientId: string): Promise<ActionState> => {
  const context = await clientContext(clientId)
  const r = await aiComplete(SYSTEM_WRITER, `Resume en 5 viñetas cortas el estado de este cliente para el equipo: cómo va el proyecto, pagos, qué está pendiente y el siguiente paso recomendado.\n\n${context}`)
  return { ok: true, message: r.text }
})

export const sendMessageAction = action(async (member, fd: FormData): Promise<ActionState> => {
  const channel = req(fd, 'channel', 'el canal')
  const to = req(fd, 'to', 'el destinatario')
  const body = req(fd, 'body', 'el mensaje')
  const clientId = str(fd, 'clientId')
  if (channel === 'email') await sendEmail([to], str(fd, 'subject') ?? 'AIDA Digital Solutions', body)
  else if (channel === 'whatsapp') await sendWhatsApp(to, body)
  else throw new UserError('Canal desconocido.')
  await logActivity({ kind: 'client', title: channel === 'email' ? 'Correo enviado' : 'WhatsApp enviado', detail: body.length > 80 ? `${body.slice(0, 80)}…` : body, clientId, actor: member.name })
  return { ok: true, message: channel === 'email' ? `Correo enviado a ${to}.` : `WhatsApp enviado a ${to}.` }
})

export const saveSummaryAsNoteAction = action(async (member, clientId: string, text: string) => {
  const db = await getDb()
  await db.insert(s.notes).values({ clientId, body: text, pinned: false, author: `${member.name} (resumen IA)` })
})

async function clientContext(clientId: string) {
  const d = await getClientDetail(clientId)
  if (!d) throw new UserError('No existe ese cliente.')
  const c = d.client
  return [
    `Cliente: ${c.name} (${[c.category, c.industry, c.location].filter(Boolean).join(', ')})`,
    c.description && `Descripción: ${c.description}`,
    c.contactName && `Contacto: ${c.contactName}`,
    `Estado: ${c.status}. Responsable en AIDA: ${c.owner ?? 'sin asignar'}.`,
    ...d.projects.map(p => `Proyecto “${p.name}” (${p.status}): ${p.progress}% — ${p.components.map(k => `${k.name} ${k.progress}%`).join(', ')}`),
    ...d.invoices.slice(0, 4).map(i => `Factura #${i.number} ${formatMoney(i.amountCents)} ${i.status} (${formatLongDate(i.issuedOn)})`),
    ...d.tasks.filter(t => !t.done).slice(0, 6).map(t => `Tarea pendiente: ${t.title}${t.dueDate ? ` (vence ${t.dueDate})` : ''}`),
    ...d.meetings.slice(0, 2).map(m => `Próxima reunión: ${m.title} el ${formatLongDate(m.startsAt)}`),
    ...d.notes.slice(0, 4).map(n => `Nota: ${n.body}`),
    ...d.activity.slice(0, 6).map(a => `Actividad: ${a.title} — ${a.detail ?? ''}`),
  ].filter(Boolean).join('\n')
}

