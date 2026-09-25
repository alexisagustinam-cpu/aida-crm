export type SubscriptionFrequency = 'monthly' | 'annual'
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'paused' | 'cancelled'

export interface SubscriptionForMrr {
  amount: number
  frequency: SubscriptionFrequency
  status: SubscriptionStatus
}

export function calculateMrr(subscriptions: SubscriptionForMrr[]): number {
  return subscriptions
    .filter((subscription) => subscription.status === 'active')
    .reduce((total, subscription) => total + subscription.amount / (subscription.frequency === 'annual' ? 12 : 1), 0)
}

export function calculateArr(mrr: number): number {
  return mrr * 12
}

export function calculateForecast({
  implementationValue,
  probability,
}: {
  implementationValue: number
  probability: number
}): number {
  return implementationValue * (probability / 100)
}

export function calculateInvoiceBalance({
  total,
  payments,
}: {
  total: number
  payments: number[]
}): number {
  return Math.max(0, total - payments.reduce((sum, payment) => sum + payment, 0))
}

export function calculateAccountsReceivable(invoices: Array<{ total: number; status: string; payments: number[] }>): number {
  return invoices
    .filter((invoice) => ['issued', 'partial', 'overdue'].includes(invoice.status))
    .reduce((total, invoice) => total + calculateInvoiceBalance(invoice), 0)
}

export function validatePaymentAmount({ amount, remaining }: { amount: number; remaining: number }): boolean {
  return Number.isFinite(amount) && amount > 0 && amount <= remaining
}

export function calculateInvoiceStatus({ total, payments, dueDate, today }: { total: number; payments: number[]; dueDate: string; today: string }): 'paid' | 'overdue' | 'open' {
  if (calculateInvoiceBalance({ total, payments }) === 0) return 'paid'
  return dueDate < today ? 'overdue' : 'open'
}
