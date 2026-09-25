import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CompanyRowActions } from './company-row-actions'

describe('CompanyRowActions', () => {
  const action = async () => {}

  it('offers icon-only edit, archive and delete actions without entering the company', () => {
    render(
      <CompanyRowActions
        company={{ id: 'e1d1d1d1-1111-4111-8111-111111111111', name: 'Cabane', industry: 'Restaurantes y cafeterías' }}
        updateAction={action}
        archiveAction={action}
        deleteAction={action}
      />,
    )

    expect(screen.getByRole('button', { name: 'Editar Cabane' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Archivar Cabane' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar Cabane' })).toBeInTheDocument()
    expect(screen.queryByText('Editar empresa')).not.toBeInTheDocument()
  })
})
