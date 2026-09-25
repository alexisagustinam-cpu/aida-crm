type AlertSource = { deals: Array<{ status: string; last_contact_at: string | null }>; invoices: Array<{ status: string; due_date: string }>; contracts: Array<{ status: string; ends_on: string | null }>; tasks: Array<{ status: string; due_at: string | null }>; leads: Array<{ status: string; next_action_at: string | null }> }
export function countAttentionAlerts(source: AlertSource, now = new Date()) {
  const day = 86_400_000
  const daysUntil = (date: string) => Math.ceil((new Date(`${date}T00:00:00Z`).getTime() - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / day)
  return {
    staleDeals: source.deals.filter((deal) => deal.status === 'open' && (!deal.last_contact_at || now.getTime() - new Date(deal.last_contact_at).getTime() > 14 * day)).length,
    overdueInvoices: source.invoices.filter((invoice) => !['paid', 'void'].includes(invoice.status) && daysUntil(invoice.due_date) < 0).length,
    contractsExpiring30: source.contracts.filter((contract) => contract.status === 'active' && contract.ends_on && daysUntil(contract.ends_on) === 30).length,
    contractsExpiring14: source.contracts.filter((contract) => contract.status === 'active' && contract.ends_on && daysUntil(contract.ends_on) === 14).length,
    contractsExpiring7: source.contracts.filter((contract) => contract.status === 'active' && contract.ends_on && daysUntil(contract.ends_on) === 7).length,
    overdueTasks: source.tasks.filter((task) => task.status !== 'completed' && task.due_at && new Date(task.due_at).getTime() < now.getTime()).length,
    leadsWithoutAction: source.leads.filter((lead) => lead.status !== 'converted' && !lead.next_action_at).length,
  }
}
