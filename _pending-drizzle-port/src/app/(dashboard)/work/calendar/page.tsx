import Link from 'next/link'
import { buildCalendarEvents, calendarEventHref } from '@/features/hardening/domain/calendar'
import { getOrganizationContext } from '@/lib/supabase/context'

const labels = { task: 'Tarea', deal: 'Próxima acción', invoice: 'Factura', contract: 'Contrato', project: 'Proyecto' }

export default async function CalendarPage() {
  const { supabase, organizationId } = await getOrganizationContext()
  if (!organizationId) return <main className="px-6 py-10"><h1 className="text-3xl font-bold">Calendario</h1><p className="mt-3 text-brand-muted">Configura una organización para ver fechas operativas.</p></main>
  const [tasks, deals, invoices, contracts, projects] = await Promise.all([
    supabase.from('tasks').select('id,title,due_at,status').eq('organization_id', organizationId),
    supabase.from('deals').select('id,name,next_action,next_action_at,status').eq('organization_id', organizationId),
    supabase.from('invoices').select('id,number,due_date,status').eq('organization_id', organizationId),
    supabase.from('contracts').select('id,title,ends_on,status').eq('organization_id', organizationId),
    supabase.from('projects').select('id,name,due_date,status').eq('organization_id', organizationId),
  ])
  const events = buildCalendarEvents({ tasks: (tasks.data ?? []) as unknown as Array<{ id: string; title: string; due_at: string | null; status: string }>, deals: (deals.data ?? []) as unknown as Array<{ id: string; name: string; next_action: string | null; next_action_at: string | null; status: string }>, invoices: (invoices.data ?? []) as unknown as Array<{ id: string; number: string; due_date: string; status: string }>, contracts: (contracts.data ?? []) as unknown as Array<{ id: string; title: string; ends_on: string | null; status: string }>, projects: (projects.data ?? []) as unknown as Array<{ id: string; name: string; due_date: string | null; status: string }> })
  return <main className="product-grid min-h-[calc(100dvh-72px)] px-5 py-8 md:px-8"><p className="mono text-xs uppercase tracking-[.16em] text-brand-primary">Trabajo / calendario</p><h1 className="mt-2 text-3xl font-bold tracking-[-.06em]">Fechas que mueven el negocio</h1><p className="mt-2 text-sm text-brand-muted">Tareas, acciones comerciales, cobros, contratos y entregas reales, ordenados por fecha.</p>
    {events.length === 0 ? <section className="mt-8 border border-brand-border bg-brand-surface-elevated p-8 text-center"><h2 className="font-semibold">No hay fechas pendientes.</h2><p className="mt-2 text-sm text-brand-muted">Las fechas registradas aparecerán aquí automáticamente.</p></section> : <ol className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{events.map((event) => <li key={`${event.kind}-${event.id}`} className="border border-brand-border bg-brand-surface-elevated p-4"><p className="mono text-[10px] uppercase tracking-[.14em] text-brand-primary">{labels[event.kind]}</p><h2 className="mt-3 font-semibold"><Link className="underline" href={calendarEventHref(event)}>{event.title}</Link></h2><time className="mt-2 block text-sm text-brand-muted" dateTime={event.date}>{new Intl.DateTimeFormat('es-EC', { dateStyle: 'full', timeStyle: event.date.includes('T') ? 'short' : undefined }).format(new Date(event.date))}</time></li>)}</ol>}
  </main>
}
