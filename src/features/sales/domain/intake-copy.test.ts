import { describe, expect, it } from 'vitest'
import { CRM_INTAKE_COPY } from './intake-copy'

describe('CRM intake copy', () => {
  it('explains companies as business accounts and contacts as people in Spanish', () => {
    expect(CRM_INTAKE_COPY.company.empty).toMatch(/cuenta de negocio/i)
    expect(CRM_INTAKE_COPY.contact.empty).toMatch(/persona/i)
  })
})
