import { describe, expect, it } from 'vitest'
import {
  calculateArr,
  calculateForecast,
  calculateInvoiceBalance,
  calculateInvoiceStatus,
  calculateAccountsReceivable,
  validatePaymentAmount,
  calculateMrr,
} from './revenue-metrics'

describe('revenue metrics', () => {
  it('normalizes active monthly and annual subscriptions into contracted MRR', () => {
    const mrr = calculateMrr([
      { amount: 320, frequency: 'monthly', status: 'active' },
      { amount: 1_200, frequency: 'annual', status: 'active' },
      { amount: 500, frequency: 'monthly', status: 'cancelled' },
      { amount: 150, frequency: 'monthly', status: 'past_due' },
    ])

    expect(mrr).toBe(420)
  })

  it('calculates ARR from contracted MRR without treating cash as MRR', () => {
    expect(calculateArr(1_000)).toBe(12_000)
  })

  it('calculates weighted forecast from implementation value and probability', () => {
    expect(calculateForecast({ implementationValue: 800, probability: 65 })).toBe(520)
  })

  it('calculates accounts receivable from payments including partial payments', () => {
    expect(calculateInvoiceBalance({ total: 300, payments: [150, 50] })).toBe(100)
  })

  it('counts only issued, partial, and overdue invoice balances as accounts receivable', () => {
    expect(calculateAccountsReceivable([
      { total: 300, status: 'issued', payments: [100] },
      { total: 80, status: 'partial', payments: [30] },
      { total: 40, status: 'overdue', payments: [] },
      { total: 90, status: 'draft', payments: [] },
      { total: 60, status: 'paid', payments: [60] },
      { total: 70, status: 'void', payments: [] },
    ])).toBe(290)
  })

  it('rejects a payment that is zero, negative, or exceeds the current balance', () => {
    expect(validatePaymentAmount({ amount: 0, remaining: 100 })).toBe(false)
    expect(validatePaymentAmount({ amount: -1, remaining: 100 })).toBe(false)
    expect(validatePaymentAmount({ amount: 101, remaining: 100 })).toBe(false)
    expect(validatePaymentAmount({ amount: 100, remaining: 100 })).toBe(true)
  })

  it('marks an invoice paid only when collected payments cover its total', () => {
    expect(calculateInvoiceStatus({ total: 250, payments: [100, 150], dueDate: '2026-09-01', today: '2026-09-17' })).toBe('paid')
  })

  it('marks an unpaid balance past due after its due date', () => {
    expect(calculateInvoiceStatus({ total: 250, payments: [100], dueDate: '2026-09-01', today: '2026-09-17' })).toBe('overdue')
  })
})
