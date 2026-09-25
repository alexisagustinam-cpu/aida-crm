import Link from 'next/link'
import { CircleAlert, CircleCheck, ListTodo, Settings2 } from 'lucide-react'
import { type DashboardState } from '@/features/dashboard/domain/types'
import { KpiDisclosures } from './kpi-disclosures'
import { OnboardingCard } from './onboarding-card'

function SetupState({ state }: { state: Extract<DashboardState, { kind: 'needs_supabase' | 'needs_organization' }> }) {
  const needsSupabase = state.kind === 'needs_supabase'
  return <div className="mx-auto flex min-h-[calc(100dvh-72px)] max-w-2xl flex-col justify-center px-6 py-16">
    <p className="mono text-xs uppercase tracking-[0.16em] text-brand-primary">Foundation / setup required</p>
    <h1 className="mt-3 text-4xl font-bold tracking-[-0.065em] text-brand-text">{needsSupabase ? 'Conecta el proyecto Supabase nuevo.' : 'Crea el espacio interno de AutomAI Labs.'}</h1>
    <p className="mt-5 max-w-xl text-lg leading-8 text-brand-muted">{needsSupabase ? 'El CRM no genera datos de muestra. Cuando exista el proyecto nuevo, aplicamos la migración y activamos autenticación, RLS y el Command Center con datos reales.' : 'La autenticación está lista. El siguiente paso crea la organización, metas iniciales y pipeline comercial sin datos ficticios.'}</p>
    <div className="mt-8 border-l-2 border-brand-primary bg-brand-surface-elevated p-5"><p className="mono text-xs uppercase tracking-[0.12em] text-brand-muted">Siguiente acción</p><p className="mt-2 text-sm text-brand-text">{needsSupabase ? 'Añadir NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local.' : 'Ejecutar create_organization_for_owner desde el flujo de onboarding.'}</p></div>
    <Link href="/settings" className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-brand-text px-5 py-3 text-sm font-medium text-brand-text transition-colors hover:bg-brand-text hover:text-brand-bg"><Settings2 size={15} /> Ver estado de configuración</Link>
  </div>
}

export function CommandCenter({ state }: { state: DashboardState }) {
  if (state.kind !== 'ready') return <SetupState state={state} />
  const { data } = state
  const pending = [
    ['Seguimientos vencidos', data.overdueFollowUps, '/sales/activities'],
    ['Propuestas sin respuesta', data.proposalsWithoutResponse, '/commercial/proposals'],
    ['Facturas vencidas', data.overdueInvoices, '/finance/invoices'],
    ['Leads sin tocar', data.untouchedLeads, '/sales/leads'],
    ['Contratos próximos a vencer', data.expiringContracts, '/commercial/contracts'],
    ['Tareas para hoy', data.tasksToday, '/work/tasks'],
    ['Negocios sin contacto reciente', data.staleDeals, '/sales/pipeline'],
    ['Tareas vencidas', data.overdueTasks, '/work/tasks'],
    ['Leads sin próxima acción', data.leadsWithoutAction, '/sales/leads'],
    ['Contratos vencen en 30 días', data.contractsExpiring30, '/commercial/contracts'],
    ['Contratos vencen en 14 días', data.contractsExpiring14, '/commercial/contracts'],
    ['Contratos vencen en 7 días', data.contractsExpiring7, '/commercial/contracts'],
  ].filter(([, count]) => Number(count) > 0)

  return <div className="product-grid min-h-[calc(100dvh-72px)] px-4 py-6 md:px-7 md:py-8">
    <div className="mx-auto max-w-[1540px]">
      <div className="flex flex-col justify-between gap-4 border-b border-brand-border pb-6 md:flex-row md:items-end"><div><p className="mono text-xs uppercase tracking-[0.16em] text-brand-primary">Inicio / Command Center</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.065em] text-brand-text md:text-4xl">Lo que necesita atención hoy.</h1></div><p className="max-w-sm text-sm leading-6 text-brand-muted">Dinero cobrado, negocios en movimiento y próximos pasos. Sin métricas decorativas.</p></div>
      <div className="mt-6"><KpiDisclosures data={data} /></div>
      <OnboardingCard initiallyEmpty={data.primaryDataEmpty} />
      <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_.9fr]"><section className="border border-brand-border bg-brand-surface-elevated"><div className="flex items-center justify-between border-b border-brand-border px-5 py-4"><div><p className="mono text-[10px] uppercase tracking-[0.14em] text-brand-muted">Acciones pendientes</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.04em]">Tu siguiente acción está aquí.</h2></div><ListTodo size={18} className="text-brand-primary" /></div>{pending.length === 0 ? <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center"><CircleCheck size={24} className="text-brand-success" /><p className="mt-3 font-medium">No hay alertas pendientes.</p><p className="mt-1 text-sm text-brand-muted">Cuando haya seguimientos, cobros o tareas, aparecerán aquí.</p></div> : <ul>{pending.map(([label, count, href]) => <li key={label as string} className="flex items-center justify-between gap-4 border-b border-brand-border px-5 py-4 last:border-b-0"><div className="flex items-center gap-3"><CircleAlert size={16} className="text-brand-warning" /><span className="text-sm text-brand-text">{label}</span></div><Link href={href as string} className="mono text-xs text-brand-primary underline underline-offset-4">{count as number} revisar</Link></li>)}</ul>}</section>
        <section className="border border-brand-border bg-brand-text p-6 text-brand-bg"><p className="mono text-[10px] uppercase tracking-[0.14em] text-brand-accent">Operación</p><h2 className="mt-2 text-2xl font-bold tracking-[-0.055em]">Acciones rápidas</h2><p className="mt-3 text-sm leading-6 text-brand-bg/70">Empieza el siguiente movimiento sin duplicar el buscador global.</p><div className="mt-6 grid gap-2 sm:grid-cols-2">{[['Nuevo prospecto', '/sales/leads'], ['Nueva empresa', '/sales/companies'], ['Nuevo contacto', '/sales/contacts'], ['Registrar cobro', '/finance/invoices']].map(([label, href]) => <Link key={href} href={href} className="border border-brand-bg/30 px-3 py-3 text-sm font-medium transition-colors hover:border-brand-accent hover:bg-brand-bg/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent">{label}</Link>)}</div></section></div>
    </div>
  </div>
}
