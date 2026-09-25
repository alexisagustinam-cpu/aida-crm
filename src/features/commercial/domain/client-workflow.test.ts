import { describe, expect, it } from 'vitest'
import { clientWorkflowSummary } from './client-workflow'

describe('client workflow summary', () => {
  it('routes a won client with no agreement to the agreement step', () => {
    expect(clientWorkflowSummary({ hasWonDeal: true, agreements: [], invoices: [], projects: [] })).toMatchObject({
      status: 'Cliente pendiente de acuerdo',
      nextStep: 'Registrar acuerdo',
      balance: 0,
    })
  })

  it('calculates collected balance and routes a client with a paid agreement to project setup', () => {
    expect(clientWorkflowSummary({
      hasWonDeal: true,
      agreements: [{ value: 500, documentUrl: 'contracts/cabane.pdf' }],
      invoices: [{ total: 500, payments: [250, 250] }],
      projects: [],
    })).toMatchObject({
      status: 'Pagado · pendiente de proyecto',
      contracted: 500,
      collected: 500,
      balance: 0,
      nextStep: 'Crear proyecto',
    })
  })

  it('routes a client with a pending balance to register payment', () => {
    expect(clientWorkflowSummary({
      hasWonDeal: true,
      agreements: [{ value: 500, documentUrl: null }],
      invoices: [{ total: 500, payments: [250] }],
      projects: [],
    })).toMatchObject({ nextStep: 'Registrar pago', balance: 250 })
  })
})
