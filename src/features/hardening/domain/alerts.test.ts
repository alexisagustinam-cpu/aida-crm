import { describe, expect, test } from 'vitest'
import { countAttentionAlerts } from './alerts'

describe('countAttentionAlerts', () => {
  test('counts stale deals, overdue invoices, contract windows and records without actions', () => {
    const today = new Date('2026-09-17T12:00:00Z')
    expect(countAttentionAlerts({
      deals: [{ status: 'open', last_contact_at: '2026-08-01T00:00:00Z' }],
      invoices: [{ status: 'issued', due_date: '2026-09-16' }],
      contracts: [{ status: 'active', ends_on: '2026-10-17' }, { status: 'active', ends_on: '2026-10-01' }, { status: 'active', ends_on: '2026-09-24' }],
      tasks: [{ status: 'todo', due_at: '2026-09-16T10:00:00Z' }],
      leads: [{ status: 'new', next_action_at: null }],
    }, today)).toEqual({ staleDeals: 1, overdueInvoices: 1, contractsExpiring30: 1, contractsExpiring14: 1, contractsExpiring7: 1, overdueTasks: 1, leadsWithoutAction: 1 })
  })
})
