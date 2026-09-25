import type { Role } from './permissions'

export type SalesPermission = 'crm.read' | 'crm.write' | 'tasks.read' | 'tasks.write' | 'diagnostics.read' | 'diagnostics.write'

const permissions: Record<Role, readonly SalesPermission[]> = {
  owner: ['crm.read', 'crm.write', 'tasks.read', 'tasks.write', 'diagnostics.read', 'diagnostics.write'],
  admin: ['crm.read', 'crm.write', 'tasks.read', 'tasks.write', 'diagnostics.read', 'diagnostics.write'],
  sales: ['crm.read', 'crm.write', 'tasks.read', 'tasks.write', 'diagnostics.read', 'diagnostics.write'],
  operations: ['crm.read', 'tasks.read', 'tasks.write'],
  finance: ['tasks.read'],
  viewer: ['crm.read', 'tasks.read', 'diagnostics.read'],
}

export function canAccessSalesAction(role: Role, permission: SalesPermission): boolean {
  return permissions[role].includes(permission)
}
