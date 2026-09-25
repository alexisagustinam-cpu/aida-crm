import { describe, expect, it } from 'vitest'
import { companyRemovalDecision } from './record-removal'

describe('company removal guard', () => {
  it('only permits permanent deletion with no dependent records', () => {
    expect(companyRemovalDecision({ deals: 0, projects: 0, invoices: 0, contacts: 0 })).toEqual({ allowed: true })
    expect(companyRemovalDecision({ deals: 1, projects: 0, invoices: 0, contacts: 0 })).toEqual({ allowed: false, reason: 'No se puede eliminar permanentemente: la empresa tiene registros vinculados. Archívala en su lugar.' })
  })
})
