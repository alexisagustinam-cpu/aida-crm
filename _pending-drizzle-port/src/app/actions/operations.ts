'use server'

import { revalidatePath } from 'next/cache'
import { automationSchema, goalSchema, hermesIntentSchema } from '@/features/operations/domain/validation'
import { getOrganizationContext } from '@/lib/supabase/context'
import { safeAction } from '@/lib/actions/safe-action'

async function context() { const value = await getOrganizationContext(); if (!value.organizationId || !value.role || !['owner', 'admin'].includes(value.role)) throw new Error('Unauthorized'); return value as typeof value & { organizationId: string } }
function fail(error: { message: string } | null) { if (error) throw new Error('No se pudo guardar el cambio.') }

async function createAutomationImpl(formData: FormData) { const input = automationSchema.parse({ name: formData.get('name'), eventType: formData.get('eventType'), endpoint: formData.get('endpoint'), enabled: false }); const { supabase, user, organizationId } = await context(); fail((await supabase.from('automations').insert({ organization_id: organizationId, name: input.name, event_type: input.eventType, webhook_url: input.endpoint, status: 'disabled', created_by: user.id })).error); revalidatePath('/automations') }
async function markNotificationReadImpl(formData: FormData) { const id = String(formData.get('id') ?? ''); if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Datos inválidos.'); const { supabase, organizationId } = await getOrganizationContext(); if (!organizationId) throw new Error('Unauthorized'); fail((await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('organization_id', organizationId)).error); revalidatePath('/notifications') }
async function saveRevenueGoalsImpl(formData: FormData) { const input = goalSchema.parse({ monthlyRevenueGoal: formData.get('monthlyRevenueGoal'), mrrGoal: formData.get('mrrGoal') }); const { supabase, user, organizationId } = await context(); fail((await supabase.from('organization_settings').upsert({ organization_id: organizationId, monthly_revenue_goal: input.monthlyRevenueGoal, mrr_goal: input.mrrGoal, created_by: user.id })).error); fail((await supabase.from('monthly_goal_history').upsert({ organization_id: organizationId, month: new Date().toISOString().slice(0, 7) + '-01', monthly_revenue_goal: input.monthlyRevenueGoal, mrr_goal: input.mrrGoal, created_by: user.id }, { onConflict: 'organization_id,month' })).error); revalidatePath('/settings'); revalidatePath('/finance/revenue') }
async function recordHermesIntentImpl(formData: FormData) { const input = hermesIntentSchema.parse({ tool: formData.get('tool'), payload: JSON.parse(String(formData.get('payload') ?? '{}')), confirmed: formData.get('confirmed') === 'true' }); const { supabase, user, organizationId } = await context(); fail((await supabase.from('hermes_mutation_intents').insert({ organization_id: organizationId, tool_name: input.tool, payload: input.payload, confirmation_status: 'confirmed', requested_by: user.id })).error); revalidatePath('/settings/hermes') }

export const createAutomation = safeAction(createAutomationImpl)
export const markNotificationRead = safeAction(markNotificationReadImpl)
export const saveRevenueGoals = safeAction(saveRevenueGoalsImpl)
export const recordHermesIntent = safeAction(recordHermesIntentImpl)
