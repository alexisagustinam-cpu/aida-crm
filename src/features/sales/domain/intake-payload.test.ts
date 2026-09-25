import { describe, expect, it } from 'vitest'
import { companyIntakePayload, contactIntakePayload } from './intake-payload'

describe('intake payloads', () => {
  it('maps all optional company intake fields to the existing company schema', () => {
    expect(companyIntakePayload({ name: 'AutomAI', industry: 'Tecnología y software', phone: '593', whatsapp: '593', city: 'Quito', email: 'ops@automai.test', website: 'https://automai.test', legalName: 'AutomAI S.A.', taxId: '1790012345001', instagramUrl: 'https://instagram.com/automai', facebookUrl: 'https://facebook.com/automai', linkedinUrl: 'https://linkedin.com/company/automai' })).toEqual({
      name: 'AutomAI', industry: 'Tecnología y software', phone: '593', whatsapp: '593', city: 'Quito', email: 'ops@automai.test', website: 'https://automai.test', legal_name: 'AutomAI S.A.', tax_id: '1790012345001', instagram_url: 'https://instagram.com/automai', facebook_url: 'https://facebook.com/automai', linkedin_url: 'https://linkedin.com/company/automai',
    })
  })

  it('maps optional contact channels and influence to the existing contact schema', () => {
    expect(contactIntakePayload({ firstName: 'Ana', lastName: 'Ruiz', companyId: undefined, email: undefined, phone: '593', whatsapp: '593', preferredChannel: 'whatsapp', influence: 'decision_maker', jobTitle: 'Gerente' })).toEqual({
      first_name: 'Ana', last_name: 'Ruiz', company_id: undefined, email: undefined, phone: '593', whatsapp: '593', preferred_channel: 'whatsapp', influence: 'decision_maker', job_title: 'Gerente',
    })
  })
})
