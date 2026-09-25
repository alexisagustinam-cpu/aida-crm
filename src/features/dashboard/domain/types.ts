export type CommandCenterData = {
  primaryDataEmpty: boolean
  activeClientsCount: number
  cashCollectedThisMonth: number
  paymentsThisMonth: Array<{ amount: number; paidAt: string }>
  monthlyRevenueGoal: number
  contractedMrr: number
  activeSubscriptionsCount: number
  mrrGoal: number
  accountsReceivable: number
  invoicesCount: number
  openPipeline: number
  weightedPipeline: number
  openDealsCount: number
  openDealDetails: Array<{ id: string; name: string; implementationValue: number; weightedValue: number; nextActionAt: string | null }>
  overdueFollowUps: number
  proposalsWithoutResponse: number
  overdueInvoices: number
  untouchedLeads: number
  expiringContracts: number
  tasksToday: number
  staleDeals: number
  contractsExpiring30: number
  contractsExpiring14: number
  contractsExpiring7: number
  overdueTasks: number
  leadsWithoutAction: number
}

export type DashboardState =
  | { kind: 'ready'; data: CommandCenterData }
  | { kind: 'needs_supabase' }
  | { kind: 'needs_organization' }
