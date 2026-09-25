import { getOrganizationContext } from '@/lib/supabase/context'
import { calculateMrr } from '@/features/finance/domain/revenue-metrics'

type Subscription = { amount: number | string; frequency: string; status: string }
type RevenueGoals = { mrr_goal: number | string }
type Metric = { label: string; value: number }

function RevenueMetricCards({ metrics }: { metrics: Metric[] }) {
  return <div className="mt-8 grid gap-4 md:grid-cols-3">
    {metrics.map((metric) => <div key={metric.label} className="rounded-xl border border-brand-border p-5">
      <p className="text-brand-muted">{metric.label}</p>
      <b className="mt-2 block text-2xl">${metric.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}</b>
    </div>)}
  </div>
}

export default async function RevenuePage() {
  const { supabase, organizationId } = await getOrganizationContext()
  const [{ data: paymentData }, { data: subscriptionData }, { data: settingsData }] = organizationId
    ? await Promise.all([
      supabase.from('payments').select('amount').eq('organization_id', organizationId),
      supabase.from('subscriptions').select('amount,frequency,status').eq('organization_id', organizationId),
      supabase.from('organization_settings').select('monthly_revenue_goal,mrr_goal').eq('organization_id', organizationId).maybeSingle(),
    ])
    : [{ data: [] }, { data: [] }, { data: null }]
  const payments = (paymentData ?? []) as Array<{ amount: number | string }>
  const subscriptions = (subscriptionData ?? []) as unknown as Subscription[]
  const settings = settingsData as unknown as RevenueGoals | null
  const paid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  const mrr = calculateMrr(subscriptions.map((subscription) => ({ amount: Number(subscription.amount), frequency: subscription.frequency === 'annual' ? 'annual' : 'monthly', status: subscription.status as 'trial' | 'active' | 'past_due' | 'paused' | 'cancelled' })))
  const metrics: Metric[] = [
    { label: 'Ingresos cobrados', value: paid },
    { label: 'MRR contratado', value: mrr },
    { label: 'Meta MRR', value: Number(settings?.mrr_goal ?? 0) },
  ]

  return <div className="px-6 py-10 md:px-8">
    <p className="mono text-xs uppercase text-brand-primary">Finanzas / inteligencia</p>
    <h1 className="mt-2 text-3xl font-bold">Revenue analytics</h1>
    <RevenueMetricCards metrics={metrics} />
    <p className="mt-6 text-sm text-brand-muted">Ingresos cobrados son pagos reales registrados. MRR contratado normaliza suscripciones activas: mensual + anual/12.</p>
  </div>
}
