import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandPalette } from './command-palette'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

describe('CommandPalette', () => {
  beforeEach(() => {
    push.mockReset()
    vi.restoreAllMocks()
  })

  it('opens from an explicit topbar callback and focuses the query field', async () => {
    const user = userEvent.setup()
    render(<CommandPalette open onOpenChange={vi.fn()} />)

    const input = screen.getByRole('combobox', { name: 'Buscar CRM' })
    await waitFor(() => expect(input).toHaveFocus())
    await user.type(input, 'Acme')

    expect(input).toHaveValue('Acme')
  })

  it('keeps the dialog mounted through its closing animation while returning focus', async () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    const returnFocusRef = { current: trigger }
    const { rerender } = render(<CommandPalette open onOpenChange={vi.fn()} returnFocusRef={returnFocusRef} />)

    const input = screen.getByRole('combobox', { name: 'Buscar CRM' })
    await waitFor(() => expect(input).toHaveFocus())
    fireEvent.keyDown(input, { key: 'Escape' })
    rerender(<CommandPalette open={false} onOpenChange={vi.fn()} returnFocusRef={returnFocusRef} />)

    expect(screen.getByRole('dialog', { name: 'Buscar CRM' })).toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('shows a safe error state when search fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })))
    const user = userEvent.setup()
    render(<CommandPalette open onOpenChange={vi.fn()} />)

    await user.type(screen.getByRole('combobox', { name: 'Buscar CRM' }), 'Acme')

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos completar la búsqueda')
  })

  it('navigates the active result with ArrowDown and Enter', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [
      { label: 'Acme', href: '/sales/companies/acme', kind: 'Empresa' },
      { label: 'Ada', href: '/sales/contacts/ada', kind: 'Contacto' },
    ] }), { status: 200 })))
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<CommandPalette open onOpenChange={onOpenChange} />)

    const input = screen.getByRole('combobox', { name: 'Buscar CRM' })
    await user.type(input, 'Acme')
    await screen.findByRole('option', { name: /Acme Empresa/i })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(push).toHaveBeenCalledWith('/sales/contacts/ada')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
