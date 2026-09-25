import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SaveNotice } from './save-notice'

describe('SaveNotice', () => {
  it('shows a green confirmation with the saved outcome', () => {
    render(<SaveNotice message="Empresa guardada correctamente" />)

    expect(screen.getByRole('status')).toHaveTextContent('Empresa guardada correctamente')
    expect(screen.getByRole('status')).toHaveClass('border-emerald-500')
  })
})
