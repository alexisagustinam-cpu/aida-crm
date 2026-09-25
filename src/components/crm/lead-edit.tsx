'use client'

import { OpportunityDialog } from './forms'

type Props = Parameters<typeof OpportunityDialog>[0]
export function LeadEditButton({ opportunity, clients }: { opportunity: NonNullable<Props['opportunity']>; clients: Props['clients'] }) {
  return <OpportunityDialog opportunity={opportunity} clients={clients} trigger="Editar" triggerClassName="icon-action" />
}
