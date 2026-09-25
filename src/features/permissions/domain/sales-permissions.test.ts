import { describe, expect, it } from 'vitest'
import { canAccessSalesAction } from './sales-permissions'

describe('Sales Core authorization', () => {
  it('allows CRM writes only for owner, admin, and sales roles', () => {
    expect(canAccessSalesAction('owner', 'crm.write')).toBe(true)
    expect(canAccessSalesAction('sales', 'crm.write')).toBe(true)
    expect(canAccessSalesAction('viewer', 'crm.write')).toBe(false)
  })

  it('allows task completion to operations but not CRM writes', () => {
    expect(canAccessSalesAction('operations', 'tasks.write')).toBe(true)
    expect(canAccessSalesAction('operations', 'crm.write')).toBe(false)
  })
})
