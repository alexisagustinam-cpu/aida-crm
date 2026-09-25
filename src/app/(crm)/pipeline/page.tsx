import { Suspense } from 'react'
import { getBoard, getClientOptions, OPEN_STAGES } from '@/lib/crm/queries'
import { formatMoney } from '@/lib/crm/format'
import { Board } from '@/components/crm/board'
import { OpportunityDialog } from '@/components/crm/forms'

export default async function PipelinePage() {
  const [rows, clients] = await Promise.all([getBoard(), getClientOptions()])
  const open = rows.filter(o => OPEN_STAGES.includes(o.stage))
  const won = rows.filter(o => o.stage === 'Ganado'), lost = rows.filter(o => o.stage === 'Perdido')
  const closeRate = won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : null
  const opportunities = rows.map(o => ({ ...o, nextActionAt: o.nextActionAt?.toISOString() ?? null, stageChangedAt: o.stageChangedAt.toISOString(), createdAt: undefined }))
  return (
    <div className="view">
      <section className="page-head">
        <div><h1>Pipeline</h1><p>Arrastra las tarjetas entre etapas. Al pasar a Ganado se crea el cliente y su tarea de bienvenida.</p></div>
        <div className="page-actions"><OpportunityDialog clients={clients} trigger="+ Nueva oportunidad" /></div>
      </section>
      <section className="stat-row">
        <article className="panel stat"><small>Oportunidades abiertas</small><b>{open.length}</b><span>en 4 etapas</span></article>
        <article className="panel stat"><small>Valor en juego</small><b>{formatMoney(open.reduce((t, o) => t + o.valueCents, 0))}</b><span>suma de las abiertas</span></article>
        <article className="panel stat"><small>Ganado (90 días)</small><b>{formatMoney(won.reduce((t, o) => t + o.valueCents, 0))}</b><span>{won.length} oportunidades</span></article>
        <article className="panel stat"><small>Tasa de cierre</small><b>{closeRate === null ? '—' : `${closeRate}%`}</b><span>ganadas vs. perdidas (90 días)</span></article>
      </section>
      <Suspense><Board opportunities={opportunities} clients={clients} /></Suspense>
    </div>
  )
}
