'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { contractScheduleSchema, commercialFormValues, deliverableSchema, expenseSchema, invoiceSchema, paymentSchema, projectSchema, proposalSchema, subscriptionSchema } from '@/features/commercial/domain/validation'
import { scheduleMatchesTotal } from '@/features/commercial/domain/payment-schedule'
import { getOrganizationContext } from '@/lib/supabase/context'
import { safeAction } from '@/lib/actions/safe-action'
import { calculateInvoiceBalance, validatePaymentAmount } from '@/features/finance/domain/revenue-metrics'
import { canTransitionContract, canTransitionDeliverable, canTransitionProject, canTransitionProposal } from '@/features/commercial/domain/lifecycle'

type Access = 'commercial.write' | 'delivery.write' | 'finance.write' | 'crm.write'
const roles: Record<Access, string[]> = { 'commercial.write': ['owner', 'admin', 'sales'], 'delivery.write': ['owner', 'admin', 'operations'], 'finance.write': ['owner', 'admin', 'finance'], 'crm.write': ['owner', 'admin', 'sales'] }
async function access(permission: Access) { const context = await getOrganizationContext(); if (!context.organizationId || !context.role || !roles[permission].includes(context.role)) throw new Error('Unauthorized'); return context as typeof context & { organizationId: string } }
function fail(error: { message: string } | null) { if (error) throw new Error('No se pudo guardar el cambio.') }
function parse<T>(schema: { safeParse: (input: unknown) => { success: true; data: T } | { success: false } }, form: FormData): T { const result = schema.safeParse(commercialFormValues(form)); if (!result.success) throw new Error('Datos inválidos.'); return result.data }
function lineItem(form: FormData) { return [{ description: String(form.get('description') ?? ''), quantity: String(form.get('quantity') ?? ''), unitPrice: String(form.get('unitPrice') ?? '') }] }

async function saveServiceImpl(formData: FormData) { const { supabase, user, organizationId } = await access('commercial.write'); const name = String(formData.get('name') ?? '').trim(); const referencePrice = Number(formData.get('referencePrice')); if (name.length < 2 || !Number.isFinite(referencePrice) || referencePrice < 0) throw new Error('Datos inválidos.'); fail((await supabase.from('services').insert({ organization_id: organizationId, name, reference_price: referencePrice, category: String(formData.get('category') ?? '').trim() || null, created_by: user.id })).error); revalidatePath('/commercial/services') }
async function saveProposalImpl(formData: FormData) { const input = proposalSchema.parse({ ...commercialFormValues(formData), items: lineItem(formData) }); const { supabase, user, organizationId } = await access('commercial.write'); const total = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0); const { data, error } = await supabase.from('proposals').insert({ organization_id: organizationId, company_id: input.companyId, deal_id: input.dealId, title: input.title, valid_until: input.validUntil, subtotal: total, total, created_by: user.id }).select('id').single(); fail(error); fail((await supabase.from('proposal_items').insert(input.items.map((item, position) => ({ proposal_id: (data as { id: string }).id, description: item.description, quantity: item.quantity, unit_price: item.unitPrice, position })))).error); revalidatePath('/commercial/proposals') }
async function saveProjectImpl(formData: FormData) { const input = parse(projectSchema, formData); const { supabase, user, organizationId } = await access('delivery.write'); fail((await supabase.from('projects').insert({ organization_id: organizationId, company_id: input.companyId, contract_id: input.contractId, deal_id: input.dealId, name: input.name, start_date: input.startDate, due_date: input.dueDate, owner_id: user.id, created_by: user.id })).error); revalidatePath('/work/projects') }
async function saveDeliverableImpl(formData: FormData) { const input = parse(deliverableSchema, formData); const { supabase, user } = await access('delivery.write'); fail((await supabase.from('project_deliverables').insert({ project_id: input.projectId, name: input.name, due_date: input.dueDate, created_by: user.id })).error); revalidatePath('/work/projects') }
/* Contrato con cuotas, en una sola transacción.

   Antes había que crear el contrato en una pantalla, cada factura en otra y
   los pagos en una tercera, enlazándolas a mano. Y el formulario de
   contrato solo aceptaba inicio, fin y total: no había forma de decir "300
   en dos veces". Ahora se manda el contrato con su calendario y Postgres
   escribe todo de golpe o no escribe nada. */
async function saveContractWithScheduleImpl(formData: FormData) {
  /* `commercialFormValues` usa Object.fromEntries, que se queda solo con
     el último valor de cada campo repetido: las listas de cuotas se
     perderían. Por eso aquí se leen con getAll. */
  const parsed = contractScheduleSchema.safeParse({
    ...commercialFormValues(formData),
    dueDates: formData.getAll('dueDate').map(String),
    amounts: formData.getAll('amount').map(String),
  });
  if (!parsed.success) throw new Error('Datos inválidos.');
  const input = parsed.data;
  const { supabase, organizationId } = await access('commercial.write');

  const installments = input.dueDates.map((dueDate, i) => ({
    dueDate,
    amount: input.amounts[i],
  }));
  if (!scheduleMatchesTotal(installments, input.total))
    throw new Error('Las cuotas no suman el monto total del contrato.');

  const { data, error } = await supabase.rpc('create_contract_with_schedule', {
    p_organization_id: organizationId,
    p_company_id: input.companyId,
    p_title: input.title,
    p_total: input.total,
    p_starts_on: input.startsOn,
    p_proposal_id: input.proposalId ?? null,
    p_installments: installments,
  });
  fail(error);

  revalidatePath('/commercial/contracts');
  revalidatePath('/finance/invoices');
  revalidatePath('/clients');
  revalidatePath('/dashboard');
  redirect(`/commercial/contracts?contract=${data as string}&notice=created`);
}
async function saveInvoiceImpl(formData: FormData) { const input = invoiceSchema.parse({ ...commercialFormValues(formData), items: lineItem(formData) }); const { supabase, user, organizationId } = await access('finance.write'); const total = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0); const number = `INV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`; const { data, error } = await supabase.from('invoices').insert({ organization_id: organizationId, company_id: input.companyId, contract_id: input.contractId, project_id: input.projectId, number, issue_date: input.issueDate, due_date: input.dueDate, subtotal: total, total, created_by: user.id }).select('id').single(); fail(error); fail((await supabase.from('invoice_items').insert(input.items.map((item, position) => ({ invoice_id: (data as { id: string }).id, description: item.description, quantity: item.quantity, unit_price: item.unitPrice, position })))).error); revalidatePath('/finance/invoices'); revalidatePath('/dashboard') }
async function recordPaymentImpl(formData: FormData) { const input = parse(paymentSchema, formData); const { supabase, user, organizationId } = await access('finance.write'); const { data: invoice, error } = await supabase.from('invoices').select('id,total,status,payments(amount)').eq('id', input.invoiceId).eq('organization_id', organizationId).single(); fail(error); const current = invoice as unknown as { total: number; status: string; payments: Array<{ amount: number }> }; if (!['issued', 'partial', 'overdue'].includes(current.status) || !validatePaymentAmount({ amount: input.amount, remaining: calculateInvoiceBalance({ total: Number(current.total), payments: current.payments.map((payment) => Number(payment.amount)) }) })) throw new Error('El cobro debe ser mayor que cero y no puede superar el saldo pendiente.'); fail((await supabase.from('payments').insert({ organization_id: organizationId, invoice_id: input.invoiceId, amount: input.amount, paid_at: `${input.paidAt}T12:00:00.000Z`, method: input.method, reference: input.reference, created_by: user.id })).error); revalidatePath('/finance/invoices'); revalidatePath('/dashboard') }
async function saveSubscriptionImpl(formData: FormData) { const input = parse(subscriptionSchema, formData); const { supabase, user, organizationId } = await access('finance.write'); fail((await supabase.from('subscriptions').insert({ organization_id: organizationId, company_id: input.companyId, contract_id: input.contractId, name: input.name, amount: input.amount, frequency: input.frequency, status: input.status, start_date: input.startDate, end_date: input.endDate, created_by: user.id })).error); revalidatePath('/finance/mrr'); revalidatePath('/dashboard') }
async function saveExpenseImpl(formData: FormData) { const input = parse(expenseSchema, formData); const { supabase, user, organizationId } = await access('finance.write'); fail((await supabase.from('expenses').insert({ organization_id: organizationId, project_id: input.projectId, description: input.description, amount: input.amount, incurred_on: input.incurredOn, created_by: user.id })).error); revalidatePath('/finance/invoices') }
async function transition(table: 'proposals' | 'contracts' | 'projects' | 'project_deliverables', id: string, status: string, allowed: (from: string, to: string) => boolean, permission: Access, organizationId?: string) { const { supabase } = await access(permission); let query = supabase.from(table).select('status').eq('id', id); if (organizationId) query = query.eq('organization_id', organizationId); const { data, error } = await query.single(); fail(error); const current = data as { status: string }; if (!allowed(current.status, status)) throw new Error('La transición de estado no está permitida.'); const values = status === 'completed' ? { status, completed_at: new Date().toISOString() } : { status }; fail((await supabase.from(table).update(values).eq('id', id)).error) }
async function updateProposalStatusImpl(formData: FormData) { const id=String(formData.get('id')??''); const status=String(formData.get('status')??''); const { organizationId }=await access('commercial.write'); await transition('proposals',id,status,canTransitionProposal,'commercial.write',organizationId); revalidatePath('/commercial/proposals'); revalidatePath('/dashboard') }
async function updateContractImpl(formData: FormData) { const id=String(formData.get('id')??''); const status=String(formData.get('status')??''); const endsOn=String(formData.get('endsOn')??'')||null; const { supabase, organizationId }=await access('commercial.write'); const { data, error }=await supabase.from('contracts').select('status,starts_on').eq('id',id).eq('organization_id',organizationId).single(); fail(error); const current=data as {status:string;starts_on:string}; if (!canTransitionContract(current.status,status) || (endsOn && endsOn<current.starts_on)) throw new Error('La actualización del contrato no está permitida.'); fail((await supabase.from('contracts').update({status,ends_on:endsOn}).eq('id',id)).error); revalidatePath('/commercial/contracts'); revalidatePath('/dashboard') }
async function updateProjectImpl(formData: FormData) { const id=String(formData.get('id')??''); const status=String(formData.get('status')??''); await transition('projects',id,status,canTransitionProject,'delivery.write'); revalidatePath('/work/projects') }
async function updateDeliverableImpl(formData: FormData) { const id=String(formData.get('id')??''); const status=String(formData.get('status')??''); const dueDate=String(formData.get('dueDate')??'')||null; const { supabase }=await access('delivery.write'); const { data,error }=await supabase.from('project_deliverables').select('status').eq('id',id).single(); fail(error); if (!canTransitionDeliverable((data as {status:string}).status,status)) throw new Error('La transición de estado no está permitida.'); fail((await supabase.from('project_deliverables').update(status==='completed'?{status,due_date:dueDate,completed_at:new Date().toISOString()}:{status,due_date:dueDate}).eq('id',id)).error); revalidatePath('/work/projects') }
async function convertWonDealToProjectImpl(formData: FormData) { const dealId = String(formData.get('dealId') ?? ''); const name = String(formData.get('name') ?? '').trim(); if (!/^[0-9a-f-]{36}$/i.test(dealId) || name.length < 2) throw new Error('Datos inválidos.'); const { supabase } = await access('delivery.write'); const rpc = supabase.rpc as unknown as (fn: string, args: Record<string, string>) => Promise<{ error: { message: string } | null }>; const { error } = await rpc('convert_won_deal_to_project', { target_deal_id: dealId, project_name: name }); fail(error); revalidatePath('/sales/pipeline'); revalidatePath('/work/projects'); redirect('/work/projects') }

/* Igual que en sales.ts: cada acción se expone envuelta en safeAction para
   que el mensaje de error real llegue al cliente en producción. */
export const saveService = safeAction(saveServiceImpl)
export const saveProposal = safeAction(saveProposalImpl)
export const saveProject = safeAction(saveProjectImpl)
export const saveDeliverable = safeAction(saveDeliverableImpl)
export const saveContractWithSchedule = safeAction(saveContractWithScheduleImpl)
export const saveInvoice = safeAction(saveInvoiceImpl)
export const recordPayment = safeAction(recordPaymentImpl)
export const saveSubscription = safeAction(saveSubscriptionImpl)
export const saveExpense = safeAction(saveExpenseImpl)
export const updateProposalStatus = safeAction(updateProposalStatusImpl)
export const updateContract = safeAction(updateContractImpl)
export const updateProject = safeAction(updateProjectImpl)
export const updateDeliverable = safeAction(updateDeliverableImpl)
export const convertWonDealToProject = safeAction(convertWonDealToProjectImpl)
