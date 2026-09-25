import { describe, expect, it } from 'vitest'
import { automationSchema, commandSearchSchema, goalSchema, hermesIntentSchema } from './validation'

describe('operations validation', () => {
  it('accepts an enabled automation only with an HTTPS endpoint', () => {
    expect(automationSchema.safeParse({ name: 'Deal won', eventType: 'deal.won', endpoint: 'https://hooks.example.com/crm', enabled: true }).success).toBe(true)
    expect(automationSchema.safeParse({ name: 'Deal won', eventType: 'deal.won', endpoint: '', enabled: true }).success).toBe(false)
  })
  it('limits command search to a useful query', () => {
    expect(commandSearchSchema.safeParse({ query: 'acme' }).success).toBe(true)
    expect(commandSearchSchema.safeParse({ query: ' ' }).success).toBe(false)
  })
  it('requires explicit confirmation for Hermes mutation intents', () => {
    expect(hermesIntentSchema.safeParse({ tool: 'create_task', payload: {}, confirmed: false }).success).toBe(false)
    expect(hermesIntentSchema.safeParse({ tool: 'create_task', payload: {}, confirmed: true }).success).toBe(true)
  })
  it('accepts non-negative monthly goals', () => {
    expect(goalSchema.safeParse({ monthlyRevenueGoal: 5000, mrrGoal: 1200 }).success).toBe(true)
    expect(goalSchema.safeParse({ monthlyRevenueGoal: -1, mrrGoal: 0 }).success).toBe(false)
  })
})
