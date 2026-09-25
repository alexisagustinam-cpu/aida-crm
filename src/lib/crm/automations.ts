import 'server-only'
import { and, eq, gte, lt, sql } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { formatDue, formatTime, todayKey } from './format'
import { getIntegration, IntegrationError, sendEmail, sendWebhookEvent, type IntegrationKey } from './integrations'

export async function logActivity(entry: { kind: string; title: string; detail?: string | null; clientId?: string | null; actor?: string | null }) {
  const db = await getDb()
  await db.insert(s.activity).values({ kind: entry.kind, title: entry.title, detail: entry.detail ?? null, clientId: entry.clientId ?? null, actor: entry.actor ?? null })
}

export async function notify(n: { title: string; body?: string | null; href?: string | null }) {
  const db = await getDb()
  await db.insert(s.notifications).values({ title: n.title, body: n.body ?? null, href: n.href ?? null })
}

async function recordRun(key: string, status: 'ok' | 'error' | 'skipped', detail: string | null) {
  const db = await getDb()
  await db.insert(s.automationRuns).values({ automationKey: key, status, detail: detail?.slice(0, 500) ?? null })
  if (status === 'ok') await db.update(s.automations).set({ runs: sql`${s.automations.runs} + 1`, lastRunAt: new Date() }).where(eq(s.automations.key, key))
}

// Integración que necesita cada automatización para poder correr.
export const AUTOMATION_REQUIRES: Record<string, IntegrationKey | undefined> = { webhook_events: 'n8n', lead_email_team: 'email', daily_digest_email: 'email' }

// Ejecuta una automatización si está activa y deja constancia en el historial.
// Un fallo nunca rompe la acción que la disparó: se registra como error.
export async function runAutomation(key: string, fn: () => Promise<string | void>) {
  const db = await getDb()
  const [rule] = await db.select().from(s.automations).where(eq(s.automations.key, key))
  if (!rule?.active) return
  const requires = AUTOMATION_REQUIRES[key]
  if (requires && !(await getIntegration(requires))) return recordRun(key, 'skipped', `Falta conectar ${INTEGRATION_NAMES[requires]}`)
  try {
    const detail = await fn()
    await recordRun(key, 'ok', detail ?? null)
  } catch (error) {
    console.error(`automation/${key}:`, error)
    await recordRun(key, 'error', error instanceof Error ? error.message : 'Error desconocido')
  }
}

export const INTEGRATION_NAMES: Record<IntegrationKey, string> = { whatsapp: 'WhatsApp', email: 'el correo', n8n: 'n8n', claude: 'Claude', openai: 'OpenAI', gemini: 'Gemini' }

// Evento del CRM → webhook de n8n (si la automatización está activa y n8n conectado).
export async function emitEvent(event: string, data: Record<string, unknown>) {
  await runAutomation('webhook_events', async () => {
    await sendWebhookEvent(event, data)
    return `${event} enviado a n8n`
  })
}

async function teamEmails() {
  const db = await getDb()
  return (await db.select({ email: s.members.email }).from(s.members)).map(m => m.email).filter(e => e.includes('@') && !e.endsWith('.local'))
}

// Lead nuevo (desde el CRM, la web, n8n o MCP): aviso en la campana, correo al equipo y evento.
export async function onNewLead(lead: { id: string; company: string; service: string; contactName?: string | null; email?: string | null; phone?: string | null; source?: string | null; valueCents?: number; message?: string | null }) {
  await runAutomation('new_lead_notify', async () => {
    await notify({ title: `Lead nuevo: ${lead.company}`, body: lead.message ?? lead.service, href: '/leads' })
    return `Aviso creado para ${lead.company}`
  })
  await runAutomation('lead_email_team', async () => {
    const to = await teamEmails()
    if (!to.length) throw new IntegrationError('No hay correos del equipo registrados.')
    const lines = [`Empresa: ${lead.company}`, `Servicio: ${lead.service}`, lead.contactName && `Contacto: ${lead.contactName}`, lead.email && `Correo: ${lead.email}`, lead.phone && `Teléfono: ${lead.phone}`, lead.source && `Origen: ${lead.source}`, lead.message && `\nMensaje:\n${lead.message}`]
    await sendEmail(to, `Lead nuevo: ${lead.company}`, `${lines.filter(Boolean).join('\n')}\n\nVer en el CRM: /leads`)
    return `Correo enviado a ${to.length} ${to.length === 1 ? 'persona' : 'personas'}`
  })
  await emitEvent('lead.created', lead)
}

// Revisión diaria: la llama el cron de Vercel cada mañana y, como respaldo, la primera visita del día.
export async function runDailyChecks(opts: { force?: boolean } = {}) {
  const db = await getDb()
  const today = todayKey()
  const [last] = await db.select().from(s.settings).where(eq(s.settings.key, 'daily_check'))
  if (last?.value === today && !opts.force) return false
  await db.insert(s.settings).values({ key: 'daily_check', value: today }).onConflictDoUpdate({ target: s.settings.key, set: { value: today } })
  const due = await db.select({ title: s.tasks.title, dueDate: s.tasks.dueDate, assignee: s.tasks.assignee }).from(s.tasks).where(and(eq(s.tasks.done, false), eq(s.tasks.dueDate, today)))
  const overdue = await db.$count(s.tasks, and(eq(s.tasks.done, false), sql`${s.tasks.dueDate} < ${today}`))
  const start = new Date(`${today}T00:00:00-05:00`), end = new Date(`${today}T23:59:59-05:00`)
  const meetings = await db.select({ title: s.meetings.title, startsAt: s.meetings.startsAt }).from(s.meetings).where(and(gte(s.meetings.startsAt, start), lt(s.meetings.startsAt, end)))

  await runAutomation('tasks_due_notify', async () => {
    if (!due.length) return 'Ninguna tarea vence hoy'
    await notify({
      title: due.length === 1 ? 'Tienes 1 tarea que vence hoy' : `Tienes ${due.length} tareas que vencen hoy`,
      body: due.slice(0, 3).map(t => `${t.title} (${formatDue(t.dueDate)})`).join(' · '), href: '/tareas?filtro=hoy',
    })
    return `${due.length} ${due.length === 1 ? 'tarea' : 'tareas'} para hoy`
  })
  await runAutomation('daily_digest_email', async () => {
    const to = await teamEmails()
    if (!to.length) throw new IntegrationError('No hay correos del equipo registrados.')
    const text = [
      `Buenos días. Así viene el día en AIDA:`, '',
      `Tareas que vencen hoy (${due.length}):`, ...(due.length ? due.map(t => `• ${t.title}${t.assignee ? ` — ${t.assignee}` : ''}`) : ['• Ninguna']),
      overdue ? `\nTareas vencidas: ${overdue}` : '', '',
      `Reuniones de hoy (${meetings.length}):`, ...(meetings.length ? meetings.map(m => `• ${formatTime(m.startsAt)} ${m.title}`) : ['• Ninguna']),
    ].join('\n')
    await sendEmail(to, `Tu día en AIDA · ${due.length} tareas, ${meetings.length} reuniones`, text)
    return `Resumen enviado a ${to.length} ${to.length === 1 ? 'persona' : 'personas'}`
  })
  return true
}
