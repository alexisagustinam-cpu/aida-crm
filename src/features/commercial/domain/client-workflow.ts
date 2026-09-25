export type ClientWorkflowInput = {
  hasWonDeal: boolean
  agreements: Array<{ value: number; documentUrl: string | null }>
  invoices: Array<{ total: number; payments: number[] }>
  projects: unknown[]
}

export function clientWorkflowSummary(input: ClientWorkflowInput) {
  const contracted = input.agreements.reduce((sum, agreement) => sum + Number(agreement.value), 0)
  const collected = input.invoices.reduce((sum, invoice) => sum + invoice.payments.reduce((paid, amount) => paid + Number(amount), 0), 0)
  const billed = input.invoices.reduce((sum, invoice) => sum + Number(invoice.total), 0)
  const balance = Math.max(0, Math.max(contracted, billed) - collected)

  if (!input.hasWonDeal && input.agreements.length === 0) return { status: 'Prospecto', contracted, collected, balance, nextStep: 'Continuar venta' }
  if (input.agreements.length === 0) return { status: 'Cliente pendiente de acuerdo', contracted, collected, balance, nextStep: 'Registrar acuerdo' }
  if (balance > 0) return { status: 'Pago pendiente', contracted, collected, balance, nextStep: 'Registrar pago' }
  if (input.projects.length === 0) return { status: 'Pagado · pendiente de proyecto', contracted, collected, balance, nextStep: 'Crear proyecto' }
  return { status: 'Proyecto en curso', contracted, collected, balance, nextStep: 'Ver proyecto' }
}
