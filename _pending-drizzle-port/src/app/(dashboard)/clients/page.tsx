import Link from 'next/link'
import { getOrganizationContext } from '@/lib/supabase/context'
import { clientWorkflowSummary } from '@/features/commercial/domain/client-workflow'

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

type Company = { id: string; name: string; industry: string | null }
type Deal = { company_id: string | null; status: string }
type Contract = { company_id: string; value: number }
type Invoice = { company_id: string; total: number; payments: Array<{ amount: number }> }
type Project = { company_id: string }

export default async function ClientsPage() {
  const { supabase, organizationId } = await getOrganizationContext()
  const [{ data: companiesData }, { data: dealsData }, { data: contractsData }, { data: invoicesData }, { data: projectsData }] = await Promise.all([
    supabase.from('companies').select('id,name,industry').eq('organization_id', organizationId!).order('name'),
    supabase.from('deals').select('company_id,status').eq('organization_id', organizationId!),
    supabase.from('contracts').select('company_id,value').eq('organization_id', organizationId!),
    supabase.from('invoices').select('company_id,total,payments(amount)').eq('organization_id', organizationId!),
    supabase.from('projects').select('company_id').eq('organization_id', organizationId!),
  ])
  const companies = (companiesData ?? []) as Company[]
  const deals = (dealsData ?? []) as Deal[]
  const contracts = (contractsData ?? []) as Contract[]
  const invoices = (invoicesData ?? []) as unknown as Invoice[]
  const projects = (projectsData ?? []) as Project[]
  const rows = companies.map((company) => ({
    company,
    workflow: clientWorkflowSummary({
      hasWonDeal: deals.some((deal) => deal.company_id === company.id && deal.status === 'won'),
      agreements: contracts.filter((contract) => contract.company_id === company.id).map((contract) => ({ value: Number(contract.value), documentUrl: null })),
      invoices: invoices.filter((invoice) => invoice.company_id === company.id).map((invoice) => ({ total: Number(invoice.total), payments: (invoice.payments ?? []).map((payment) => Number(payment.amount)) })),
      projects: projects.filter((project) => project.company_id === company.id),
    }),
  })).filter(({ workflow }) => workflow.status !== 'Prospecto')

  return <main className="product-grid min-h-[calc(100dvh-72px)] p-5 md:p-8"><p className="mono text-xs uppercase tracking-[.16em] text-brand-primary">CRM / Clientes</p><h1 className="mt-2 text-3xl font-bold tracking-[-.06em]">Clientes</h1><p className="mt-2 max-w-2xl text-sm text-brand-muted">Una sola lista para clientes con venta ganada o acuerdo. Abre la ficha para ver acuerdo, cobros y proyecto sin usar el buscador.</p>{rows.length ? <ul className="mt-7 divide-y divide-brand-border border border-brand-border bg-brand-surface-elevated">{rows.map(({ company, workflow }) => <li key={company.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{company.name}</p><p className="mt-1 text-sm text-brand-muted">{workflow.status} · {company.industry ?? 'Sin industria'}</p></div><dl className="grid grid-cols-3 gap-5 text-sm"><div><dt className="text-brand-muted">Acordado</dt><dd>{money.format(workflow.contracted)}</dd></div><div><dt className="text-brand-muted">Cobrado</dt><dd>{money.format(workflow.collected)}</dd></div><div><dt className="text-brand-muted">Saldo</dt><dd>{money.format(workflow.balance)}</dd></div></dl><Link href={`/sales/companies/${company.id}`} className="rounded-md bg-brand-text px-3 py-2 text-sm font-medium text-brand-bg">Abrir ficha</Link></li>)}</ul> : <section className="mt-7 border border-brand-border bg-brand-surface-elevated p-5"><h2 className="font-semibold">Aún no hay clientes activos</h2><p className="mt-2 text-sm text-brand-muted">Un prospecto aparecerá aquí cuando ganes la oportunidad o registres un acuerdo.</p></section>}</main>
}
