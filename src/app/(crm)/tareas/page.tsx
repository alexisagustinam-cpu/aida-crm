import Link from 'next/link'
import * as A from '@/lib/crm/actions'
import { getAgenda, getClientOptions, getProjectOptions, getTaskCounts, getTasks } from '@/lib/crm/queries'
import { dayKey, formatDue, formatLongDate, formatTime, nowMs, todayKey } from '@/lib/crm/format'
import { PRIORITY_COLORS } from '@/lib/crm/constants'
import { MeetingDialog, TaskDialog } from '@/components/crm/forms'
import { TaskCheck } from '@/components/crm/interactive'
import { MeetingEditButton, TaskEditButton } from '@/components/crm/row-dialogs'
import { ActionButton, InlineForm, SubmitButton } from '@/components/crm/ui'

const FILTERS = [['pendientes', 'Pendientes'], ['hoy', 'Hoy'], ['vencidas', 'Vencidas'], ['hechas', 'Hechas'], ['todas', 'Todas']] as const
type Filter = (typeof FILTERS)[number][0]
const PILL: Record<string, string> = { Alta: 'orange', Media: 'purple', Baja: 'green' }

function groupOf(due: string | null, done: boolean) {
  if (done) return 'Hechas'
  if (!due) return 'Sin fecha'
  const today = todayKey()
  if (due < today) return 'Vencidas'
  if (due === today) return 'Hoy'
  const week = dayKey(new Date(nowMs() + 7 * 86_400_000))
  return due <= week ? 'Próximos 7 días' : 'Más adelante'
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ filtro?: string; vista?: string }> }) {
  const { filtro, vista } = await searchParams
  const filter: Filter = (FILTERS.find(f => f[0] === filtro)?.[0]) ?? 'pendientes'
  const agenda = vista === 'agenda'
  const [tasks, counts, clients, projects, meetings] = await Promise.all([getTasks(filter), getTaskCounts(), getClientOptions(), getProjectOptions(), getAgenda()])
  const groups = ['Vencidas', 'Hoy', 'Próximos 7 días', 'Más adelante', 'Sin fecha', 'Hechas']
    .map(name => ({ name, items: tasks.filter(t => groupOf(t.dueDate, t.done) === name) })).filter(g => g.items.length)
  const cutoff = nowMs() - 3_600_000
  const upcoming = meetings.filter(m => m.startsAt.getTime() >= cutoff)
  const past = meetings.filter(m => m.startsAt.getTime() < cutoff).reverse()
  const byDay = upcoming.reduce<Record<string, typeof upcoming>>((acc, m) => { const k = dayKey(m.startsAt); (acc[k] ??= []).push(m); return acc }, {})

  return (
    <div className="view">
      <section className="page-head">
        <div><h1>{agenda ? 'Agenda' : 'Tareas'}</h1><p>{agenda ? `${upcoming.length} reuniones próximas.` : `${counts.pendientes} pendientes · ${counts.hoy} para hoy${counts.vencidas ? ` · ${counts.vencidas} vencidas` : ''}.`}</p></div>
        <div className="page-actions">
          <div className="segmented" role="tablist">
            <Link role="tab" aria-selected={!agenda} className={!agenda ? 'active' : ''} href="/tareas">Tareas</Link>
            <Link role="tab" aria-selected={agenda} className={agenda ? 'active' : ''} href="/tareas?vista=agenda">Agenda</Link>
          </div>
          {agenda ? <MeetingDialog clients={clients} trigger="+ Agendar reunión" /> : <TaskDialog clients={clients} projects={projects} trigger="+ Nueva tarea" />}
        </div>
      </section>

      {!agenda && <>
        <nav className="chip-row" aria-label="Filtrar tareas">
          {FILTERS.map(([key, label]) => <Link key={key} href={key === 'pendientes' ? '/tareas' : `/tareas?filtro=${key}`} className={`chip${filter === key ? ' active' : ''}`}>{label}<span>{counts[key]}</span></Link>)}
        </nav>
        <article className="panel section-pad">
          <InlineForm action={A.saveTask} className="inline-add quick-task">
            <input name="title" required placeholder="Escribe una tarea y presiona Enter…" aria-label="Nueva tarea" />
            <input type="date" name="dueDate" defaultValue={todayKey()} aria-label="Vence" />
            <select name="priority" defaultValue="Media" aria-label="Prioridad"><option>Alta</option><option>Media</option><option>Baja</option></select>
            <SubmitButton className="primary-button">Agregar</SubmitButton>
          </InlineForm>
        </article>
        {groups.length === 0 && <div className="panel empty-state" style={{ marginTop: 18 }}><b>Nada por aquí.</b>{filter === 'pendientes' ? 'No tienes tareas pendientes.' : 'No hay tareas en este filtro.'}</div>}
        {groups.map(g => (
          <section key={g.name} className="task-group">
            <h2>{g.name}<span>{g.items.length}</span></h2>
            <div className="panel">
              {g.items.map(t => (
                <div key={t.id} className={`task-row${t.done ? ' done' : ''}`}>
                  <TaskCheck id={t.id} done={t.done} title={t.title} />
                  <span className="priority" style={{ background: PRIORITY_COLORS[t.priority] }} />
                  <span className="task-main"><b>{t.title}</b><small>{[t.clientName, t.projectName, t.assignee].filter(Boolean).join(' · ') || 'Sin cliente'}</small></span>
                  <span className={`pill ${PILL[t.priority] ?? ''}`}>{t.priority}</span>
                  <time className={g.name === 'Vencidas' ? 'overdue' : undefined}>{formatDue(t.dueDate)}</time>
                  <span className="row-actions">
                    {t.clientId && <Link className="icon-action" href={`/clientes/${t.clientId}`}>Cliente</Link>}
                    <TaskEditButton task={t} clients={clients} projects={projects} />
                    <ActionButton run={A.deleteTask.bind(null, t.id)} confirm={`¿Eliminar “${t.title}”?`} className="icon-action danger" title="Eliminar tarea">×</ActionButton>
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </>}

      {agenda && <>
        {upcoming.length === 0 && <div className="panel empty-state"><b>Sin reuniones próximas.</b>Agenda una con “Agendar reunión”.</div>}
        {Object.entries(byDay).map(([day, items]) => (
          <section key={day} className="task-group">
            <h2>{day === todayKey() ? 'Hoy' : formatLongDate(`${day}`)}<span>{items.length}</span></h2>
            <div className="panel">{items.map(m => <MeetingRow key={m.id} m={m} clients={clients} />)}</div>
          </section>
        ))}
        {past.length > 0 && (
          <section className="task-group">
            <h2>Última semana<span>{past.length}</span></h2>
            <div className="panel past">{past.map(m => <MeetingRow key={m.id} m={m} clients={clients} />)}</div>
          </section>
        )}
      </>}
    </div>
  )
}

function MeetingRow({ m, clients }: { m: Awaited<ReturnType<typeof getAgenda>>[number]; clients: { id: string; name: string }[] }) {
  return (
    <div className="task-row">
      <span className="meeting-time">{formatTime(m.startsAt)}</span>
      <span className="task-main"><b>{m.title}</b><small>{[m.clientName, m.location].filter(Boolean).join(' · ') || 'Sin cliente'}</small></span>
      <span className="row-actions">
        {m.link && <a className="icon-action" href={m.link} target="_blank" rel="noreferrer">Unirse</a>}
        {m.clientId && <Link className="icon-action" href={`/clientes/${m.clientId}`}>Cliente</Link>}
        <MeetingEditButton meeting={m} clients={clients} />
        <ActionButton run={A.deleteMeeting.bind(null, m.id)} confirm={`¿Cancelar “${m.title}”?`} className="icon-action danger" title="Eliminar reunión">×</ActionButton>
      </span>
    </div>
  )
}
