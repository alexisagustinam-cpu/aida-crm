import Link from 'next/link'
import { getClients } from '@/lib/crm/queries'
import { formatMoney } from '@/lib/crm/format'
import { ClientDialog } from '@/components/crm/forms'
import { ClientMark } from '@/components/crm/marks'

const FILTERS = [['todos', 'Todos'], ['Activo', 'Activos'], ['En pausa', 'En pausa'], ['Prospecto', 'Prospectos'], ['archivados', 'Archivados']] as const

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado = 'todos' } = await searchParams
  const all = await getClients({ includeArchived: true })
  const visible = all.filter(c => estado === 'archivados' ? c.archived : !c.archived && (estado === 'todos' || c.status === estado))
  const active = all.filter(c => !c.archived && c.status === 'Activo')
  const mrr = active.reduce((t, c) => t + c.mrrCents, 0)
  const count = (f: string) => all.filter(c => f === 'archivados' ? c.archived : !c.archived && (f === 'todos' || c.status === f)).length
  return (
    <div className="view">
      <section className="page-head">
        <div><h1>Clientes</h1><p>{active.length} clientes activos · {formatMoney(mrr)} de ingreso mensual recurrente.</p></div>
        <div className="page-actions"><ClientDialog trigger="+ Nuevo cliente" /></div>
      </section>
      <nav className="chip-row" aria-label="Filtrar clientes">
        {FILTERS.map(([key, label]) => <Link key={key} href={key === 'todos' ? '/clientes' : `/clientes?estado=${encodeURIComponent(key)}`} className={`chip${estado === key ? ' active' : ''}`}>{label}<span>{count(key)}</span></Link>)}
      </nav>
      <section className="client-list">
        {visible.length === 0 && <div className="panel empty-state"><b>No hay clientes aquí.</b>Crea uno con “Nuevo cliente” o gana una oportunidad en el pipeline.</div>}
        {visible.map(c => (
          <Link key={c.id} className="client-row" href={`/clientes/${c.id}`}>
            <span className="client-logo"><ClientMark name={c.name} /></span>
            <span><b>{c.name}</b><small>{[c.industry, c.location].filter(Boolean).join(' · ')}{c.contactName ? ` · ${c.contactName}` : ''}</small></span>
            {c.mrrCents > 0 && <span className="client-mrr">{formatMoney(c.mrrCents)}<small>al mes</small></span>}
            <span className={`badge${c.status === 'Activo' ? '' : ' badge-muted'}`}>{c.archived ? 'Archivado' : c.status}</span>
          </Link>
        ))}
      </section>
    </div>
  )
}
