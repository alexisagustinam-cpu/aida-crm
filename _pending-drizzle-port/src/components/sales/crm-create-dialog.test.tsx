import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CrmCreateDialog } from './crm-create-dialog'

describe('CrmCreateDialog', () => {
  const action = async () => {}

  it('opens an accessible company form from the primary action', async () => {
    const user = userEvent.setup()
    render(<CrmCreateDialog entity="company" action={action} companies={[]} />)

    await user.click(screen.getByRole('button', { name: /nueva empresa/i }))
    expect(screen.getByRole('dialog', { name: /nueva empresa/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/^nombre de la empresa/i)).toBeRequired()
    expect(screen.getByLabelText(/^industria/i)).toHaveAccessibleName('Industria')
    expect(screen.getByLabelText(/^industria/i).tagName).toBe('SELECT')
    expect(screen.getByRole('option', { name: 'Tecnología y software' })).toBeInTheDocument()
    expect(screen.getByText(/información adicional/i).closest('details')).not.toHaveAttribute('open')
    await waitFor(() => expect(screen.getByText(/una empresa es una cuenta de negocio/i)).toBeVisible())

    await user.click(screen.getByText(/información adicional/i))
    expect(screen.getByLabelText(/sitio web/i)).toHaveAttribute('name', 'website')
    expect(screen.getByLabelText(/razón social/i)).toHaveAttribute('name', 'legalName')
    expect(screen.getByLabelText(/ruc/i)).toHaveAttribute('name', 'taxId')
  })

  it('offers an optional company selector in the contact form', async () => {
    const user = userEvent.setup()
    render(<CrmCreateDialog entity="contact" action={action} companies={[{ id: 'e1d1d1d1-1111-4111-8111-111111111111', name: 'AutomAI' }]} />)

    await user.click(screen.getByRole('button', { name: /nuevo contacto/i }))
    expect(screen.getByRole('dialog', { name: /nuevo contacto/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/^nombre$/i)).toBeRequired()
    expect(screen.getByLabelText(/empresa asociada \(opcional\)/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/persona que todavía no está vinculada/i)).toBeVisible())
    expect(screen.getByText(/información adicional/i).closest('details')).not.toHaveAttribute('open')
    expect(screen.getByRole('option', { name: 'AutomAI' })).toHaveValue('e1d1d1d1-1111-4111-8111-111111111111')

    await user.click(screen.getByText(/información adicional/i))
    expect(screen.getByLabelText(/^whatsapp/i)).toHaveAttribute('name', 'whatsapp')
    expect(screen.getByLabelText(/canal de contacto preferido/i)).toHaveAttribute('name', 'preferredChannel')
    expect(screen.getByLabelText(/rol e influencia/i)).toHaveAttribute('name', 'influence')
  })

  it('closes with Escape so keyboard users can leave the dialog', async () => {
    const user = userEvent.setup()
    render(<CrmCreateDialog entity="company" action={action} companies={[]} />)

    await user.click(screen.getByRole('button', { name: /nueva empresa/i }))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('returns focus to the trigger after closing from the backdrop', async () => {
    const user = userEvent.setup()
    render(<CrmCreateDialog entity="company" action={action} companies={[]} />)

    const trigger = screen.getByRole('button', { name: /nueva empresa/i })
    await user.click(trigger)
    await user.click(screen.getByTestId('crm-dialog-backdrop'))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
  })
})
