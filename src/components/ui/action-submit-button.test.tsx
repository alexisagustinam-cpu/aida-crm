import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { useFormStatus } = vi.hoisted(() => ({ useFormStatus: vi.fn() }))

vi.mock('react-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-dom')>()),
  useFormStatus,
}))

import { ActionSubmitButton } from './action-submit-button'

describe('ActionSubmitButton', () => {
  it('announces and prevents a duplicate submission while its form is pending', () => {
    useFormStatus.mockReturnValue({ pending: true, data: null, method: 'post', action: null })

    render(<ActionSubmitButton>Guardar oportunidad</ActionSubmitButton>)

    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Guardando…')
  })
})
