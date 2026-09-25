import { describe, expect, it } from 'vitest'
import {
  convertLeadSchema,
  diagnosticAnswerSchema,
  diagnosticProblemSchema,
  quickLeadSchema,
  stageUpdateSchema,
  taskCompletionSchema,
  taskSchema,
} from './validation'
import * as validation from './validation'

describe('Sales Core validation', () => {
  it('validates a manual company with a required name and normalized optional fields', () => {
    const companyCreateSchema = validation.companyCreateSchema as { parse: (value: unknown) => unknown; safeParse: (value: unknown) => { success: boolean } }
    expect(companyCreateSchema.parse({ name: '  AutomAI  ', industry: ' Tecnología y software ', whatsapp: ' 555 ', city: ' Quito ', legalName: ' AutomAI S.A. ', taxId: ' 1790012345001 ', instagramUrl: 'https://instagram.com/automai', facebookUrl: 'https://facebook.com/automai', linkedinUrl: 'https://linkedin.com/company/automai', email: 'ops@automai.test', phone: ' 555 ', website: 'https://automai.test ' })).toMatchObject({
      name: 'AutomAI', industry: 'Tecnología y software', whatsapp: '555', city: 'Quito', legalName: 'AutomAI S.A.', taxId: '1790012345001', instagramUrl: 'https://instagram.com/automai', facebookUrl: 'https://facebook.com/automai', linkedinUrl: 'https://linkedin.com/company/automai', email: 'ops@automai.test', phone: '555', website: 'https://automai.test',
    })
    expect(companyCreateSchema.safeParse({ name: ' ' }).success).toBe(false)
    expect(companyCreateSchema.safeParse({ name: 'AutomAI', industry: 'SaaS' }).success).toBe(false)
  })

  it('validates a manual contact with a required first name and optional company', () => {
    const contactCreateSchema = validation.contactCreateSchema as { parse: (value: unknown) => unknown; safeParse: (value: unknown) => { success: boolean } }
    expect(contactCreateSchema.parse({ firstName: ' Ana ', lastName: ' Ruiz ', companyId: '', whatsapp: ' 555 ', preferredChannel: 'whatsapp', influence: 'decision_maker', email: 'ana@example.test' })).toMatchObject({
      firstName: 'Ana', lastName: 'Ruiz', companyId: undefined, whatsapp: '555', preferredChannel: 'whatsapp', influence: 'decision_maker', email: 'ana@example.test',
    })
    expect(contactCreateSchema.safeParse({ firstName: ' ' }).success).toBe(false)
  })

  it('accepts a minimal quick lead and trims its company and contact', () => {
    expect(quickLeadSchema.parse({ companyName: '  AutomAI  ', firstName: '  Ana ' })).toMatchObject({
      companyName: 'AutomAI', firstName: 'Ana',
    })
  })

  it('rejects a quick lead without a company or contact', () => {
    expect(quickLeadSchema.safeParse({ companyName: '', firstName: '' }).success).toBe(false)
  })

  it('requires identifiers and a valid monetary amount when converting a lead', () => {
    expect(convertLeadSchema.safeParse({ leadId: 'not-a-uuid', pipelineId: 'also-not', stageId: 'nope', name: '', implementationValue: '-1' }).success).toBe(false)
  })

  it('accepts only valid pipeline-stage updates', () => {
    expect(stageUpdateSchema.safeParse({ dealId: 'a', stageId: 'b' }).success).toBe(false)
  })

  it('rejects a task title that is blank', () => {
    expect(taskSchema.safeParse({ title: '   ' }).success).toBe(false)
  })

  it('parses the literal false task form value as a reopen request', () => {
    expect(taskCompletionSchema.parse({ id: '00000000-0000-4000-8000-000000000001', completed: 'false' })).toEqual({
      id: '00000000-0000-4000-8000-000000000001', completed: false,
    })
  })

  it('accepts an existing company and optional existing contact for a quick lead', () => {
    expect(quickLeadSchema.parse({ companyMode: 'existing', companyId: '00000000-0000-4000-8000-000000000001', contactId: '00000000-0000-4000-8000-000000000002' })).toMatchObject({
      companyMode: 'existing', companyId: '00000000-0000-4000-8000-000000000001', contactId: '00000000-0000-4000-8000-000000000002',
    })
  })

  it('requires a question key for a diagnostic answer and a severity for a problem', () => {
    expect(diagnosticAnswerSchema.safeParse({ diagnosticId: 'not-a-uuid', questionKey: '' }).success).toBe(false)
    expect(diagnosticProblemSchema.safeParse({ diagnosticId: 'not-a-uuid', description: '', severity: 'urgent' }).success).toBe(false)
  })
})
