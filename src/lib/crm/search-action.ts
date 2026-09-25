'use server'

import { requireMember } from '@/lib/auth/member'
import { searchCrm } from './queries'

export type SearchResults = Awaited<ReturnType<typeof searchCrm>>

export async function searchAction(q: string): Promise<SearchResults> {
  await requireMember()
  return searchCrm(q.slice(0, 80))
}
