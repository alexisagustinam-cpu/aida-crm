import { z } from 'zod'

export const automationSchema = z.object({ name: z.string().trim().min(2).max(120), eventType: z.enum(['deal.won', 'invoice.paid', 'task.completed', 'project.completed']), endpoint: z.string().trim().url().refine((value) => value.startsWith('https://'), 'Debe usar HTTPS'), enabled: z.boolean() })
export const commandSearchSchema = z.object({ query: z.string().trim().min(2).max(80) })
export const hermesIntentSchema = z.object({ tool: z.enum(['create_task', 'log_activity', 'update_deal']), payload: z.record(z.string(), z.unknown()), confirmed: z.literal(true) })
export const goalSchema = z.object({ monthlyRevenueGoal: z.coerce.number().finite().min(0), mrrGoal: z.coerce.number().finite().min(0) })
