import 'server-only'
import { and, asc, desc, eq, getTableColumns, gte, inArray, isNull, lte, ne, notInArray, or, sql } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { dayKey, percentChange, todayKey } from './format'

const s = schema
export const STAGES = ['Lead', 'Contactado', 'Reunión', 'Propuesta', 'Ganado'] as const
export const OPEN_STAGES = ['Lead', 'Contactado', 'Reunión', 'Propuesta']
export const STAGE_COLORS: Record<string, string> = { Lead: '#5f9dff', Contactado: '#12c6b4', Reunión: '#a77bff', Propuesta: '#ff7a1a', Ganado: '#41d18b', Perdido: '#8da0b8' }

export type Client = typeof s.clients.$inferSelect
export type Opportunity = typeof s.opportunities.$inferSelect
export type Task = typeof s.tasks.$inferSelect & { clientName?: string | null; projectName?: string | null }
export type Meeting = typeof s.meetings.$inferSelect & { clientName?: string | null }
export type Project = typeof s.projects.$inferSelect & { clientName: string | null; progress: number; components: (typeof s.projectComponents.$inferSelect)[] }
export type Invoice = typeof s.invoices.$inferSelect & { clientName?: string | null }

const daysAgoKey = (n: number) => dayKey(new Date(Date.now() - n * 86_400_000))
const monthStartKey = (offset = 0) => {
  const [y, m] = todayKey().split('-').map(Number) as [number, number]
  const d = new Date(Date.UTC(y, m - 1 + offset, 1))
  return d.toISOString().slice(0, 10)
}

// ---------- Inicio ----------

export async function getKpis() {
  const db = await getDb()
  const monthAgo = new Date(Date.now() - 30 * 86_400_000)
  const monthAgoKey = daysAgoKey(30)
  const [pipeline] = await db.select({
    now: sql<number>`coalesce(sum(${s.opportunities.valueCents}), 0)::int`,
    before: sql<number>`coalesce(sum(${s.opportunities.valueCents}) filter (where ${s.opportunities.createdAt} <= ${monthAgo.toISOString()}), 0)::int`,
  }).from(s.opportunities).where(inArray(s.opportunities.stage, OPEN_STAGES))
  const [mrr] = await db.select({
    now: sql<number>`coalesce(sum(${s.retainers.monthlyCents}) filter (where ${s.retainers.startedAt} <= ${todayKey()} and (${s.retainers.endedAt} is null or ${s.retainers.endedAt} > ${todayKey()})), 0)::int`,
    before: sql<number>`coalesce(sum(${s.retainers.monthlyCents}) filter (where ${s.retainers.startedAt} <= ${monthAgoKey} and (${s.retainers.endedAt} is null or ${s.retainers.endedAt} > ${monthAgoKey})), 0)::int`,
  }).from(s.retainers)
  const [clients] = await db.select({
    now: sql<number>`count(*)::int`,
    before: sql<number>`(count(*) filter (where ${s.clients.clientSince} <= ${monthAgoKey}))::int`,
  }).from(s.clients).where(and(eq(s.clients.status, 'Activo'), eq(s.clients.archived, false)))
  const [tasks] = await db.select({
    now: sql<number>`(count(*) filter (where not ${s.tasks.done}))::int`,
    before: sql<number>`(count(*) filter (where ${s.tasks.createdAt} <= ${monthAgo.toISOString()} and (not ${s.tasks.done} or ${s.tasks.completedAt} > ${monthAgo.toISOString()})))::int`,
  }).from(s.tasks)
  const kpi = (k: { now: number; before: number }) => ({ value: k.now, change: percentChange(k.now, k.before) })
  return { pipeline: kpi(pipeline!), mrr: kpi(mrr!), clients: kpi(clients!), tasks: kpi(tasks!) }
}

export async function getPipeline() {
  const db = await getDb()
  const wonSince = new Date(Date.now() - 90 * 86_400_000).toISOString()
  const rows = await db.select().from(s.opportunities)
    .where(or(inArray(s.opportunities.stage, OPEN_STAGES), and(eq(s.opportunities.stage, 'Ganado'), gte(s.opportunities.stageChangedAt, new Date(wonSince)))))
    .orderBy(asc(s.opportunities.position), desc(s.opportunities.stageChangedAt))
  return STAGES.map(stage => {
    const items = rows.filter(r => r.stage === stage)
    return { stage, color: STAGE_COLORS[stage]!, items, count: items.length, total: items.reduce((t, r) => t + r.valueCents, 0) }
  })
}

export async function getMonthlyIncome() {
  const db = await getDb()
  const from = monthStartKey(-5)
  const rows = await db.select({
    month: sql<string>`to_char(date_trunc('month', ${s.invoices.paidOn}), 'YYYY-MM-01')`,
    total: sql<number>`sum(${s.invoices.amountCents})::int`,
  }).from(s.invoices).where(and(eq(s.invoices.status, 'Pagado'), gte(s.invoices.paidOn, from))).groupBy(sql`1`)
  const months = Array.from({ length: 6 }, (_, i) => monthStartKey(i - 5))
  const series = months.map(m => ({ month: m, total: rows.find(r => r.month === m)?.total ?? 0 }))
  const current = series.at(-1)!.total, previous = series.at(-2)!.total
  return { series, current, change: percentChange(current, previous) }
}

export async function getUpcomingTasks(limit = 5) {
  const db = await getDb()
  return db.select().from(s.tasks).where(eq(s.tasks.done, false))
    .orderBy(sql`${s.tasks.dueDate} asc nulls last`, asc(s.tasks.createdAt)).limit(limit)
}

export async function getRecentActivity(limit = 5, clientId?: string) {
  const db = await getDb()
  return db.select().from(s.activity).where(clientId ? eq(s.activity.clientId, clientId) : undefined)
    .orderBy(desc(s.activity.createdAt)).limit(limit)
}

export async function getClientsByIndustry() {
  const db = await getDb()
  const rows = await db.select({ industry: sql<string>`coalesce(${s.clients.industry}, 'Otros')`, count: sql<number>`count(*)::int` })
    .from(s.clients).where(and(eq(s.clients.status, 'Activo'), eq(s.clients.archived, false))).groupBy(sql`1`).orderBy(sql`2 desc`, sql`1`)
  const total = rows.reduce((t, r) => t + r.count, 0)
  const top = rows.slice(0, 3), rest = rows.slice(3).reduce((t, r) => t + r.count, 0)
  const groups = rest ? [...top, { industry: 'Otros', count: rest }] : top
  const colors = ['#0866ff', '#12c6b4', '#a77bff', '#ff7a1a']
  return { total, groups: groups.map((g, i) => ({ ...g, color: colors[i]!, percent: total ? Math.round((g.count / total) * 100) : 0 })) }
}

export async function getMeetingsBetween(fromIso: string, toIso: string) {
  const db = await getDb()
  return db.select({ ...getTableColumns(s.meetings), clientName: s.clients.name }).from(s.meetings)
    .leftJoin(s.clients, eq(s.meetings.clientId, s.clients.id))
    .where(and(gte(s.meetings.startsAt, new Date(fromIso)), lte(s.meetings.startsAt, new Date(toIso)))).orderBy(asc(s.meetings.startsAt))
}

export async function getUpcomingMeetings(limit = 3, clientId?: string) {
  const db = await getDb()
  const since = new Date(Date.now() - 60 * 60_000)
  return db.select({ ...getTableColumns(s.meetings), clientName: s.clients.name }).from(s.meetings)
    .leftJoin(s.clients, eq(s.meetings.clientId, s.clients.id))
    .where(and(gte(s.meetings.startsAt, since), clientId ? eq(s.meetings.clientId, clientId) : undefined))
    .orderBy(asc(s.meetings.startsAt)).limit(limit)
}

export async function getAgenda() {
  const db = await getDb()
  const since = new Date(Date.now() - 7 * 86_400_000)
  return db.select({ ...getTableColumns(s.meetings), clientName: s.clients.name }).from(s.meetings)
    .leftJoin(s.clients, eq(s.meetings.clientId, s.clients.id)).where(gte(s.meetings.startsAt, since)).orderBy(asc(s.meetings.startsAt))
}

// ---------- Clientes ----------

export async function getClients(opts: { includeArchived?: boolean } = {}) {
  const db = await getDb()
  const mrr = db.select({ clientId: s.retainers.clientId, total: sql<number>`sum(${s.retainers.monthlyCents})::int`.as('mrr_total') })
    .from(s.retainers).where(or(isNull(s.retainers.endedAt), gte(s.retainers.endedAt, todayKey()))).groupBy(s.retainers.clientId).as('mrr')
  return db.select({ ...getTableColumns(s.clients), mrrCents: sql<number>`coalesce(${mrr.total}, 0)::int` }).from(s.clients)
    .leftJoin(mrr, eq(mrr.clientId, s.clients.id))
    .where(opts.includeArchived ? undefined : eq(s.clients.archived, false)).orderBy(asc(s.clients.name))
}

export async function getClientOptions() {
  const db = await getDb()
  return db.select({ id: s.clients.id, name: s.clients.name }).from(s.clients).where(eq(s.clients.archived, false)).orderBy(asc(s.clients.name))
}

export async function getClientDetail(id: string) {
  const db = await getDb()
  const [client] = await db.select().from(s.clients).where(eq(s.clients.id, id))
  if (!client) return null
  const [contacts, channels, projects, invoices, notes, files, tasks, meetings, metrics, retainers, activity, value] = await Promise.all([
    db.select().from(s.contacts).where(eq(s.contacts.clientId, id)).orderBy(asc(s.contacts.createdAt)),
    db.select().from(s.channels).where(eq(s.channels.clientId, id)).orderBy(asc(s.channels.position)),
    getProjects({ clientId: id }),
    db.select().from(s.invoices).where(eq(s.invoices.clientId, id)).orderBy(desc(s.invoices.issuedOn)),
    db.select().from(s.notes).where(eq(s.notes.clientId, id)).orderBy(desc(s.notes.pinned), desc(s.notes.createdAt)),
    db.select().from(s.files).where(eq(s.files.clientId, id)).orderBy(desc(s.files.createdAt)),
    db.select().from(s.tasks).where(eq(s.tasks.clientId, id)).orderBy(asc(s.tasks.done), sql`${s.tasks.dueDate} asc nulls last`),
    getUpcomingMeetings(5, id),
    db.select().from(s.clientMetrics).where(eq(s.clientMetrics.clientId, id)).orderBy(desc(s.clientMetrics.month)),
    db.select().from(s.retainers).where(eq(s.retainers.clientId, id)).orderBy(asc(s.retainers.startedAt)),
    getRecentActivity(12, id),
    db.select({ total: sql<number>`coalesce(sum(${s.invoices.amountCents}), 0)::int` }).from(s.invoices).where(eq(s.invoices.clientId, id)),
  ])
  // Resultados: los 3 meses completos más recientes contra los 3 anteriores
  const lastMonth = monthStartKey(-1)
  const recent = metrics.filter(m => m.month <= lastMonth).slice(0, 6)
  const sum = (rows: typeof recent, k: 'visits' | 'leads' | 'conversions') => rows.reduce((t, r) => t + r[k], 0)
  const cur = recent.slice(0, 3), prev = recent.slice(3, 6)
  const results = recent.length ? {
    visits: percentChange(sum(cur, 'visits'), sum(prev, 'visits')),
    leads: percentChange(sum(cur, 'leads'), sum(prev, 'leads')),
    conversions: percentChange(sum(cur, 'conversions'), sum(prev, 'conversions')),
    hasComparison: prev.length > 0,
  } : null
  return { client, contacts, channels, projects, invoices, notes, files, tasks, meetings, metrics, retainers, activity, results, valueCents: value[0]?.total ?? 0 }
}

// ---------- Proyectos ----------

export async function getProjects(opts: { clientId?: string } = {}): Promise<Project[]> {
  const db = await getDb()
  const projects = await db.select({ ...getTableColumns(s.projects), clientName: s.clients.name }).from(s.projects)
    .leftJoin(s.clients, eq(s.projects.clientId, s.clients.id))
    .where(opts.clientId ? eq(s.projects.clientId, opts.clientId) : undefined)
    .orderBy(sql`case ${s.projects.status} when 'En curso' then 0 when 'En pausa' then 1 else 2 end`, asc(s.projects.dueDate))
  if (!projects.length) return []
  const components = await db.select().from(s.projectComponents).where(inArray(s.projectComponents.projectId, projects.map(p => p.id))).orderBy(asc(s.projectComponents.position))
  return projects.map(p => {
    const comps = components.filter(c => c.projectId === p.id)
    const progress = comps.length ? Math.round(comps.reduce((t, c) => t + c.progress, 0) / comps.length) : 0
    return { ...p, components: comps, progress }
  })
}

// ---------- Tareas ----------

export async function getTasks(filter: 'pendientes' | 'hoy' | 'vencidas' | 'hechas' | 'todas' = 'pendientes') {
  const db = await getDb()
  const today = todayKey()
  const where = {
    pendientes: eq(s.tasks.done, false),
    hoy: and(eq(s.tasks.done, false), eq(s.tasks.dueDate, today)),
    vencidas: and(eq(s.tasks.done, false), sql`${s.tasks.dueDate} < ${today}`),
    hechas: eq(s.tasks.done, true),
    todas: undefined,
  }[filter]
  return db.select({ ...getTableColumns(s.tasks), clientName: s.clients.name, projectName: s.projects.name }).from(s.tasks)
    .leftJoin(s.clients, eq(s.tasks.clientId, s.clients.id)).leftJoin(s.projects, eq(s.tasks.projectId, s.projects.id))
    .where(where).orderBy(asc(s.tasks.done), filter === 'hechas' ? desc(s.tasks.completedAt) : sql`${s.tasks.dueDate} asc nulls last`, asc(s.tasks.createdAt))
}

export async function getTaskCounts() {
  const db = await getDb()
  const today = todayKey()
  const [c] = await db.select({
    pendientes: sql<number>`(count(*) filter (where not ${s.tasks.done}))::int`,
    hoy: sql<number>`(count(*) filter (where not ${s.tasks.done} and ${s.tasks.dueDate} = ${today}))::int`,
    vencidas: sql<number>`(count(*) filter (where not ${s.tasks.done} and ${s.tasks.dueDate} < ${today}))::int`,
    hechas: sql<number>`(count(*) filter (where ${s.tasks.done}))::int`,
    todas: sql<number>`count(*)::int`,
  }).from(s.tasks)
  return c!
}

export async function getProjectOptions() {
  const db = await getDb()
  return db.select({ id: s.projects.id, name: s.projects.name, clientId: s.projects.clientId }).from(s.projects).where(ne(s.projects.status, 'Terminado')).orderBy(asc(s.projects.name))
}

export async function getBoard() {
  const db = await getDb()
  const since = new Date(Date.now() - 90 * 86_400_000)
  const rows = await db.select().from(s.opportunities)
    .where(or(inArray(s.opportunities.stage, OPEN_STAGES), gte(s.opportunities.stageChangedAt, since)))
    .orderBy(asc(s.opportunities.position), desc(s.opportunities.stageChangedAt))
  return rows
}

// ---------- Leads ----------

export async function getLeads() {
  const db = await getDb()
  return db.select().from(s.opportunities).where(notInArray(s.opportunities.stage, ['Ganado'])).orderBy(desc(s.opportunities.createdAt))
}

// ---------- Finanzas / reportes ----------

export async function getInvoices() {
  const db = await getDb()
  return db.select({ ...getTableColumns(s.invoices), clientName: s.clients.name }).from(s.invoices)
    .leftJoin(s.clients, eq(s.invoices.clientId, s.clients.id)).orderBy(desc(s.invoices.issuedOn))
}

export async function getReports() {
  const db = await getDb()
  const since90 = new Date(Date.now() - 90 * 86_400_000)
  const [income, byStage, funnel, byService, bySource, tasksDone, industry] = await Promise.all([
    getMonthlyIncome(),
    db.select({ stage: s.opportunities.stage, count: sql<number>`count(*)::int`, total: sql<number>`sum(${s.opportunities.valueCents})::int` })
      .from(s.opportunities).groupBy(s.opportunities.stage),
    db.select({
      created: sql<number>`count(*)::int`,
      won: sql<number>`(count(*) filter (where ${s.opportunities.stage} = 'Ganado'))::int`,
      lost: sql<number>`(count(*) filter (where ${s.opportunities.stage} = 'Perdido'))::int`,
      wonValue: sql<number>`coalesce(sum(${s.opportunities.valueCents}) filter (where ${s.opportunities.stage} = 'Ganado'), 0)::int`,
    }).from(s.opportunities).where(gte(s.opportunities.createdAt, since90)),
    db.select({ service: s.opportunities.service, count: sql<number>`count(*)::int`, total: sql<number>`sum(${s.opportunities.valueCents})::int` })
      .from(s.opportunities).groupBy(s.opportunities.service).orderBy(sql`3 desc`),
    db.select({ source: sql<string>`coalesce(${s.opportunities.source}, 'Sin origen')`, count: sql<number>`count(*)::int` })
      .from(s.opportunities).groupBy(sql`1`).orderBy(sql`2 desc`),
    db.select({ week: sql<string>`to_char(date_trunc('week', ${s.tasks.completedAt}), 'YYYY-MM-DD')`, count: sql<number>`count(*)::int` })
      .from(s.tasks).where(and(eq(s.tasks.done, true), gte(s.tasks.completedAt, new Date(Date.now() - 56 * 86_400_000)))).groupBy(sql`1`).orderBy(sql`1`),
    getClientsByIndustry(),
  ])
  const [receivable] = await db.select({
    pending: sql<number>`coalesce(sum(${s.invoices.amountCents}) filter (where ${s.invoices.status} <> 'Pagado'), 0)::int`,
    paid90: sql<number>`coalesce(sum(${s.invoices.amountCents}) filter (where ${s.invoices.status} = 'Pagado' and ${s.invoices.paidOn} >= ${daysAgoKey(90)}), 0)::int`,
  }).from(s.invoices)
  return { income, byStage, funnel: funnel[0]!, byService, bySource, tasksDone, industry, receivable: receivable! }
}

// ---------- Automatizaciones / notificaciones / búsqueda ----------

export async function getAutomations() {
  const db = await getDb()
  return db.select().from(s.automations).orderBy(asc(s.automations.name))
}

export async function getAutomationRuns(limit = 40) {
  const db = await getDb()
  return db.select({ ...getTableColumns(s.automationRuns), name: s.automations.name }).from(s.automationRuns)
    .leftJoin(s.automations, eq(s.automations.key, s.automationRuns.automationKey)).orderBy(desc(s.automationRuns.createdAt)).limit(limit)
}

export async function getNotifications(memberId: string, limit = 12) {
  const db = await getDb()
  const rows = await db.select().from(s.notifications).orderBy(desc(s.notifications.createdAt)).limit(limit)
  return rows.map(n => ({ ...n, read: n.readBy.includes(memberId) }))
}

export async function getMembers() {
  const db = await getDb()
  return db.select({ id: s.members.id, name: s.members.name, email: s.members.email, role: s.members.role, avatar: s.members.avatar, createdAt: s.members.createdAt })
    .from(s.members).orderBy(asc(s.members.createdAt))
}

export async function getSetting<T>(key: string): Promise<T | null> {
  const db = await getDb()
  const [row] = await db.select().from(s.settings).where(eq(s.settings.key, key))
  return (row?.value as T) ?? null
}

export async function searchCrm(q: string) {
  const db = await getDb()
  const like = `%${q.replace(/[%_]/g, m => `\\${m}`)}%`
  const [clients, opportunities, projects, tasks] = await Promise.all([
    db.select({ id: s.clients.id, name: s.clients.name, detail: s.clients.industry }).from(s.clients)
      .where(and(eq(s.clients.archived, false), or(sql`${s.clients.name} ilike ${like}`, sql`${s.clients.contactName} ilike ${like}`, sql`${s.clients.email} ilike ${like}`))).limit(5),
    db.select({ id: s.opportunities.id, name: s.opportunities.company, detail: s.opportunities.stage }).from(s.opportunities)
      .where(or(sql`${s.opportunities.company} ilike ${like}`, sql`${s.opportunities.contactName} ilike ${like}`)).limit(5),
    db.select({ id: s.projects.id, name: s.projects.name, detail: s.projects.status }).from(s.projects).where(sql`${s.projects.name} ilike ${like}`).limit(5),
    db.select({ id: s.tasks.id, name: s.tasks.title, detail: s.tasks.priority }).from(s.tasks).where(sql`${s.tasks.title} ilike ${like}`).limit(5),
  ])
  return { clients, opportunities, projects, tasks }
}

