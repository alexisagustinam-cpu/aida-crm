const transitions: Record<string, Record<string, string[]>> = {
  proposal: { draft: ['sent'], sent: ['accepted', 'rejected', 'expired'], accepted: [], rejected: [], expired: [] },
  contract: { draft: ['active', 'cancelled'], active: ['expired', 'cancelled'], expired: [], cancelled: [] },
  project: { planned: ['active', 'on_hold', 'cancelled'], active: ['on_hold', 'completed', 'cancelled'], on_hold: ['active', 'cancelled'], completed: [], cancelled: [] },
  deliverable: { not_started: ['in_progress', 'blocked'], in_progress: ['review', 'completed', 'blocked'], review: ['in_progress', 'completed', 'blocked'], completed: [], blocked: ['in_progress'] },
}

function canTransition(kind: keyof typeof transitions, from: string, to: string) {
  return from === to || transitions[kind][from]?.includes(to) === true
}

export const canTransitionProposal = (from: string, to: string) => canTransition('proposal', from, to)
export const canTransitionContract = (from: string, to: string) => canTransition('contract', from, to)
export const canTransitionProject = (from: string, to: string) => canTransition('project', from, to)
export const canTransitionDeliverable = (from: string, to: string) => canTransition('deliverable', from, to)
