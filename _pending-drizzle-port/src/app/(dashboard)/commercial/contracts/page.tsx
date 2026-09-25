import { ActionSubmitButton } from '@/components/ui/action-submit-button'
import { ActionFeedbackForm } from '@/components/ui/action-feedback-form'
import { updateContract } from '@/app/actions/commercial'
import { ContractScheduleForm } from '@/components/commercial/contract-schedule-form'
import { EmptyState } from '@/components/sales/empty-state'
import { selectedRecord } from '@/features/dashboard/domain/search-routes'
import { getOrganizationContext } from '@/lib/supabase/context'

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ contract?: string }> }) {
  const { contract: requestedContract } = await searchParams
  const { supabase, organizationId } = await getOrganizationContext()
  const [{ data: companiesData }, { data: proposalsData }, { data: contractsData }] = await Promise.all([
    supabase.from('companies').select('id,name').eq('organization_id', organizationId!).order('name'),
    supabase.from('proposals').select('id,title').eq('organization_id', organizationId!).order('created_at', { ascending: false }),
    supabase.from('contracts').select('id,title,status,starts_on,ends_on,companies(name)').eq('organization_id', organizationId!).order('starts_on', { ascending: false }),
  ])
  const companies = (companiesData ?? []) as Array<{ id: string; name: string }>
  const proposals = (proposalsData ?? []) as Array<{ id: string; title: string }>
  const allContracts = (contractsData ?? []) as Array<{ id: string; title: string; status: string; starts_on: string; ends_on: string | null; companies: { name: string } | null }>
  const { records: contracts, found } = selectedRecord(allContracts, requestedContract)
  return <main className="product-grid min-h-[calc(100dvh-72px)] p-5 md:p-8"><p className="mono text-xs uppercase tracking-[.16em] text-brand-primary">Comercial / Contratos</p><h1 className="mt-2 text-3xl font-bold tracking-[-.06em]">Contratos</h1>{requestedContract && !found && <p role="alert" className="mt-4 text-sm text-brand-muted">El contrato solicitado no existe o no está disponible para tu organización.</p>}<div className="mt-7 grid gap-6 lg:grid-cols-[340px_1fr]"><ContractScheduleForm companies={companies} proposals={proposals}/>{contracts.length ? <ul className="divide-y divide-brand-border border border-brand-border bg-brand-surface-elevated">{contracts.map((contract) => <li id={`contract-${contract.id}`} className="p-4" key={contract.id}><p className="font-medium">{contract.title}</p><p className="mt-1 text-sm text-brand-muted">{contract.companies?.name} · {contract.status} · inicia {contract.starts_on}</p>{['draft', 'active'].includes(contract.status) && <ActionFeedbackForm action={updateContract} successMessage="Contrato actualizado correctamente" className="mt-3 flex flex-wrap gap-2"><input type="hidden" name="id" value={contract.id}/><input name="endsOn" type="date" defaultValue={contract.ends_on ?? ''} className="border border-brand-border bg-brand-bg p-1 text-sm"/>{contract.status === 'draft' ? <ActionSubmitButton name="status" value="active" className="text-sm">Activar</ActionSubmitButton> : <><ActionSubmitButton name="status" value="expired" className="text-sm">Marcar vencido</ActionSubmitButton><ActionSubmitButton name="status" value="cancelled" className="text-sm">Cancelar</ActionSubmitButton></>}</ActionFeedbackForm>}</li>)}</ul> : <EmptyState title={requestedContract ? 'No se encontró ese contrato.' : 'No hay contratos registrados.'}/>}</div></main>
}
