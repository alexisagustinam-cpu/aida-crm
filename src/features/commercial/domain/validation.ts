import { z } from 'zod'

const uuid = z.string().uuid()
const money = z.coerce.number().finite().min(0).max(99_999_999)
const item = z.object({ description: z.string().trim().min(1).max(500), quantity: z.coerce.number().positive().max(100_000), unitPrice: money })

export const proposalSchema = z.object({ companyId: uuid, dealId: uuid.optional().or(z.literal('')).transform((v) => v || undefined), title: z.string().trim().min(2).max(180), validUntil: z.string().date().optional().or(z.literal('')).transform((v) => v || undefined), items: z.array(item).min(1) })
export const projectSchema = z.object({ companyId: uuid, contractId: uuid.optional().or(z.literal('')).transform((v) => v || undefined), dealId: uuid.optional().or(z.literal('')).transform((v) => v || undefined), name: z.string().trim().min(2).max(180), startDate: z.string().date().optional().or(z.literal('')).transform((v) => v || undefined), dueDate: z.string().date().optional().or(z.literal('')).transform((v) => v || undefined) }).refine((v) => !v.startDate || !v.dueDate || v.dueDate >= v.startDate, { message: 'La fecha objetivo no puede preceder al inicio.', path: ['dueDate'] })
export const deliverableSchema = z.object({ projectId: uuid, name: z.string().trim().min(2).max(180), dueDate: z.string().date().optional().or(z.literal('')).transform((v) => v || undefined) })
export const invoiceSchema = z.object({ companyId: uuid, contractId: uuid.optional().or(z.literal('')).transform((v) => v || undefined), projectId: uuid.optional().or(z.literal('')).transform((v) => v || undefined), issueDate: z.string().date(), dueDate: z.string().date(), items: z.array(item).min(1) }).refine((v) => v.dueDate >= v.issueDate, { message: 'El vencimiento no puede preceder a la emisión.', path: ['dueDate'] })
export const paymentSchema = z.object({ invoiceId: uuid, amount: money.positive(), paidAt: z.string().date(), method: z.enum(['bank_transfer', 'cash', 'card', 'other']), reference: z.string().trim().max(160).optional().or(z.literal('')).transform((v) => v || undefined) })
export const subscriptionSchema = z.object({ companyId: uuid, contractId: uuid.optional().or(z.literal('')).transform((v) => v || undefined), name: z.string().trim().min(2).max(180), amount: money.positive(), frequency: z.enum(['monthly', 'annual']), status: z.enum(['trial', 'active', 'past_due', 'paused', 'cancelled']), startDate: z.string().date(), endDate: z.string().date().optional().or(z.literal('')).transform((v) => v || undefined) })
export const expenseSchema = z.object({ projectId: uuid.optional().or(z.literal('')).transform((v) => v || undefined), description: z.string().trim().min(2).max(500), amount: money.positive(), incurredOn: z.string().date() })

export function commercialFormValues(formData: FormData): Record<string, FormDataEntryValue> { return Object.fromEntries(formData.entries()) }

/* Las cuotas llegan del formulario como dos listas paralelas (fechas y
   montos). Se validan como tales y la acción las vuelve a emparejar. */
export const contractScheduleSchema = z.object({
  companyId: uuid,
  proposalId: uuid.optional().or(z.literal('')).transform((v) => v || undefined),
  title: z.string().trim().min(2).max(180),
  total: money.positive(),
  startsOn: z.string().date(),
  dueDates: z.array(z.string().date()).min(1).max(36),
  amounts: z.array(money.positive()).min(1).max(36),
}).refine((v) => v.dueDates.length === v.amounts.length, {
  message: 'Cada cuota necesita su fecha y su monto.',
  path: ['amounts'],
})
