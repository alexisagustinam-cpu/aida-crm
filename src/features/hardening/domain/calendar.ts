export type CalendarEvent = { id: string; kind: 'task' | 'deal' | 'invoice' | 'contract' | 'project'; title: string; date: string }

export function calendarEventHref(event: CalendarEvent) {
  const id = encodeURIComponent(event.id)
  if (event.kind === 'deal') return `/sales/pipeline/${id}`
  if (event.kind === 'invoice') return `/finance/invoices/${id}`
  if (event.kind === 'project') return `/work/projects/${id}`
  if (event.kind === 'task') return `/work/tasks?task=${id}`
  return `/commercial/contracts?contract=${id}`
}

type CalendarSource = {
  tasks: Array<{ id: string; title: string; due_at: string | null; status: string }>
  deals: Array<{ id: string; name: string; next_action: string | null; next_action_at: string | null; status: string }>
  invoices: Array<{ id: string; number: string; due_date: string; status: string }>
  contracts: Array<{ id: string; title: string; ends_on: string | null; status: string }>
  projects: Array<{ id: string; name: string; due_date: string | null; status: string }>
}

export function buildCalendarEvents(source: CalendarSource): CalendarEvent[] {
  return [
    ...source.tasks.filter((item) => item.status !== 'completed' && item.due_at).map((item) => ({ id: item.id, kind: 'task' as const, title: item.title, date: item.due_at! })),
    ...source.deals.filter((item) => item.status === 'open' && item.next_action && item.next_action_at).map((item) => ({ id: item.id, kind: 'deal' as const, title: item.next_action!, date: item.next_action_at! })),
    ...source.invoices.filter((item) => !['paid', 'void'].includes(item.status)).map((item) => ({ id: item.id, kind: 'invoice' as const, title: `Factura ${item.number}`, date: item.due_date })),
    ...source.contracts.filter((item) => item.status === 'active' && item.ends_on).map((item) => ({ id: item.id, kind: 'contract' as const, title: `Contrato vence: ${item.title}`, date: item.ends_on! })),
    ...source.projects.filter((item) => !['completed', 'cancelled'].includes(item.status) && item.due_date).map((item) => ({ id: item.id, kind: 'project' as const, title: `Proyecto vence: ${item.name}`, date: item.due_date! })),
  ].sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
}
