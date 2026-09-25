'use server'

import { redirect } from 'next/navigation'
import { getOrganizationContext } from '@/lib/supabase/context'

export async function createAutomaiOrganization() {
  const { supabase, organizationId } = await getOrganizationContext()
  if (organizationId) redirect('/dashboard')
  const { error } = await supabase.rpc('create_organization_for_owner', { organization_name: 'AutomAI Labs', organization_slug: 'automai-labs' })
  if (error) redirect('/setup?error=No+se+pudo+crear+la+organización')
  redirect('/dashboard')
}
