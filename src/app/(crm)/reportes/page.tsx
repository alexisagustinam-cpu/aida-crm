import { getInvoices, getReports } from '@/lib/crm/queries'
import { formatLongDate, formatMoney, formatShortDate, monthLabel, signed } from '@/lib/crm/format'
import { STAGE_COLORS } from '@/lib/crm/queries'

function Bars({ rows, color }: { rows: { label: string; value: number; display: string; color?: string }[]; color?: string }) {
  const max = Math.max(...rows.map(r => r.value), 1)
  if (!rows.length) return <p className="muted-text">Sin datos todavía.</p>
  return (
    <div className="bars">
      {rows.map(r => (
        <div key={r.label} className="bar-line">
          <span>{r.label}</span>
          <span className="bar" style={{ '--value': `${Math.max(2, (r.value / max) * 100)}%`, '--bar': r.color ?? color ?? '#0866ff' } as React.CSSProperties}><i /></span>
          <span>{r.display}</span>
        </div>
      ))}
    </div>
  )
}

export default async function ReportsPage() {
  const [r, invoices] = await Promise.all([getReports(), getInvoices()])
  const incomeMax = Math.max(...r.income.series.map(p => p.total), 1)
  const closeRate = r.funnel.won + r.funnel.lost ? Math.round((r.funnel.won / (r.funnel.won + r.funnel.lost)) * 100) : null
  const stageOrder = ['Lead', 'Contactado', 'Reunión', 'Propuesta', 'Ganado', 'Perdido']
  const weeks = r.tasksDone
  const weekMax = Math.max(...weeks.map(w => w.count), 1)
  return (
    <div className="view">
      <section className="page-head">
        <div><h1>Reportes</h1><p>Números del negocio calculados con los datos del CRM.</p></div>
        <div className="page-actions"><a className="outline-button" href="/api/export?formato=csv&tabla=facturas">Descargar facturas (CSV)</a><a className="outline-button" href="/api/export">Exportar todo (JSON)</a></div>
      </section>
      <section className="stat-row">
        <article className="panel stat"><small>Ingresos este mes</small><b>{formatMoney(r.income.current)}</b><span>{signed(r.income.change)} vs. mes anterior</span></article>
        <article className="panel stat"><small>Cobrado (90 días)</small><b>{formatMoney(r.receivable.paid90)}</b><span>facturas pagadas</span></article>
        <article className="panel stat"><small>Por cobrar</small><b>{formatMoney(r.receivable.pending)}</b><span>facturas pendientes</span></article>
        <article className="panel stat"><small>Tasa de cierre (90 días)</small><b>{closeRate === null ? '—' : `${closeRate}%`}</b><span>{r.funnel.created} oportunidades nuevas · {formatMoney(r.funnel.wonValue)} ganados</span></article>
      </section>
      <section className="report-grid">
        <article className="panel">
          <h3>Ingresos por mes</h3><p className="sub">Facturas pagadas, últimos 6 meses</p>
          <div className="col-chart">
            {r.income.series.map(p => (
              <div key={p.month}><em>{p.total ? formatMoney(p.total).replace('$', '$') : '—'}</em><i style={{ height: `${Math.max(3, (p.total / incomeMax) * 100)}%` }} /><small>{monthLabel(`${p.month}T12:00:00`)}</small></div>
            ))}
          </div>
        </article>
        <article className="panel">
          <h3>Pipeline por etapa</h3><p className="sub">Valor de las oportunidades en cada etapa</p>
          <Bars rows={stageOrder.map(st => r.byStage.find(x => x.stage === st)).filter(Boolean).map(x => ({ label: `${x!.stage} (${x!.count})`, value: x!.total, display: formatMoney(x!.total), color: STAGE_COLORS[x!.stage] }))} />
        </article>
        <article className="panel">
          <h3>Servicios más pedidos</h3><p className="sub">Por valor de oportunidades</p>
          <Bars rows={r.byService.slice(0, 6).map(x => ({ label: `${x.service} (${x.count})`, value: x.total, display: formatMoney(x.total) }))} color="#a77bff" />
        </article>
        <article className="panel">
          <h3>Origen de los leads</h3><p className="sub">Todas las oportunidades</p>
          <Bars rows={r.bySource.map(x => ({ label: x.source, value: x.count, display: `${x.count}` }))} color="#12c6b4" />
        </article>
        <article className="panel">
          <h3>Clientes por industria</h3><p className="sub">{r.industry.total} clientes activos</p>
          <Bars rows={r.industry.groups.map(g => ({ label: g.industry, value: g.count, display: `${g.count} · ${g.percent}%`, color: g.color }))} />
        </article>
        <article className="panel">
          <h3>Tareas completadas</h3><p className="sub">Por semana, últimas 8 semanas</p>
          {weeks.length === 0 ? <p className="muted-text">Aún no hay tareas completadas.</p> : (
            <div className="col-chart">{weeks.map(w => <div key={w.week}><em>{w.count}</em><i style={{ height: `${(w.count / weekMax) * 100}%` }} /><small>{formatShortDate(w.week)}</small></div>)}</div>
          )}
        </article>
      </section>
      <article className="panel" style={{ marginTop: 20 }}>
        <header className="panel-head"><div><h3>Facturas recientes</h3><p>Las 12 más recientes</p></div></header>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Factura</th><th>Cliente</th><th>Monto</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>{invoices.slice(0, 12).map(i => (
              <tr key={i.id}><td><b>#{i.number}</b><small>{i.concept}</small></td><td>{i.clientName}</td><td>{formatMoney(i.amountCents)}</td><td><span className={`pill ${i.status === 'Pagado' ? 'green' : 'orange'}`}>{i.status}</span></td><td>{formatLongDate(i.issuedOn)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </article>
    </div>
  )
}
