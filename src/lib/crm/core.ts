import 'server-only'
import { and, eq, sql } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { dayKey, formatMoney, todayKey } from './format'
import { emitEvent, logActivity, notify, onNewLead, runAutomation } from './automations'

// Operaciones del CRM compartidas por la pantalla, el servidor MCP, la API para n8n y el formulario web.
// `actor` es quién la hizo (nombre de la persona o "n8n", "Claude (MCP)", "Formulario web"…).

export const STAGE_NAMES = ['Lead', 'Contactado', 'Reunión', 'Propuesta', 'Ganado', 'Perdido']

export type LeadInput = { company: string; service: string; valueCents?: number; stage?: string; contactName?: string | null; email?: string | null; phone?: string | null; source?: string | null; clientId?: string | null; nextActionAt?: Date | null; message?: string | null }

export async function createLead(input: LeadInput, actor: string) {
  const db = await getDb()
  const stage = input.stage && STAGE_NAMES.includes(input.stage) ? input.stage : 'Lead'
  const [opp] = await db.insert(s.opportunities).values({
    company: input.company, service: input.service, valueCents: input.valueCents ?? 0, stage, position: -1,
    contactName: input.contactName ?? null, email: input.email ?? null, phone: input.phone ?? null, source: input.source ?? null,
    clientId: input.clientId ?? null, nextActionAt: input.nextActionAt ?? null,
  }).returning()
  await logActivity({ kind: 'lead', title: 'Nuevo lead agregado', detail: input.message ? `${input.company}: ${input.message.slice(0, 80)}` : `${input.company} entró al pipeline`, clientId: input.clientId, actor })
  await onNewLead({ id: opp!.id, company: opp!.company, service: opp!.service, contactName: opp!.contactName, email: opp!.email, phone: opp!.phone, source: opp!.source, valueCents: opp!.valueCents, message: input.message })
  if (stage === 'Ganado') await onWon(opp!.id, actor)
  return opp!
}

// Cambia la etapa (y opcionalmente el orden dentro de la columna).
export async function moveOpportunityTo(id: string, stage: string, actor: string, beforeId: string | null = null) {
  if (!STAGE_NAMES.includes(stage)) throw new Error(`Etapa inválida. Usa una de: ${STAGE_NAMES.join(', ')}`)
  const db = await getDb()
  const [opp] = await db.select().from(s.opportunities).where(eq(s.opportunities.id, id))
  if (!opp) throw new Error('No existe esa oportunidad.')
  const column = await db.select({ id: s.opportunities.id }).from(s.opportunities)
    .where(and(eq(s.opportunities.stage, stage), sql`${s.opportunities.id} <> ${id}`)).orderBy(s.opportunities.position, sql`${s.opportunities.stageChangedAt} desc`)
  const ids = column.map(c => c.id)
  const at = beforeId ? ids.indexOf(beforeId) : -1
  ids.splice(at < 0 ? ids.length : at, 0, id)
  await Promise.all(ids.map((cid, position) => db.update(s.opportunities).set({ position }).where(eq(s.opportunities.id, cid))))
  if (opp.stage !== stage) {
    await db.update(s.opportunities).set({ stage, stageChangedAt: new Date() }).where(eq(s.opportunities.id, id))
    await afterStageChange(opp, stage, actor)
  }
  return { ...opp, stage }
}

export async function afterStageChange(opp: { id: string; company: string; valueCents: number; stage: string }, stage: string, actor: string) {
  const titles: Record<string, [string, string]> = {
    Contactado: ['lead', 'Lead contactado'], Reunión: ['meeting', 'Reunión en agenda'], Propuesta: ['proposal', 'Propuesta enviada'],
    Ganado: ['project', 'Oportunidad ganada'], Perdido: ['lead', 'Oportunidad perdida'], Lead: ['lead', 'Volvió a Lead'],
  }
  const [kind, title] = titles[stage] ?? ['lead', `Pasó a ${stage}`]
  await logActivity({ kind, title, detail: `${opp.company} · ${formatMoney(opp.valueCents)}`, actor })
  await emitEvent('opportunity.stage_changed', { id: opp.id, company: opp.company, from: opp.stage, to: stage, valueCents: opp.valueCents })
  if (stage === 'Ganado') await onWon(opp.id, actor)
}

// Automatización: oportunidad ganada → cliente + tarea de bienvenida
async function onWon(id: string, actor: string) {
  const db = await getDb()
  await runAutomation('won_to_client', async () => {
    const [opp] = await db.select().from(s.opportunities).where(eq(s.opportunities.id, id))
    if (!opp) return 'La oportunidad ya no existe'
    let clientId = opp.clientId
    let created = false
    if (!clientId) {
      const [existing] = await db.select({ id: s.clients.id }).from(s.clients).where(sql`lower(${s.clients.name}) = lower(${opp.company})`)
      clientId = existing?.id ?? null
    }
    if (!clientId) {
      const [c] = await db.insert(s.clients).values({ name: opp.company, status: 'Activo', contactName: opp.contactName, email: opp.email, phone: opp.phone, owner: actor, clientSince: todayKey() }).returning({ id: s.clients.id })
      clientId = c!.id
      created = true
      await db.insert(s.channels).values(['Website', 'WhatsApp', 'CRM', 'SEO'].map((name, position) => ({ clientId: clientId!, name, active: false, position })))
      if (opp.contactName) await db.insert(s.contacts).values({ clientId, name: opp.contactName, email: opp.email, phone: opp.phone })
      await logActivity({ kind: 'client', title: 'Cliente nuevo', detail: `${opp.company} (desde el pipeline)`, clientId, actor })
    } else {
      await db.update(s.clients).set({ status: 'Activo', archived: false }).where(eq(s.clients.id, clientId))
    }
    await db.update(s.opportunities).set({ clientId }).where(eq(s.opportunities.id, id))
    await db.insert(s.tasks).values({ title: `Bienvenida y kickoff con ${opp.company}`, priority: 'Alta', dueDate: dayKey(new Date(Date.now() + 2 * 86_400_000)), clientId, assignee: actor })
    await notify({ title: `¡Ganamos ${opp.company}!`, body: `${opp.service} · ${formatMoney(opp.valueCents)}`, href: `/clientes/${clientId}` })
    await emitEvent('opportunity.won', { id, company: opp.company, service: opp.service, valueCents: opp.valueCents, clientId })
    if (created) await emitEvent('client.created', { id: clientId, name: opp.company, source: 'pipeline' })
    return `${created ? 'Cliente creado' : 'Cliente reactivado'} y tarea de bienvenida para ${opp.company}`
  })
}

export type TaskInput = { title: string; priority?: string; dueDate?: string | null; clientId?: string | null; projectId?: string | null; assignee?: string | null }

export async function createTask(input: TaskInput, actor: string) {
  const db = await getDb()
  const [t] = await db.insert(s.tasks).values({
    title: input.title, priority: ['Alta', 'Media', 'Baja'].includes(input.priority ?? '') ? input.priority! : 'Media',
    dueDate: input.dueDate ?? null, clientId: input.clientId ?? null, projectId: input.projectId ?? null, assignee: input.assignee ?? actor,
  }).returning()
  return t!
}

export async function setTaskDone(id: string, done: boolean, actor: string) {
  const db = await getDb()
  const [t] = await db.select().from(s.tasks).where(eq(s.tasks.id, id))
  if (!t) throw new Error('No existe esa tarea.')
  if (t.done === done) return t
  await db.update(s.tasks).set({ done, completedAt: done ? new Date() : null }).where(eq(s.tasks.id, id))
  if (done) {
    await logActivity({ kind: 'task', title: 'Tarea completada', detail: t.title, clientId: t.clientId, actor })
    await emitEvent('task.completed', { id, title: t.title, clientId: t.clientId, by: actor })
  }
  return { ...t, done }
}

export type MeetingInput = { title: string; startsAt: Date; location?: string | null; link?: string | null; clientId?: string | null }

export async function createMeeting(input: MeetingInput, actor: string) {
  const db = await getDb()
  const [m] = await db.insert(s.meetings).values({ title: input.title, startsAt: input.startsAt, location: input.location ?? null, link: input.link ?? null, clientId: input.clientId ?? null }).returning()
  const clientName = input.clientId ? (await db.select({ name: s.clients.name }).from(s.clients).where(eq(s.clients.id, input.clientId)))[0]?.name : null
  await logActivity({ kind: 'meeting', title: 'Reunión programada', detail: clientName ? `${input.title} con ${clientName}` : input.title, clientId: input.clientId, actor })
  if (input.clientId) await runAutomation('meeting_prep_task', async () => {
    const dayBefore = dayKey(new Date(input.startsAt.getTime() - 86_400_000))
    await db.insert(s.tasks).values({ title: `Preparar: ${input.title}`, priority: 'Media', dueDate: dayBefore < todayKey() ? todayKey() : dayBefore, clientId: input.clientId, assignee: actor })
    return `Tarea de preparación para “${input.title}”`
  })
  await emitEvent('meeting.created', { id: m!.id, title: m!.title, startsAt: m!.startsAt.toISOString(), clientId: m!.clientId, link: m!.link })
  return m!
}

export async function addClientNote(clientId: string, body: string, pinned: boolean, actor: string) {
  const db = await getDb()
  const [n] = await db.insert(s.notes).values({ clientId, body, pinned, author: actor }).returning()
  await logActivity({ kind: 'note', title: 'Nota agregada', detail: body.length > 70 ? `${body.slice(0, 70)}…` : body, clientId, actor })
  return n!
}

export async function markInvoicePaidCore(id: string, actor: string) {
  const db = await getDb()
  const [inv] = await db.update(s.invoices).set({ status: 'Pagado', paidOn: todayKey() }).where(eq(s.invoices.id, id)).returning()
  if (!inv) throw new Error('No existe esa factura.')
  await paymentReceived(inv, actor)
  return inv
}

export async function paymentReceived(inv: { id: string; clientId: string; number: string; amountCents: number }, actor: string) {
  await runAutomation('payment_activity', async () => {
    await logActivity({ kind: 'payment', title: 'Pago registrado', detail: `Invoice #${inv.number} marcada como pagada · ${formatMoney(inv.amountCents)}`, clientId: inv.clientId, actor })
    return `Invoice #${inv.number} en la actividad`
  })
  await emitEvent('invoice.paid', { id: inv.id, number: inv.number, clientId: inv.clientId, amountCents: inv.amountCents })
}
