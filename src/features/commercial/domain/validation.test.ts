import { describe, expect, it } from 'vitest'
import { contractScheduleSchema, invoiceSchema, paymentSchema, projectSchema, proposalSchema, subscriptionSchema } from './validation'

const id = '550e8400-e29b-41d4-a716-446655440000'

describe('Commercial and delivery validation', () => {
  it('requires a client, title and a positive proposal item quantity', () => {
    expect(proposalSchema.safeParse({ companyId: id, title: 'Propuesta CRM', items: [{ description: 'Implementación', quantity: 0, unitPrice: 100 }] }).success).toBe(false)
  })

  it('accepts a scoped project with a valid client', () => {
    expect(projectSchema.safeParse({ companyId: id, name: 'Implementación CRM', startDate: '2026-09-17' }).success).toBe(true)
  })

  it('rejects an invoice whose due date precedes its issue date', () => {
    expect(invoiceSchema.safeParse({ companyId: id, issueDate: '2026-09-17', dueDate: '2026-09-16', items: [{ description: 'Servicio', quantity: 1, unitPrice: 100 }] }).success).toBe(false)
  })

  it('accepts only a positive active monthly subscription amount', () => {
    expect(subscriptionSchema.safeParse({ companyId: id, name: 'Soporte', amount: 0, frequency: 'monthly', status: 'active', startDate: '2026-09-17' }).success).toBe(false)
  })

  it('requires a real payment date and method', () => {
    expect(paymentSchema.safeParse({ invoiceId: id, amount: 10, paidAt: '2026-09-17', method: 'cash' }).success).toBe(true)
    expect(paymentSchema.safeParse({ invoiceId: id, amount: 10, method: 'cash' }).success).toBe(false)
  })

  it('exige monto positivo y una cuota por fecha en el contrato', () => {
    const base = { companyId: id, title: 'Acuerdo Cabane', startsOn: '2026-09-17', dueDates: ['2026-09-17'], amounts: ['500'] }
    expect(contractScheduleSchema.safeParse({ ...base, total: 0 }).success).toBe(false)
    expect(contractScheduleSchema.safeParse({ ...base, total: 500 }).success).toBe(true)
    // Una fecha sin su monto deja el calendario descuadrado.
    expect(contractScheduleSchema.safeParse({ ...base, total: 500, dueDates: ['2026-09-17', '2026-10-17'] }).success).toBe(false)
  })
})
