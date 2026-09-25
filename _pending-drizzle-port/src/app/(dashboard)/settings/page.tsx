import { ActionSubmitButton } from '@/components/ui/action-submit-button'
import { ActionFeedbackForm } from '@/components/ui/action-feedback-form'
import { saveRevenueGoals } from '@/app/actions/operations'
import { getOrganizationContext } from '@/lib/supabase/context'

type RevenueGoals = {
  monthly_revenue_goal: number | string
  mrr_goal: number | string
}

export default async function SettingsPage() {
  const { supabase, organizationId } = await getOrganizationContext()
  const { data } = organizationId
    ? await supabase.from('organization_settings').select('monthly_revenue_goal,mrr_goal').eq('organization_id', organizationId).maybeSingle()
    : { data: null }
  const goals = data as unknown as RevenueGoals | null

  return <div className="min-h-[calc(100dvh-72px)] px-6 py-10 md:px-8">
    <p className="mono text-xs uppercase tracking-[0.16em] text-brand-primary">Sistema / configuración</p>
    <h1 className="mt-2 text-3xl font-bold tracking-[-0.06em]">Configuración del CRM</h1>
    <ActionFeedbackForm action={saveRevenueGoals} successMessage="Metas guardadas correctamente" className="mt-8 grid max-w-xl gap-3 rounded-xl border border-brand-border p-5">
      <label>Meta mensual de ingresos
        <input className="ml-3 rounded border border-brand-border bg-transparent p-2" name="monthlyRevenueGoal" type="number" min="0" step="0.01" defaultValue={Number(goals?.monthly_revenue_goal ?? 0)} />
      </label>
      <label>Meta MRR
        <input className="ml-3 rounded border border-brand-border bg-transparent p-2" name="mrrGoal" type="number" min="0" step="0.01" defaultValue={Number(goals?.mrr_goal ?? 0)} />
      </label>
      <ActionSubmitButton className="rounded bg-brand-text px-4 py-2 text-brand-bg">Guardar metas</ActionSubmitButton>
    </ActionFeedbackForm>
  </div>
}
