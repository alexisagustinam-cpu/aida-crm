'use server'

import { redirect } from 'next/navigation'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { formatMoney, todayKey } from './format'
import { emitEvent, logActivity } from './automations'
import { addClientNote, afterStageChange, createLead, createMeeting, markInvoicePaidCore, moveOpportunityTo, paymentReceived, setTaskDone } from './core'

import { action, bool, int, localDateTime, parseMoney, req, str, UserError, type ActionState } from './action-helpers'
export type { ActionState }

// ---------- clientes ----------

function clientFields(fd: FormData) {
  return {
    name: req(fd, 'name', 'el nombre'), status: str(fd, 'status') ?? 'Activo', category: str(fd, 'category'), industry: str(fd, 'industry'),
    location: str(fd, 'location'), description: str(fd, 'description'), contactName: str(fd, 'contactName'), email: str(fd, 'email'),
    phone: str(fd, 'phone'), owner: str(fd, 'owner'), clientSince: str(fd, 'clientSince'),
  }
}

export const createClient = action(async (member, fd: FormData) => {
  const db = await getDb()
  const fields = clientFields(fd)
  const [client] = await db.insert(s.clients).values({ ...fields, clientSince: fields.clientSince ?? todayKey() }).returning({ id: s.clients.id })
  await db.insert(s.channels).values(['Website', 'WhatsApp', 'CRM', 'SEO'].map((name, position) => ({ clientId: client!.id, name, active: false, position })))
  if (fields.contactName) await db.insert(s.contacts).values({ clientId: client!.id, name: fields.contactName, email: fields.email, phone: fields.phone })
  await logActivity({ kind: 'client', title: 'Cliente nuevo', detail: fields.name, clientId: client!.id, actor: member.name })
  await emitEvent('client.created', { id: client!.id, name: fields.name, industry: fields.industry, source: 'manual' })
  redirect(`/clientes/${client!.id}`)
})

export const updateClient = action(async (member, fd: FormData) => {
  const db = await getDb()
  const id = req(fd, 'id', 'el cliente')
  await db.update(s.clients).set(clientFields(fd)).where(eq(s.clients.id, id))
  await logActivity({ kind: 'client', title: 'Cliente actualizado', detail: str(fd, 'name'), clientId: id, actor: member.name })
})

export const setClientArchived = action(async (member, id: string, archived: boolean) => {
  const db = await getDb()
  const [c] = await db.update(s.clients).set({ archived }).where(eq(s.clients.id, id)).returning({ name: s.clients.name })
  await logActivity({ kind: 'client', title: archived ? 'Cliente archivado' : 'Cliente reactivado', detail: c?.name, clientId: id, actor: member.name })
})

export const deleteClient = action(async (_member, id: string) => {
  const db = await getDb()
  await db.delete(s.clients).where(eq(s.clients.id, id))
  redirect('/clientes')
})

export const toggleChannel = action(async (member, id: string) => {
  const db = await getDb()
  const [ch] = await db.update(s.channels).set({ active: sql`not ${s.channels.active}` }).where(eq(s.channels.id, id)).returning()
  if (ch) await logActivity({ kind: 'client', title: ch.active ? 'Canal conectado' : 'Canal desconectado', detail: ch.name, clientId: ch.clientId, actor: member.name })
})

export const addChannel = action(async (_member, fd: FormData) => {
  const db = await getDb()
  const clientId = req(fd, 'clientId', 'el cliente')
  const count = await db.$count(s.channels, eq(s.channels.clientId, clientId))
  await db.insert(s.channels).values({ clientId, name: req(fd, 'name', 'el nombre del canal'), active: true, position: count })
})

export const deleteChannel = action(async (_member, id: string) => {
  const db = await getDb()
  await db.delete(s.channels).where(eq(s.channels.id, id))
})

export const saveContact = action(async (_member, fd: FormData) => {
  const db = await getDb()
  const id = str(fd, 'id')
  const values = { clientId: req(fd, 'clientId', 'el cliente'), name: req(fd, 'name', 'el nombre'), role: str(fd, 'role'), email: str(fd, 'email'), phone: str(fd, 'phone') }
  if (id) await db.update(s.contacts).set(values).where(eq(s.contacts.id, id))
  else await db.insert(s.contacts).values(values)
})

export const deleteContact = action(async (_member, id: string) => {
  const db = await getDb()
  await db.delete(s.contacts).where(eq(s.contacts.id, id))
})

export const addNote = action(async (member, fd: FormData) => {
  await addClientNote(req(fd, 'clientId', 'el cliente'), req(fd, 'body', 'el texto de la nota'), bool(fd, 'pinned'), member.name)
})

export const toggleNotePin = action(async (_member, id: string) => {
  const db = await getDb()
  await db.update(s.notes).set({ pinned: sql`not ${s.notes.pinned}` }).where(eq(s.notes.id, id))
})

export const deleteNote = action(async (_member, id: string) => {
  const db = await getDb()
  await db.delete(s.notes).where(eq(s.notes.id, id))
})

export const addFile = action(async (member, fd: FormData) => {
  const db = await getDb()
  const url = req(fd, 'url', 'el enlace')
  if (!/^https?:\/\//i.test(url)) throw new UserError('El enlace debe empezar con https://')
  const clientId = req(fd, 'clientId', 'el cliente')
  const name = req(fd, 'name', 'el nombre')
  await db.insert(s.files).values({ clientId, name, url })
  await logActivity({ kind: 'client', title: 'Archivo agregado', detail: name, clientId, actor: member.name })
})

export const deleteFile = action(async (_member, id: string) => {
  const db = await getDb()
  await db.delete(s.files).where(eq(s.files.id, id))
})

export const saveMetrics = action(async (_member, fd: FormData) => {
  const db = await getDb()
  const clientId = req(fd, 'clientId', 'el cliente')
  const month = `${req(fd, 'month', 'el mes')}-01`
  const values = { visits: int(fd, 'visits', 0, 10_000_000), leads: int(fd, 'leads', 0, 1_000_000), conversions: int(fd, 'conversions', 0, 1_000_000) }
  await db.insert(s.clientMetrics).values({ clientId, month, ...values })
    .onConflictDoUpdate({ target: [s.clientMetrics.clientId, s.clientMetrics.month], set: values })
})

// ---------- oportunidades (leads y pipeline) ----------

function opportunityFields(fd: FormData) {
  const date = str(fd, 'nextDate')
  return {
    company: req(fd, 'company', 'la empresa'), service: req(fd, 'service', 'el servicio'), stage: str(fd, 'stage') ?? 'Lead',
    contactName: str(fd, 'contactName'), email: str(fd, 'email'), phone: str(fd, 'phone'), source: str(fd, 'source'),
    clientId: str(fd, 'clientId'), nextActionAt: date ? localDateTime(date, str(fd, 'nextTime')) : null,
  }
}

export const createOpportunity = action(async (member, fd: FormData) => {
  const fields = opportunityFields(fd)
  await createLead({ ...fields, valueCents: await parseMoney(str(fd, 'value')) }, member.name)
})

export const updateOpportunity = action(async (member, fd: FormData) => {
  const db = await getDb()
  const id = req(fd, 'id', 'la oportunidad')
  const [before] = await db.select().from(s.opportunities).where(eq(s.opportunities.id, id))
  if (!before) throw new UserError('Esa oportunidad ya no existe.')
  const fields = opportunityFields(fd)
  const valueCents = await parseMoney(str(fd, 'value'))
  const stageChanged = before.stage !== fields.stage
  await db.update(s.opportunities).set({ ...fields, valueCents, ...(stageChanged ? { stageChangedAt: new Date() } : {}) }).where(eq(s.opportunities.id, id))
  if (stageChanged) await afterStageChange({ ...before, valueCents }, fields.stage, member.name)
})

export const moveOpportunity = action(async (member, id: string, stage: string, beforeId: string | null) => {
  await moveOpportunityTo(id, stage, member.name, beforeId)
})

export const deleteOpportunity = action(async (_member, id: string) => {
  const db = await getDb()
  await db.delete(s.opportunities).where(eq(s.opportunities.id, id))
})

// ---------- proyectos ----------

export const saveProject = action(async (member, fd: FormData) => {
  const db = await getDb()
  const id = str(fd, 'id')
  const values = { name: req(fd, 'name', 'el nombre'), clientId: str(fd, 'clientId'), description: str(fd, 'description'), status: str(fd, 'status') ?? 'En curso', dueDate: str(fd, 'dueDate') }
  if (id) {
    await db.update(s.projects).set(values).where(eq(s.projects.id, id))
  } else {
    const [p] = await db.insert(s.projects).values(values).returning({ id: s.projects.id })
    const parts = (str(fd, 'components') ?? 'Diseño, Desarrollo').split(',').map(x => x.trim()).filter(Boolean)
    const colors = ['#0866ff', '#12c6b4', '#a77bff', '#ff7a1a', '#41d18b']
    if (parts.length) await db.insert(s.projectComponents).values(parts.map((name, i) => ({ projectId: p!.id, name, progress: 0, color: colors[i % colors.length]!, position: i })))
    await logActivity({ kind: 'project', title: 'Proyecto nuevo', detail: values.name, clientId: values.clientId, actor: member.name })
  }
})

export const deleteProject = action(async (_member, id: string) => {
  const db = await getDb()
  await db.delete(s.projects).where(eq(s.projects.id, id))
})

export const setComponentProgress = action(async (member, id: string, progress: number) => {
  const db = await getDb()
  const value = Math.min(100, Math.max(0, Math.round(progress)))
  const [c] = await db.update(s.projectComponents).set({ progress: value }).where(eq(s.projectComponents.id, id)).returning()
  if (!c) return
  const [p] = await db.select().from(s.projects).where(eq(s.projects.id, c.projectId))
  const comps = await db.select({ progress: s.projectComponents.progress }).from(s.projectComponents).where(eq(s.projectComponents.projectId, c.projectId))
  const avg = Math.round(comps.reduce((t, x) => t + x.progress, 0) / comps.length)
  await logActivity({ kind: 'project', title: 'Proyecto actualizado', detail: `${p?.name} · ${avg}%`, clientId: p?.clientId, actor: member.name })
})

export const addComponent = action(async (_member, fd: FormData) => {
  const db = await getDb()
  const projectId = req(fd, 'projectId', 'el proyecto')
  const count = await db.$count(s.projectComponents, eq(s.projectComponents.projectId, projectId))
  const colors = ['#0866ff', '#12c6b4', '#a77bff', '#ff7a1a', '#41d18b']
  await db.insert(s.projectComponents).values({ projectId, name: req(fd, 'name', 'el nombre'), progress: 0, color: colors[count % colors.length]!, position: count })
})

export const deleteComponent = action(async (_member, id: string) => {
  const db = await getDb()
  await db.delete(s.projectComponents).where(eq(s.projectComponents.id, id))
})

// ---------- tareas ----------

export const saveTask = action(async (member, fd: FormData) => {
  const db = await getDb()
  const id = str(fd, 'id')
  const values = {
    title: req(fd, 'title', 'la tarea'), priority: str(fd, 'priority') ?? 'Media', dueDate: str(fd, 'dueDate'),
    clientId: str(fd, 'clientId'), projectId: str(fd, 'projectId'), assignee: str(fd, 'assignee') ?? member.name,
  }
  if (id) await db.update(s.tasks).set(values).where(eq(s.tasks.id, id))
  else await db.insert(s.tasks).values(values)
})

export const toggleTask = action(async (member, id: string) => {
  const db = await getDb()
  const [t] = await db.select({ done: s.tasks.done }).from(s.tasks).where(eq(s.tasks.id, id))
  if (t) await setTaskDone(id, !t.done, member.name)
})

export const deleteTask = action(async (_member, id: string) => {
  const db = await getDb()
  await db.delete(s.tasks).where(eq(s.tasks.id, id))
})

// ---------- reuniones ----------

export const saveMeeting = action(async (member, fd: FormData) => {
  const db = await getDb()
  const id = str(fd, 'id')
  const link = str(fd, 'link')
  if (link && !/^https?:\/\//i.test(link)) throw new UserError('El enlace debe empezar con https://')
  const values = { title: req(fd, 'title', 'el título'), startsAt: localDateTime(req(fd, 'date', 'la fecha'), str(fd, 'time')), location: str(fd, 'location'), link, clientId: str(fd, 'clientId') }
  if (id) await db.update(s.meetings).set(values).where(eq(s.meetings.id, id))
  else await createMeeting(values, member.name)
})

export const deleteMeeting = action(async (_member, id: string) => {
  const db = await getDb()
  await db.delete(s.meetings).where(eq(s.meetings.id, id))
})

// ---------- facturas y servicios recurrentes ----------

export const createInvoice = action(async (member, fd: FormData) => {
  const db = await getDb()
  const clientId = req(fd, 'clientId', 'el cliente')
  const amountCents = await parseMoney(req(fd, 'amount', 'el monto'))
  if (!amountCents) throw new UserError('El monto debe ser mayor que cero.')
  const status = str(fd, 'status') ?? 'Pendiente'
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int + 1` }).from(s.invoices)
  const number = str(fd, 'number') ?? `A${String(n).padStart(4, '0')}`
  await db.insert(s.invoices).values({ clientId, number, concept: str(fd, 'concept'), amountCents, issuedOn: str(fd, 'issuedOn') ?? todayKey(), status, paidOn: status === 'Pagado' ? todayKey() : null })
  const [inv] = await db.select().from(s.invoices).where(and(eq(s.invoices.clientId, clientId), eq(s.invoices.number, number)))
  await logActivity({ kind: 'payment', title: 'Factura emitida', detail: `Invoice #${number} · ${formatMoney(amountCents)}`, clientId, actor: member.name })
  if (status === 'Pagado' && inv) await paymentReceived(inv, member.name)
})

export const markInvoicePaid = action(async (member, id: string) => {
  await markInvoicePaidCore(id, member.name)
})

export const deleteInvoice = action(async (_member, id: string) => {
  const db = await getDb()
  await db.delete(s.invoices).where(eq(s.invoices.id, id))
})

export const addRetainer = action(async (member, fd: FormData) => {
  const db = await getDb()
  const clientId = req(fd, 'clientId', 'el cliente')
  const monthlyCents = await parseMoney(req(fd, 'monthly', 'el valor mensual'))
  const service = req(fd, 'service', 'el servicio')
  await db.insert(s.retainers).values({ clientId, service, monthlyCents, startedAt: str(fd, 'startedAt') ?? todayKey() })
  await logActivity({ kind: 'payment', title: 'Servicio recurrente agregado', detail: `${service} · ${formatMoney(monthlyCents)}/mes`, clientId, actor: member.name })
})

export const endRetainer = action(async (_member, id: string) => {
  const db = await getDb()
  await db.update(s.retainers).set({ endedAt: todayKey() }).where(eq(s.retainers.id, id))
})

// ---------- automatizaciones y notificaciones ----------

export const toggleAutomation = action(async (_member, id: string) => {
  const db = await getDb()
  await db.update(s.automations).set({ active: sql`not ${s.automations.active}` }).where(eq(s.automations.id, id))
})

export const markNotificationsRead = action(async (member, ids: string[]) => {
  const db = await getDb()
  if (!ids.length) return
  await db.update(s.notifications).set({ readBy: sql`(select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from jsonb_array_elements(${s.notifications.readBy} || ${JSON.stringify([member.id])}::jsonb) as x)` })
    .where(inArray(s.notifications.id, ids))
})

// ---------- perfil y configuración ----------

export const updateProfile = action(async (member, fd: FormData) => {
  const db = await getDb()
  await db.update(s.members).set({ name: req(fd, 'name', 'tu nombre'), role: str(fd, 'role') ?? member.role }).where(eq(s.members.id, member.id))
  return { ok: true, message: 'Perfil guardado.' }
})

export const updateAvatar = action(async (member, dataUrl: string | null) => {
  const db = await getDb()
  if (dataUrl && (!/^data:image\/(webp|jpeg|png);base64,/.test(dataUrl) || dataUrl.length > 400_000)) throw new UserError('La imagen no es válida o es muy pesada.')
  await db.update(s.members).set({ avatar: dataUrl }).where(eq(s.members.id, member.id))
})

export const updatePreferences = action(async (member, fd: FormData) => {
  const db = await getDb()
  await db.update(s.members).set({ preferences: { notifyTasks: bool(fd, 'notifyTasks'), notifyLeads: bool(fd, 'notifyLeads'), notifyPayments: bool(fd, 'notifyPayments') } }).where(eq(s.members.id, member.id))
  return { ok: true, message: 'Preferencias guardadas.' }
})

export const regenerateIntakeKey = action(async member => {
  if (member.role !== 'Administrador') throw new UserError('Solo un administrador puede cambiar la llave.')
  const db = await getDb()
  const key = crypto.randomUUID().replace(/-/g, '')
  await db.insert(s.settings).values({ key: 'intake_key', value: key }).onConflictDoUpdate({ target: s.settings.key, set: { value: key } })
})
