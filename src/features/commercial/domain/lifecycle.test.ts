import { describe, expect, it } from 'vitest'
import { canTransitionContract, canTransitionDeliverable, canTransitionProject, canTransitionProposal } from './lifecycle'

describe('commercial lifecycle transitions', () => {
  it('allows only schema-backed proposal transitions', () => {
    expect(canTransitionProposal('draft', 'sent')).toBe(true)
    expect(canTransitionProposal('sent', 'accepted')).toBe(true)
    expect(canTransitionProposal('draft', 'accepted')).toBe(false)
  })

  it('allows activation and closure of a contract', () => {
    expect(canTransitionContract('draft', 'active')).toBe(true)
    expect(canTransitionContract('active', 'expired')).toBe(true)
  })

  it('allows projects and deliverables to progress through their actual enums', () => {
    expect(canTransitionProject('planned', 'active')).toBe(true)
    expect(canTransitionProject('active', 'completed')).toBe(true)
    expect(canTransitionDeliverable('not_started', 'in_progress')).toBe(true)
    expect(canTransitionDeliverable('review', 'completed')).toBe(true)
  })
})
