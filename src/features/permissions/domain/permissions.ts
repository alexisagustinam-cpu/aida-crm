export const roleKeys = ['owner', 'admin', 'sales', 'operations', 'finance', 'viewer'] as const
export type Role = (typeof roleKeys)[number]

export const permissionKeys = [
  'companies:read',
  'companies:write',
  'contacts:read',
  'contacts:write',
  'deals:read',
  'deals:write',
  'activities:read',
  'activities:write',
  'tasks:read',
  'tasks:write',
  'projects:read',
  'projects:write',
  'invoices:read',
  'invoices:write',
  'revenue:read',
  'roles:write',
  'integrations:write',
  'audit:read',
  'records:delete',
] as const

export type Permission = (typeof permissionKeys)[number]

const permissionsByRole: Record<Role, readonly Permission[]> = {
  owner: permissionKeys,
  admin: [
    'companies:read', 'companies:write', 'contacts:read', 'contacts:write',
    'deals:read', 'deals:write', 'activities:read', 'activities:write',
    'tasks:read', 'tasks:write', 'projects:read', 'projects:write',
    'invoices:read', 'invoices:write', 'revenue:read', 'audit:read',
  ],
  sales: [
    'companies:read', 'companies:write', 'contacts:read', 'contacts:write',
    'deals:read', 'deals:write', 'activities:read', 'activities:write',
    'tasks:read', 'tasks:write',
  ],
  operations: ['companies:read', 'contacts:read', 'tasks:read', 'tasks:write', 'projects:read', 'projects:write'],
  finance: ['companies:read', 'invoices:read', 'invoices:write', 'revenue:read', 'tasks:read'],
  viewer: ['companies:read', 'contacts:read', 'deals:read', 'activities:read', 'tasks:read', 'projects:read'],
}

export function can(role: Role, permission: Permission): boolean {
  return permissionsByRole[role].includes(permission)
}
