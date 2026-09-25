import { describe, expect, test } from 'vitest'
import { buildCalendarEvents, calendarEventHref } from './calendar'

describe('buildCalendarEvents', () => {
  test('merges persisted due dates chronologically and excludes completed or void records', () => {
    const events = buildCalendarEvents({
      tasks: [{ id: 'task-1', title: 'Call client', due_at: '2026-09-20T14:00:00.000Z', status: 'todo' }, { id: 'task-2', title: 'Done', due_at: '2026-09-18T14:00:00.000Z', status: 'completed' }],
      deals: [{ id: 'deal-1', name: 'CRM', next_action: 'Send proposal', next_action_at: '2026-09-19T10:00:00.000Z', status: 'open' }],
      invoices: [{ id: 'invoice-1', number: 'INV-1', due_date: '2026-09-18', status: 'issued' }, { id: 'invoice-2', number: 'INV-2', due_date: '2026-09-17', status: 'void' }],
      contracts: [{ id: 'contract-1', title: 'Support', ends_on: '2026-09-21', status: 'active' }],
      projects: [{ id: 'project-1', name: 'Launch', due_date: '2026-09-22', status: 'active' }],
    })

    expect(events.map((event) => [event.kind, event.title])).toEqual([
      ['invoice', 'Factura INV-1'], ['deal', 'Send proposal'], ['task', 'Call client'], ['contract', 'Contrato vence: Support'], ['project', 'Proyecto vence: Launch'],
    ])
  })
})

describe('calendarEventHref', () => {
  test('uses only detail routes that exist or the matching list context', () => {
    expect(calendarEventHref({ id: 'task-1', kind: 'task', title: 'Llamar', date: '2026-09-20' })).toBe('/work/tasks?task=task-1')
    expect(calendarEventHref({ id: 'deal-1', kind: 'deal', title: 'Enviar propuesta', date: '2026-09-20' })).toBe('/sales/pipeline/deal-1')
    expect(calendarEventHref({ id: 'invoice-1', kind: 'invoice', title: 'Factura INV-1', date: '2026-09-20' })).toBe('/finance/invoices/invoice-1')
    expect(calendarEventHref({ id: 'contract-1', kind: 'contract', title: 'Contrato', date: '2026-09-20' })).toBe('/commercial/contracts?contract=contract-1')
    expect(calendarEventHref({ id: 'project-1', kind: 'project', title: 'Proyecto', date: '2026-09-20' })).toBe('/work/projects/project-1')
  })
})
