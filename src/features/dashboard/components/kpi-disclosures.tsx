'use client'

import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import type { CommandCenterData } from '@/features/dashboard/domain/types'

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

type Kpi = {
  id: string
  label: string
  value: string
  detail: string
  href: string
  linkLabel: string
  content: React.ReactNode
}

function KpiCard({ kpi, active, onToggle, compact = false }: { kpi: Kpi; active: boolean; onToggle: () => void; compact?: boolean }) {
  const detailId = `${kpi.id}-detalle`
  return <article className="relative border border-brand-border bg-brand-surface-elevated">
    <button type="button" aria-expanded={active} aria-controls={detailId} onClick={onToggle} className={`block w-full text-left transition-colors hover:bg-brand-surface focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-brand-primary ${compact ? 'p-4 pr-12' : 'p-5 pr-14'}`}>
      <p className="mono text-[10px] uppercase tracking-[0.14em] text-brand-muted">{kpi.label}</p>
      <p className={`${compact ? 'mt-4 text-2xl' : 'mt-5 text-3xl'} font-bold tracking-[-0.06em] text-brand-text`}>{kpi.value}</p>
      <p className="mt-2 text-sm text-brand-muted">{kpi.detail}</p>
    </button>
    <Link href={kpi.href} aria-label={`${kpi.linkLabel}: ${kpi.label}`} className="absolute right-4 top-4 inline-flex p-1 text-brand-primary transition-colors hover:text-brand-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"><ArrowUpRight size={16} /></Link>
  </article>
}

function KpiRow({ kpis, activeId, onToggle, compact = false }: { kpis: Kpi[]; activeId: string | null; onToggle: (id: string) => void; compact?: boolean }) {
  const reduceMotion = useReducedMotion()
  const active = kpis.find((kpi) => kpi.id === activeId)
  return <section className="space-y-px" aria-label={compact ? 'Indicadores de pipeline' : 'Indicadores de ingresos'}>
    <div className={`grid gap-px border border-brand-border bg-brand-border ${compact ? 'lg:grid-cols-4' : 'lg:grid-cols-2'}`}>
      {kpis.map((kpi) => <KpiCard key={kpi.id} kpi={kpi} active={active?.id === kpi.id} onToggle={() => onToggle(kpi.id)} compact={compact} />)}
    </div>
    <AnimatePresence initial={false}>
      {active && <motion.div key={active.id} id={`${active.id}-detalle`} role="region" aria-label={`Detalle de ${active.label}`} initial={reduceMotion ? false : { height: 0, opacity: 0 }} animate={reduceMotion ? undefined : { height: 'auto', opacity: 1 }} exit={reduceMotion ? undefined : { height: 0, opacity: 0 }} transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden border border-brand-border bg-brand-surface-elevated">
        <div className="p-5 text-sm text-brand-muted">{active.content}</div>
      </motion.div>}
    </AnimatePresence>
  </section>
}

export function KpiDisclosures({ data }: { data: CommandCenterData }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const deals = data.openDealDetails.slice(0, 3)
  const revenueKpis: Kpi[] = [
    { id: 'ingresos-cobrados', label: 'Ingresos cobrados este mes', value: money.format(data.cashCollectedThisMonth), detail: `${data.paymentsThisMonth.length} cobros registrados`, href: '/finance/invoices', linkLabel: 'Ver facturas', content: <><p>{data.paymentsThisMonth.length} cobros este mes.</p>{data.paymentsThisMonth.length > 0 && <ul className="mt-2 space-y-1">{data.paymentsThisMonth.map((payment, index) => <li key={`${payment.amount}-${payment.paidAt}-${index}`}>{money.format(payment.amount)} · {new Date(payment.paidAt).toLocaleDateString('es-EC')}</li>)}</ul>}</> },
    { id: 'mrr-contratado', label: 'MRR contratado', value: money.format(data.contractedMrr), detail: `${data.activeSubscriptionsCount} suscripciones activas`, href: '/finance/mrr', linkLabel: 'Ver MRR', content: <p>{data.activeSubscriptionsCount} suscripciones activas. MRR normalizado: {money.format(data.contractedMrr)}.</p> },
  ]
  const pipelineKpis: Kpi[] = [
    { id: 'clientes-activos', label: 'Clientes activos', value: String(data.activeClientsCount), detail: 'Empresas con venta ganada o acuerdo', href: '/clients', linkLabel: 'Ver clientes', content: <p>{data.activeClientsCount} empresas ya dejaron de ser prospecto: tienen una venta ganada o un acuerdo registrado.</p> },
    { id: 'cuentas-por-cobrar', label: 'Cuentas por cobrar', value: money.format(data.accountsReceivable), detail: 'Saldo pendiente de facturas emitidas', href: '/finance/invoices', linkLabel: 'Ver facturas', content: <p>{data.invoicesCount} facturas emitidas · {money.format(data.accountsReceivable)} pendiente · {data.overdueInvoices} vencidas.</p> },
    { id: 'pipeline-abierto', label: 'Pipeline abierto', value: money.format(data.openPipeline), detail: `${data.openDealsCount} oportunidades abiertas`, href: '/sales/pipeline', linkLabel: 'Ver pipeline', content: <><p>{data.openDealsCount} oportunidades abiertas.</p>{deals.length > 0 && <ul className="mt-2 space-y-1">{deals.map((deal) => <li key={deal.id}>{deal.name} · {money.format(deal.implementationValue)}{deal.nextActionAt ? ` · próxima acción ${new Date(deal.nextActionAt).toLocaleDateString('es-EC')}` : ''}</li>)}</ul>}</> },
    { id: 'pipeline-ponderado', label: 'Pipeline ponderado', value: money.format(data.weightedPipeline), detail: 'Forecast, no dinero disponible', href: '/sales/pipeline', linkLabel: 'Ver pipeline', content: <><p>Forecast ponderado de {data.openDealsCount} oportunidades abiertas.</p>{deals.length > 0 && <ul className="mt-2 space-y-1">{deals.map((deal) => <li key={deal.id}>{deal.name} · {money.format(deal.weightedValue)}</li>)}</ul>}</> },
  ]
  const toggle = (id: string) => setActiveId((current) => current === id ? null : id)

  return <div className="space-y-6">
    <KpiRow kpis={revenueKpis} activeId={activeId} onToggle={toggle} />
    <KpiRow kpis={pipelineKpis} activeId={activeId} onToggle={toggle} compact />
  </div>
}
