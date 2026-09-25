import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from '@/components/layout/app-shell'
import { CommandCenter } from './command-center'

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    aside: ({ children, ...props }: React.ComponentProps<'aside'>) => <aside {...props}>{children}</aside>,
    div: ({ children, ...props }: React.ComponentProps<'div'>) => { const domProps = { ...props } as typeof props & Record<string, unknown>; delete domProps.initial; delete domProps.animate; delete domProps.exit; delete domProps.transition; return <div {...domProps}>{children}</div> },
    section: ({ children, ...props }: React.ComponentProps<'section'>) => { const domProps = { ...props } as typeof props & Record<string, unknown>; delete domProps.initial; delete domProps.animate; delete domProps.exit; delete domProps.transition; return <section {...domProps}>{children}</section> },
  },
  useReducedMotion: () => true,
}))

const readyState = {
  kind: 'ready' as const,
  data: {
    primaryDataEmpty: false,
    activeClientsCount: 0,
    cashCollectedThisMonth: 0, paymentsThisMonth: [], monthlyRevenueGoal: 0, contractedMrr: 0, activeSubscriptionsCount: 0, mrrGoal: 0,
    accountsReceivable: 0, invoicesCount: 0, openPipeline: 0, weightedPipeline: 0, openDealsCount: 0, openDealDetails: [],
    overdueFollowUps: 0, proposalsWithoutResponse: 0, overdueInvoices: 0, untouchedLeads: 0,
    expiringContracts: 0, tasksToday: 0, staleDeals: 0, overdueTasks: 0,
    leadsWithoutAction: 0, contractsExpiring30: 0, contractsExpiring14: 0, contractsExpiring7: 0,
  },
}

describe('Command Center', () => {
  it('offers real quick actions and inline KPI drill-downs instead of a duplicate search panel', async () => {
    const user = userEvent.setup()
    render(<AppShell><CommandCenter state={readyState} /></AppShell>)

    expect(screen.getByRole('heading', { name: /acciones rápidas/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /nuevo prospecto/i })).toHaveAttribute('href', '/sales/leads')
    expect(screen.getByRole('link', { name: /nueva empresa/i })).toHaveAttribute('href', '/sales/companies')
    expect(screen.getByRole('link', { name: /nuevo contacto/i })).toHaveAttribute('href', '/sales/contacts')
    expect(screen.getByRole('link', { name: /registrar cobro/i })).toHaveAttribute('href', '/finance/invoices')
    expect(screen.getByRole('button', { name: /ingresos cobrados este mes/i })).toHaveAttribute('aria-expanded', 'false')
    await user.click(screen.getByRole('button', { name: /ingresos cobrados este mes/i }))
    expect(screen.getByRole('link', { name: /ver facturas: ingresos cobrados este mes/i })).toHaveAttribute('href', '/finance/invoices')
    expect(screen.queryByText(/global search/i)).not.toBeInTheDocument()
  })

  it('shows the first-run workflow only when primary CRM data is empty', () => {
    render(<CommandCenter state={{ ...readyState, data: { ...readyState.data, primaryDataEmpty: true } }} />)
    expect(screen.getByRole('heading', { name: /cómo empezar hoy/i })).toBeInTheDocument()
    expect(screen.getByText(/crear empresa o contacto/i)).toBeInTheDocument()
  })

  it('expands a KPI inline with server-provided details instead of navigating', async () => {
    const user = userEvent.setup()
    render(<CommandCenter state={{ ...readyState, data: { ...readyState.data, cashCollectedThisMonth: 1200, paymentsThisMonth: [{ amount: 700, paidAt: '2026-09-01' }, { amount: 500, paidAt: '2026-09-02' }] } }} />)

    await user.click(screen.getByRole('button', { name: /ingresos cobrados este mes/i }))

    expect(screen.getByRole('button', { name: /ingresos cobrados este mes/i })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/2 cobros este mes/i)).toBeInTheDocument()
    expect(screen.getByText(/\$700/)).toBeInTheDocument()
  })

  it('shows revenue details in its own row disclosure without exposing MRR details', async () => {
    const user = userEvent.setup()
    render(<CommandCenter state={{ ...readyState, data: { ...readyState.data, cashCollectedThisMonth: 1200, paymentsThisMonth: [{ amount: 1200, paidAt: '2026-09-01' }], contractedMrr: 350, activeSubscriptionsCount: 3 } }} />)

    await user.click(screen.getByRole('button', { name: /ingresos cobrados este mes/i }))

    const revenueDetails = screen.getByRole('region', { name: /detalle de ingresos cobrados este mes/i })
    expect(revenueDetails).toHaveTextContent('1 cobros este mes.')
    expect(revenueDetails).not.toHaveTextContent('3 suscripciones activas')
    expect(screen.queryByRole('region', { name: /detalle de mrr contratado/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /mrr contratado/i }))
    const mrrDetails = screen.getByRole('region', { name: /detalle de mrr contratado/i })
    expect(mrrDetails).toHaveTextContent('3 suscripciones activas. MRR normalizado: $350.')
    expect(screen.queryByRole('region', { name: /detalle de ingresos cobrados este mes/i })).not.toBeInTheDocument()
  })

  it('keeps pipeline disclosure content independent from the other compact cards', async () => {
    const user = userEvent.setup()
    render(<CommandCenter state={{ ...readyState, data: { ...readyState.data, invoicesCount: 7, accountsReceivable: 900, openPipeline: 2000, weightedPipeline: 600, openDealsCount: 2 } }} />)

    await user.click(screen.getByRole('button', { name: /pipeline abierto/i }))

    const pipelineDetails = screen.getByRole('region', { name: /detalle de pipeline abierto/i })
    expect(pipelineDetails).toHaveTextContent('2 oportunidades abiertas.')
    expect(pipelineDetails).not.toHaveTextContent('7 facturas emitidas')
    expect(pipelineDetails).not.toHaveTextContent('Forecast ponderado')
  })

  it('persists dismissal of the first-run workflow', async () => {
    const user = userEvent.setup()
    render(<CommandCenter state={{ ...readyState, data: { ...readyState.data, primaryDataEmpty: true } }} />)

    await user.click(screen.getByRole('button', { name: /cerrar primeros pasos/i }))

    expect(localStorage.getItem('automai:dashboard-onboarding-dismissed')).toBe('true')
    expect(screen.queryByRole('heading', { name: /cómo empezar hoy/i })).not.toBeInTheDocument()

    render(<CommandCenter state={{ ...readyState, data: { ...readyState.data, primaryDataEmpty: true } }} />)
    expect(screen.queryByRole('heading', { name: /cómo empezar hoy/i })).not.toBeInTheDocument()
  })
})
