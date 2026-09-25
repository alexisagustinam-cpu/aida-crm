import Link from 'next/link'
import { requireMember } from '@/lib/auth/member'
import * as Q from '@/lib/crm/queries'
import { dayKey, formatAgo, formatDue, formatMoney, formatMoneyPlain, formatShortDate, formatWhen, greeting, longToday, monthLabel, signed, todayKey } from '@/lib/crm/format'
import { MeetingDialog, OpportunityDialog } from '@/components/crm/forms'
import { DashTask } from '@/components/crm/interactive'
import { ACTIVITY_COLORS, PRIORITY_COLORS } from '@/lib/crm/constants'


function Change({ value }: { value: number }) {
  return <span className={value > 0 ? 'up' : value < 0 ? 'up down' : 'up flat'}>{signed(value)} vs. mes anterior</span>
}

export default async function DashboardPage() {
  const member = await requireMember()
  const [kpis, pipeline, income, tasks, activity, industry, meetings, clients] = await Promise.all([
    Q.getKpis(), Q.getPipeline(), Q.getMonthlyIncome(), Q.getUpcomingTasks(5), Q.getRecentActivity(5), Q.getClientsByIndustry(), Q.getUpcomingMeetings(3), Q.getClientOptions(),
  ])
  const firstName = member.name.split(' ')[0]
  const monthMeetings = await monthMeetingDays()

  // Gráfico de ingresos: 6 meses, escalado a la altura del panel
  const max = Math.max(...income.series.map(p => p.total), 1)
  const pts = income.series.map((p, i) => [4 + i * 49.6, 92 - (p.total / max) * 74] as const)
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} V104H4Z`
  const [lastX, lastY] = pts.at(-1)!

  // Donut de industrias
  const stops = industry.groups.map((_, i) => industry.groups.slice(0, i).reduce((t, g) => t + g.percent, 0))
  const donut = industry.groups.map((g, i) => `${g.color} ${stops[i]}% ${i === industry.groups.length - 1 ? 100 : stops[i]! + g.percent}%`).join(',')

  return (
    <div className="view">
      <section className="dashboard-head">
        <div><h1>{greeting()}, <strong>{firstName}</strong></h1><p>Aquí tienes un resumen de tu negocio hoy.</p></div>
        <div className="demo-copy"><b>{longToday()}</b><br />Sigamos construyendo un mundo más real.</div>
      </section>

      <section className="kpis">
        <Link className="kpi" href="/pipeline"><div className="kpi-icon">↗</div><div><small>Pipeline</small><b>{formatMoney(kpis.pipeline.value)}</b><Change value={kpis.pipeline.change} /></div></Link>
        <Link className="kpi" href="/reportes"><div className="kpi-icon">$</div><div><small>MRR</small><b>{formatMoney(kpis.mrr.value)}</b><Change value={kpis.mrr.change} /></div></Link>
        <Link className="kpi" href="/clientes"><div className="kpi-icon">◉</div><div><small>Clientes activos</small><b>{kpis.clients.value}</b><Change value={kpis.clients.change} /></div></Link>
        <Link className="kpi" href="/tareas"><div className="kpi-icon">✓</div><div><small>Tareas pendientes</small><b>{kpis.tasks.value}</b><Change value={kpis.tasks.change} /></div></Link>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <header className="panel-head">
            <div><h2>Pipeline comercial</h2><p>Oportunidades activas por etapa</p></div>
            <div><Link className="link-button" href="/pipeline">Ver pipeline completo →</Link><Link className="ellipsis" href="/reportes" aria-label="Reportes del pipeline" title="Reportes del pipeline">•••</Link></div>
          </header>
          <div className="pipeline-columns">
            {pipeline.map(col => (
              <section key={col.stage} className="stage" style={{ '--stage': col.color } as React.CSSProperties}>
                <div className="stage-head"><i />{col.stage}<span>{col.count}</span></div>
                <div className="stage-total">${formatMoneyPlain(col.total)}</div>
                {col.items.slice(0, 3).map(o => (
                  <Link key={o.id} className="opportunity" href={`/pipeline?abrir=${o.id}`}>
                    <b>{o.company}</b><small>{o.service}</small><strong>${formatMoneyPlain(o.valueCents)}</strong>
                    <em>{o.nextActionAt && o.stage !== 'Ganado' ? formatWhen(o.nextActionAt) : o.stage === 'Ganado' ? formatShortDate(o.stageChangedAt) : formatAgo(o.stageChangedAt)}</em>
                  </Link>
                ))}
                {col.count > 3 && <Link className="add-stage" href="/pipeline">Ver {col.count - 3} más →</Link>}
                <OpportunityDialog stage={col.stage} clients={clients} trigger={`+ Agregar ${col.stage}`} triggerClassName="add-stage" />
              </section>
            ))}
          </div>
        </article>

        <aside className="right-rail">
          <article className="panel income">
            <div className="income-top"><div><p>Ingresos mensuales</p><b>{formatMoney(income.current)}</b></div><span className="growth">{signed(income.change)}</span></div>
            <svg className="chart" viewBox="0 0 260 108" role="img" aria-label={`Ingresos cobrados de ${monthLabel(income.series[0]!.month + 'T12:00:00')} a ${monthLabel(income.series.at(-1)!.month + 'T12:00:00')}`}>
              <path d={area} fill="#0866ff20" />
              <polyline points={line} fill="none" stroke="#12c6b4" strokeWidth="2.5" />
              <circle cx={lastX} cy={lastY} r="4" fill="#12c6b4" />
              {income.series.map((p, i) => <text key={p.month} x={7 + i * 44} y="106">{monthLabel(p.month + 'T12:00:00')}</text>)}
            </svg>
          </article>
          <article className="panel">
            <header className="panel-head"><div><h3>Próximas tareas</h3><p>Pendientes por fecha</p></div><Link className="link-button" href="/tareas">Ver todas</Link></header>
            <div className="task-list">
              {tasks.length === 0 ? <p className="popover-empty">No hay tareas pendientes. ¡Buen trabajo!</p> : tasks.map(t => <DashTask key={t.id} task={t} due={formatDue(t.dueDate)} color={PRIORITY_COLORS[t.priority] ?? '#12c6b4'} />)}
            </div>
          </article>
        </aside>
      </section>

      <section className="dash-bottom">
        <article className="panel">
          <header className="panel-head"><div><h3>Actividad reciente</h3><p>Lo último que pasó en el CRM</p></div></header>
          <div className="activity">
            {activity.map(a => {
              const c = ACTIVITY_COLORS[a.kind] ?? '#5f9dff'
              return <div key={a.id} className="activity-row"><span className="activity-icon" style={{ background: `${c}33`, color: c }}>●</span><span><b>{a.title}</b><small>{a.detail}{a.detail ? ' · ' : ''}{formatAgo(a.createdAt)}</small></span></div>
            })}
          </div>
        </article>
        <article className="panel">
          <header className="panel-head"><div><h3>Clientes por industria</h3><p>Clientes activos</p></div><Link className="link-button" href="/clientes">Ver clientes</Link></header>
          <div className="donut-wrap">
            <div className="donut" style={{ background: `conic-gradient(${donut || '#294362 0 100%'})`, '--label': `"${industry.total}\\A ${industry.total === 1 ? 'cliente' : 'clientes'}"` } as React.CSSProperties} role="img" aria-label={`${industry.total} clientes activos`} />
            <div className="legend">{industry.groups.map(g => <span key={g.industry} className="legend-item"><i style={{ background: g.color }} />{g.industry}<em>{g.percent}%</em></span>)}</div>
          </div>
        </article>
        <article className="panel">
          <header className="panel-head">
            <div><h3>Agenda</h3><p>{monthMeetings.title}</p></div>
            <MeetingDialog clients={clients} trigger="+ Agendar" triggerClassName="link-button" />
          </header>
          <div className="calendar-wrap">
            <table className="mini-calendar">
              <caption>{monthMeetings.title}</caption>
              <thead><tr>{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => <th key={i}>{d}</th>)}</tr></thead>
              <tbody>{monthMeetings.weeks.map((w, i) => <tr key={i}>{w.map((d, j) => <td key={j} className={[d?.event ? 'has-event' : '', d?.today ? 'event-day' : ''].join(' ').trim() || undefined}>{d?.n ?? ''}</td>)}</tr>)}</tbody>
            </table>
            <div className="event-list">
              {meetings.length === 0 ? <div>Sin reuniones próximas.</div> : meetings.map(m => <div key={m.id} title={`${m.title}${m.clientName ? ` · ${m.clientName}` : ''}`}><b>{formatShortDate(m.startsAt)}</b> · {m.title}</div>)}
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}

// Calendario del mes actual (semanas de lunes a domingo) con los días que tienen reuniones.
async function monthMeetingDays() {
  const today = todayKey()
  const [y, m] = today.split('-').map(Number) as [number, number]
  const first = new Date(Date.UTC(y, m - 1, 1)), last = new Date(Date.UTC(y, m, 0))
  const meetings = await Q.getMeetingsBetween(`${today.slice(0, 8)}01T00:00:00-05:00`, `${last.toISOString().slice(0, 10)}T23:59:59-05:00`)
  const days = new Set(meetings.map(x => Number(dayKey(x.startsAt).slice(8))))
  const offset = (first.getUTCDay() + 6) % 7
  const cells: ({ n: number; event: boolean; today: boolean } | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= last.getUTCDate(); d++) cells.push({ n: d, event: days.has(d), today: d === Number(today.slice(8)) })
  while (cells.length % 7) cells.push(null)
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))
  const title = new Intl.DateTimeFormat('es-EC', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first)
  return { title: title.charAt(0).toUpperCase() + title.slice(1), weeks }
}
