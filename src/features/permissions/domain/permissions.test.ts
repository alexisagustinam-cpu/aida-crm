import { describe, expect, it } from 'vitest'
import { can, type Role } from './permissions'

describe('permission matrix', () => {
  it('allows Sales to manage sales records but not financial records', () => {
    expect(can('sales', 'deals:write')).toBe(true)
    expect(can('sales', 'invoices:read')).toBe(false)
  })

  it('allows Finance to access revenue but not change system roles', () => {
    expect(can('finance', 'revenue:read')).toBe(true)
    expect(can('finance', 'roles:write')).toBe(false)
  })

  it('reserves role changes and destructive records for Owner', () => {
    const roles: Role[] = ['owner', 'admin', 'sales', 'operations', 'finance', 'viewer']

    expect(roles.filter((role) => can(role, 'roles:write'))).toEqual(['owner'])
    expect(roles.filter((role) => can(role, 'records:delete'))).toEqual(['owner'])
  })
})
