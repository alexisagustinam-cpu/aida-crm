import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ActionFeedbackForm } from './action-feedback-form'

describe('ActionFeedbackForm', () => {
  it('announces a confirmed success only after its server action resolves', async () => {
    const action = vi.fn().mockResolvedValue(undefined)

    render(<ActionFeedbackForm action={action} successMessage="Actividad guardada correctamente"><input name="title" defaultValue="Llamada inicial" /><button>Guardar</button></ActionFeedbackForm>)
    fireEvent.submit(screen.getByRole('button', { name: 'Guardar' }).closest('form')!)

    await waitFor(() => expect(action).toHaveBeenCalled())
    expect(await screen.findByRole('status')).toHaveTextContent('Actividad guardada correctamente')
  })

  it('shows a useful error and preserves the entered value when its action fails', async () => {
    const action = vi.fn().mockRejectedValue(new Error('Datos inválidos.'))

    render(<ActionFeedbackForm action={action} successMessage="Actividad guardada correctamente"><input name="title" defaultValue="Llamada inicial" /><button>Guardar</button></ActionFeedbackForm>)
    fireEvent.submit(screen.getByRole('button', { name: 'Guardar' }).closest('form')!)

    expect(await screen.findByRole('alert')).toHaveTextContent('Datos inválidos.')
    expect(screen.getByDisplayValue('Llamada inicial')).toBeVisible()
  })
})
