import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AutomationCenter } from './automation-center'

vi.mock('@/app/actions/operations', () => ({ createAutomation: vi.fn() }))

describe('AutomationCenter', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('prepares the n8n preset and moves focus to its webhook endpoint', async () => {
    const user = userEvent.setup()
    render(<AutomationCenter automations={[]} />)

    await user.click(screen.getByRole('button', { name: /preparar evento n8n/i }))

    expect(screen.getByLabelText('Nombre')).toHaveValue('n8n · Oportunidad ganada')
    expect(screen.getByLabelText('Evento')).toHaveValue('deal.won')
    await waitFor(() => expect(screen.getByLabelText('Endpoint HTTPS')).toHaveFocus())
  })

  it('opens an accessible WhatsApp requirements dialog with a copyable checklist', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    render(<AutomationCenter automations={[]} />)

    await user.click(screen.getAllByRole('button', { name: /ver requisitos/i })[0])
    expect(screen.getByRole('dialog', { name: /configurar whatsapp business api/i })).toBeVisible()
    expect((screen.getByLabelText('Checklist de configuración') as HTMLTextAreaElement).value).toContain('Meta Business')

    await user.click(screen.getByRole('button', { name: /copiar checklist/i }))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('WhatsApp Business API'))
    expect(screen.getByText('Checklist copiado.')).toBeVisible()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens Hermes requirements without offering credential storage', async () => {
    const user = userEvent.setup()
    render(<AutomationCenter automations={[]} />)

    await user.click(screen.getAllByRole('button', { name: /ver requisitos/i })[1])

    expect(screen.getByRole('dialog', { name: /configurar hermes ai/i })).toBeVisible()
    expect(screen.getByText(/no ingreses claves en este crm/i)).toBeVisible()
    expect((screen.getByLabelText('Checklist de configuración') as HTMLTextAreaElement).value).toContain('endpoint HTTPS de Hermes AI')
  })

  it('states that saved webhooks have no connected delivery engine', () => {
    render(<AutomationCenter automations={[{ id: 'a1', name: 'Webhook de prueba', event_type: 'deal.won', webhook_url: 'https://hooks.example.com', status: 'active', last_error: null }]} />)

    expect(screen.getAllByText(/configurado; motor de entrega no conectado/i)).toHaveLength(2)
  })
})
