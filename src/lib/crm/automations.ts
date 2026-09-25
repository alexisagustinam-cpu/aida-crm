import 'server-only'
import { and, eq, sql } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { formatDue, todayKey } from './format'

export async function logActivity(entry: { kind: string; title: string; detail?: string | null; clientId?: string | null; actor?: string | null }) {
  const db = await getDb()
  await db.insert(s.activity).values({ kind: entry.kind, title: entry.title, detail: entry.detail ?? null, clientId: entry.clientId ?? null, actor: entry.actor ?? null })
}

export async function notify(n: { title: string; body?: string | null; href?: string | null }) {
  const db = await getDb()
  await db.insert(s.notifications).values({ title: n.title, body: n.body ?? null, href: n.href ?? null })
}

// Ejecuta una automatización solo si está activa y cuenta la ejecución.
export async function runAutomation(key: string, fn: () => Promise<void>) {
  const db = await getDb()
  const [rule] = await db.select().from(s.automations).where(eq(s.automations.key, key))
  if (!rule?.active) return
  await fn()
  await db.update(s.automations).set({ runs: sql`${s.automations.runs} + 1`, lastRunAt: new Date() }).where(eq(s.automations.id, rule.id))
}

// Revisión diaria (se dispara al abrir el CRM): avisa de las tareas que vencen hoy, una vez por día.
export async function runDailyChecks() {
  const db = await getDb()
  const today = todayKey()
  const [last] = await db.select().from(s.settings).where(eq(s.settings.key, 'daily_check'))
  if (last?.value === today) return
  await db.insert(s.settings).values({ key: 'daily_check', value: today }).onConflictDoUpdate({ target: s.settings.key, set: { value: today } })
  await runAutomation('tasks_due_notify', async () => {
    const due = await db.select({ title: s.tasks.title, dueDate: s.tasks.dueDate }).from(s.tasks).where(and(eq(s.tasks.done, false), eq(s.tasks.dueDate, today)))
    if (!due.length) return
    await notify({
      title: due.length === 1 ? 'Tienes 1 tarea que vence hoy' : `Tienes ${due.length} tareas que vencen hoy`,
      body: due.slice(0, 3).map(t => `${t.title} (${formatDue(t.dueDate)})`).join(' · '),
      href: '/tareas?filtro=hoy',
    })
  })
}
