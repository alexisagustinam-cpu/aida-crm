import { getOrganizationContext } from '@/lib/supabase/context'

type Deal = { status: string; implementation_value: number | string; weighted_value: number | string }
type Metric = { label: string; value: number }

function SalesMetricCards({ metrics }: { metrics: Metric[] }) {
  return <div className="mt-8 grid gap-4 md:grid-cols-3">
    {metrics.map((metric) => <div key={metric.label} className="rounded-xl border border-brand-border p-5">
      <p className="text-brand-muted">{metric.label}</p>
      <b className="text-2xl">${metric.value.toLocaleString()}</b>
    </div>)}
  </div>
}

export default async function SalesAnalyticsPage() {
  const { supabase, organizationId } = await getOrganizationContext()
  const { data } = organizationId
    ? await supabase.from('deals').select('status,implementation_value,weighted_value').eq('organization_id', organizationId)
    : { data: [] }
  const deals = (data ?? []) as unknown as Deal[]
  const openDeals = deals.filter((deal) => deal.status === 'open')
  const wonDeals = deals.filter((deal) => deal.status === 'won')
  const metrics: Metric[] = [
    { label: 'Pipeline abierto', value: openDeals.reduce((sum, deal) => sum + Number(deal.implementation_value), 0) },
    { label: 'Pipeline ponderado', value: openDeals.reduce((sum, deal) => sum + Number(deal.weighted_value), 0) },
    { label: 'Ventas ganadas', value: wonDeals.reduce((sum, deal) => sum + Number(deal.implementation_value), 0) },
  ]

  return <div className="px-6 py-10 md:px-8">
    <p className="mono text-xs uppercase text-brand-primary">Ventas / inteligencia</p>
    <h1 className="mt-2 text-3xl font-bold">Sales analytics</h1>
    <SalesMetricCards metrics={metrics} />
    <p className="mt-6 text-sm text-brand-muted">Métricas basadas en oportunidades reales del pipeline.</p>
  </div>
}
