'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { requireMember, type Member } from '@/lib/auth/member'
import { dayKey, formatMoney, todayKey } from './format'
import { runAutomation, logActivity, notify } from './automations'

export type ActionState = { ok?: boolean; error?: string; message?: string } | null

// ---------- utilidades ----------

const str = (fd: FormData, k: string) => {
  const v = fd.get(k)
  return typeof v === 'string' && v.trim() ? v.trim() : null
}
const req = (fd: FormData, k: string, label: string) => {
  const v = str(fd, k)
  if (!v) throw new UserError(`Falta ${label}.`)
  return v
}
// "14,500", "14500.50" o "$ 1.250" → centavos
async function parseMoney(raw: string | null): Promise<number> {
  if (!raw) return 0
  const clean = raw.replace(/[^\d.,]/g, '')
  const normalized = /,\d{1,2}$/.test(clean) ? clean.replace(/\./g, '').replace(',', '.') : clean.replace(/,/g, '')
  const n = Number(normalized)
  if (!Number.isFinite(n) || n < 0) throw new UserError('El monto no es válido.')
  return Math.round(n * 100)
}
const bool = (fd: FormData, k: string) => fd.get(k) === 'on' || fd.get(k) === 'true'
const int = (fd: FormData, k: string, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(Number(fd.get(k)) || 0)))
// "2025-01-14" + "15:00" en hora de Ecuador → Date
const localDateTime = (date: string, time: string | null) => new Date(`${date}T${time ?? '09:00'}:00-05:00`)

class UserError extends Error {}

function refresh() { revalidatePath('/', 'layout') }

// Envuelve cada acción: exige sesión, traduce errores a un mensaje y refresca la vista.
function action<A extends unknown[]>(fn: (member: Member, ...args: A) => Promise<ActionState | void>) {
  return async (...args: A): Promise<ActionState> => {
    const member = await requireMember()
    try {
      const result = await fn(member, ...args)
      refresh()
      return result ?? { ok: true }
    } catch (error) {
      if (error instanceof UserError) return { error: error.message }
      if (typeof error === 'object' && error && 'digest' in error && String((error as { digest: unknown }).digest).startsWith('NEXT_REDIRECT')) throw error
      console.error('crm/action:', error)
      return { error: 'No se pudo guardar. Intenta de nuevo.' }
    }
  }
}

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
  const db = await getDb()
  const clientId = req(fd, 'clientId', 'el cliente')
  const body = req(fd, 'body', 'el texto de la nota')
  await db.insert(s.notes).values({ clientId, body, pinned: bool(fd, 'pinned'), author: member.name })
  await logActivity({ kind: 'note', title: 'Nota agregada', detail: body.length > 70 ? `${body.slice(0, 70)}…` : body, clientId, actor: member.name })
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
  const db = await getDb()
  const fields = opportunityFields(fd)
  const valueCents = await parseMoney(str(fd, 'value'))
  const [opp] = await db.insert(s.opportunities).values({ ...fields, valueCents, position: -1 }).returning()
  await logActivity({ kind: 'lead', title: 'Nuevo lead agregado', detail: `${fields.company} entró al pipeline`, clientId: fields.clientId, actor: member.name })
  await runAutomation('new_lead_notify', () => notify({ title: `Lead nuevo: ${fields.company}`, body: `${fields.service} · ${formatMoney(valueCents)}`, href: '/leads' }))
  if (opp!.stage === 'Ganado') await onWon(opp!.id, member)
})

export const updateOpportunity = action(async (member, fd: FormData) => {
  const db = await getDb()
  const id = req(fd, 'id', 'la oportunidad')
  const [before] = await db.select().from(s.opportunities).where(eq(s.opportunities.id, id))
  const fields = opportunityFields(fd)
  const valueCents = await parseMoney(str(fd, 'value'))
  const stageChanged = before && before.stage !== fields.stage
  await db.update(s.opportunities).set({ ...fields, valueCents, ...(stageChanged ? { stageChangedAt: new Date() } : {}) }).where(eq(s.opportunities.id, id))
  if (stageChanged) await afterStageChange(id, before.company, fields.stage, valueCents, member)
})

export const moveOpportunity = action(async (member, id: string, stage: string, beforeId: string | null) => {
  const db = await getDb()
  const [opp] = await db.select().from(s.opportunities).where(eq(s.opportunities.id, id))
  if (!opp) return
  // Reordena la columna destino dejando la tarjeta antes de `beforeId` (o al final)
  const column = await db.select({ id: s.opportunities.id }).from(s.opportunities)
    .where(and(eq(s.opportunities.stage, stage), sql`${s.opportunities.id} <> ${id}`)).orderBy(s.opportunities.position, sql`${s.opportunities.stageChangedAt} desc`)
  const ids = column.map(c => c.id)
  const at = beforeId ? ids.indexOf(beforeId) : -1
  ids.splice(at < 0 ? ids.length : at, 0, id)
  await Promise.all(ids.map((cid, position) => db.update(s.opportunities).set({ position }).where(eq(s.opportunities.id, cid))))
  if (opp.stage !== stage) {
    await db.update(s.opportunities).set({ stage, stageChangedAt: new Date() }).where(eq(s.opportunities.id, id))
    await afterStageChange(id, opp.company, stage, opp.valueCents, member)
  }
})

async function afterStageChange(id: string, company: string, stage: string, valueCents: number, member: Member) {
  const titles: Record<string, [string, string]> = {
    Contactado: ['lead', 'Lead contactado'], Reunión: ['meeting', 'Reunión en agenda'], Propuesta: ['proposal', 'Propuesta enviada'],
    Ganado: ['project', 'Oportunidad ganada'], Perdido: ['lead', 'Oportunidad perdida'], Lead: ['lead', 'Volvió a Lead'],
  }
  const [kind, title] = titles[stage] ?? ['lead', `Pasó a ${stage}`]
  await logActivity({ kind, title, detail: `${company} · ${formatMoney(valueCents)}`, actor: member.name })
  if (stage === 'Ganado') await onWon(id, member)
}

// Automatización: oportunidad ganada → cliente + tarea de bienvenida
async function onWon(id: string, member: Member) {
  await runAutomation('won_to_client', async () => {
    const db = await getDb()
    const [opp] = await db.select().from(s.opportunities).where(eq(s.opportunities.id, id))
    if (!opp) return
    let clientId = opp.clientId
    if (!clientId) {
      const [existing] = await db.select({ id: s.clients.id }).from(s.clients).where(sql`lower(${s.clients.name}) = lower(${opp.company})`)
      clientId = existing?.id ?? null
    }
    if (!clientId) {
      const [c] = await db.insert(s.clients).values({ name: opp.company, status: 'Activo', contactName: opp.contactName, email: opp.email, phone: opp.phone, owner: member.name, clientSince: todayKey() }).returning({ id: s.clients.id })
      clientId = c!.id
      await db.insert(s.channels).values(['Website', 'WhatsApp', 'CRM', 'SEO'].map((name, position) => ({ clientId: clientId!, name, active: false, position })))
      if (opp.contactName) await db.insert(s.contacts).values({ clientId, name: opp.contactName, email: opp.email, phone: opp.phone })
      await logActivity({ kind: 'client', title: 'Cliente nuevo', detail: `${opp.company} (desde el pipeline)`, clientId, actor: member.name })
    } else {
      await db.update(s.clients).set({ status: 'Activo', archived: false }).where(eq(s.clients.id, clientId))
    }
    await db.update(s.opportunities).set({ clientId }).where(eq(s.opportunities.id, id))
    await db.insert(s.tasks).values({ title: `Bienvenida y kickoff con ${opp.company}`, priority: 'Alta', dueDate: dayKey(new Date(Date.now() + 2 * 86_400_000)), clientId, assignee: member.name })
    await notify({ title: `¡Ganamos ${opp.company}!`, body: `${opp.service} · ${formatMoney(opp.valueCents)}`, href: `/clientes/${clientId}` })
  })
}

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
  const [t] = await db.select().from(s.tasks).where(eq(s.tasks.id, id))
  if (!t) return
  const done = !t.done
  await db.update(s.tasks).set({ done, completedAt: done ? new Date() : null }).where(eq(s.tasks.id, id))
  if (done) await logActivity({ kind: 'task', title: 'Tarea completada', detail: t.title, clientId: t.clientId, actor: member.name })
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
  const startsAt = localDateTime(req(fd, 'date', 'la fecha'), str(fd, 'time'))
  const values = { title: req(fd, 'title', 'el título'), startsAt, location: str(fd, 'location'), link, clientId: str(fd, 'clientId') }
  if (id) {
    await db.update(s.meetings).set(values).where(eq(s.meetings.id, id))
    return
  }
  await db.insert(s.meetings).values(values)
  const clientName = values.clientId ? (await db.select({ name: s.clients.name }).from(s.clients).where(eq(s.clients.id, values.clientId)))[0]?.name : null
  await logActivity({ kind: 'meeting', title: 'Reunión programada', detail: clientName ? `${values.title} con ${clientName}` : values.title, clientId: values.clientId, actor: member.name })
  if (values.clientId) await runAutomation('meeting_prep_task', async () => {
    const dayBefore = dayKey(new Date(startsAt.getTime() - 86_400_000))
    await db.insert(s.tasks).values({ title: `Preparar: ${values.title}`, priority: 'Media', dueDate: dayBefore < todayKey() ? todayKey() : dayBefore, clientId: values.clientId, assignee: member.name })
  })
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
  await logActivity({ kind: 'payment', title: 'Factura emitida', detail: `Invoice #${number} · ${formatMoney(amountCents)}`, clientId, actor: member.name })
  if (status === 'Pagado') await paymentAutomation(clientId, number, amountCents, member)
})

export const markInvoicePaid = action(async (member, id: string) => {
  const db = await getDb()
  const [inv] = await db.update(s.invoices).set({ status: 'Pagado', paidOn: todayKey() }).where(eq(s.invoices.id, id)).returning()
  if (inv) await paymentAutomation(inv.clientId, inv.number, inv.amountCents, member)
})

async function paymentAutomation(clientId: string, number: string, amountCents: number, member: Member) {
  await runAutomation('payment_activity', async () => {
    await logActivity({ kind: 'payment', title: 'Pago registrado', detail: `Invoice #${number} marcada como pagada · ${formatMoney(amountCents)}`, clientId, actor: member.name })
  })
}

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
