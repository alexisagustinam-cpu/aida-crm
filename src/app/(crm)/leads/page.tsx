import Link from 'next/link'
import { getClientOptions, getLeads } from '@/lib/crm/queries'
import { formatAgo, formatMoney, percentChange, signed, todayKey } from '@/lib/crm/format'
import { OpportunityDialog } from '@/components/crm/forms'
import { StageSelect } from '@/components/crm/interactive'
import { LeadEditButton } from '@/components/crm/lead-edit'

const FILTERS = [['abiertos', 'Abiertos'], ['Lead', 'Nuevos'], ['Contactado', 'Contactados'], ['Reunión', 'En reunión'], ['Propuesta', 'Con propuesta'], ['Perdido', 'Perdidos']] as const
const SOURCE_COLORS: Record<string, string> = { Web: '#0866ff', WhatsApp: '#41d18b', Instagram: '#a77bff', 'Redes sociales': '#a77bff', Referido: '#ff7a1a', Evento: '#12c6b4', Llamada: '#5f9dff' }

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ etapa?: string }> }) {
  const { etapa = 'abiertos' } = await searchParams
  const [all, clients] = await Promise.all([getLeads(), getClientOptions()])
  const open = all.filter(o => o.stage !== 'Perdido')
  const rows = etapa === 'abiertos' ? open : all.filter(o => o.stage === etapa)
  const monthStart = `${todayKey().slice(0, 8)}01`
  const thisMonth = all.filter(o => o.createdAt.toISOString().slice(0, 10) >= monthStart).length
  const prevStart = new Date(`${monthStart}T12:00:00Z`); prevStart.setUTCMonth(prevStart.getUTCMonth() - 1)
  const lastMonth = all.filter(o => { const d = o.createdAt.toISOString().slice(0, 10); return d >= prevStart.toISOString().slice(0, 10) && d < monthStart }).length
  const sources = Object.entries(open.reduce<Record<string, number>>((acc, o) => { const k = o.source ?? 'Sin origen'; acc[k] = (acc[k] ?? 0) + 1; return acc }, {})).sort((a, b) => b[1] - a[1])
  const count = (f: string) => f === 'abiertos' ? open.length : all.filter(o => o.stage === f).length
  return (
    <div className="view">
      <section className="page-head">
        <div><h1>Leads</h1><p>Prospectos que todavía no son clientes. Cambia su etapa aquí o arrástralos en el pipeline.</p></div>
        <div className="page-actions"><Link className="outline-button" href="/configuracion#integraciones">Recibir leads de la web</Link><OpportunityDialog clients={clients} trigger="+ Nuevo lead" /></div>
      </section>
      <section className="stat-row">
        <article className="panel stat"><small>Leads este mes</small><b>{thisMonth}</b><span>{signed(percentChange(thisMonth, lastMonth))} vs. mes anterior</span></article>
        <article className="panel stat"><small>Abiertos</small><b>{open.length}</b><span>{formatMoney(open.reduce((t, o) => t + o.valueCents, 0))} en juego</span></article>
        <article className="panel stat"><small>Origen principal</small><b>{sources[0]?.[0] ?? '—'}</b><span>{sources[0] ? `${sources[0][1]} de ${open.length} leads` : 'Sin datos'}</span></article>
        <article className="panel stat"><small>Sin contactar</small><b>{all.filter(o => o.stage === 'Lead').length}</b><span>esperan el primer mensaje</span></article>
      </section>
      <nav className="chip-row" aria-label="Filtrar leads">
        {FILTERS.map(([key, label]) => <Link key={key} href={key === 'abiertos' ? '/leads' : `/leads?etapa=${encodeURIComponent(key)}`} className={`chip${etapa === key ? ' active' : ''}`}>{label}<span>{count(key)}</span></Link>)}
      </nav>
      <article className="panel table-wrap">
        {rows.length === 0 ? <div className="empty-state"><b>No hay leads en esta etapa.</b>Agrega uno con “Nuevo lead”.</div> : (
          <table className="data-table">
            <thead><tr><th>Empresa</th><th>Servicio</th><th>Valor</th><th>Origen</th><th>Etapa</th><th>Entró</th><th /></tr></thead>
            <tbody>
              {rows.map(o => (
                <tr key={o.id}>
                  <td><b>{o.company}</b><small>{o.contactName ?? 'Sin contacto'}{o.email ? ` · ${o.email}` : ''}</small></td>
                  <td>{o.service}</td>
                  <td>{formatMoney(o.valueCents)}</td>
                  <td>{o.source ? <><span className="source-dot" style={{ background: SOURCE_COLORS[o.source] ?? '#8da0b8' }} />{o.source}</> : '—'}</td>
                  <td><StageSelect id={o.id} stage={o.stage} company={o.company} /></td>
                  <td>{formatAgo(o.createdAt)}</td>
                  <td><span className="row-actions">
                    {o.phone && <a className="icon-action" href={`https://wa.me/${o.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a>}
                    {o.email && <a className="icon-action" href={`mailto:${o.email}`}>Correo</a>}
                    <LeadEditButton opportunity={{ ...o, nextActionAt: o.nextActionAt?.toISOString() ?? null }} clients={clients} />
                  </span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </div>
  )
}
