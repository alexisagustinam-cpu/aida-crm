"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  canAccessSalesAction,
  type SalesPermission,
} from "@/features/permissions/domain/sales-permissions";
import {
  activitySchema,
  companyCreateSchema,
  companyUpdateSchema,
  contactCreateSchema,
  contactUpdateSchema,
  convertLeadSchema,
  leadFollowupSchema,
  diagnosticAnswerSchema,
  diagnosticProblemSchema,
  serviceInterestSchema,
  formValues,
  quickLeadSchema,
  recordIdSchema,
  stageUpdateSchema,
  taskCompletionSchema,
  taskSchema,
} from "@/features/sales/domain/validation";
import { getOrganizationContext } from "@/lib/supabase/context";
import { safeAction } from "@/lib/actions/safe-action";
import { assertStageBelongsToPipeline } from "@/features/sales/domain/stage-integrity";
import {
  companyIntakePayload,
  contactIntakePayload,
} from "@/features/sales/domain/intake-payload";
import { companyRemovalDecision } from "@/features/sales/domain/record-removal";
import { conversionDestination } from "@/features/sales/domain/conversion-destination";

async function access(permission: SalesPermission) {
  const context = await getOrganizationContext();
  if (
    !context.organizationId ||
    !context.role ||
    !canAccessSalesAction(context.role, permission)
  )
    throw new Error("Unauthorized");
  return context as typeof context & {
    organizationId: string;
    role: NonNullable<typeof context.role>;
  };
}
function must(error: { message: string } | null) {
  if (error) throw new Error("No se pudo guardar el cambio.");
}
function parse<T>(
  schema: {
    safeParse: (
      value: unknown,
    ) => { success: true; data: T } | { success: false };
  },
  data: FormData,
): T {
  const result = schema.safeParse(formValues(data));
  if (!result.success) throw new Error("Datos inválidos.");
  return result.data;
}

async function createQuickLeadImpl(formData: FormData) {
  const input = parse(quickLeadSchema, formData);
  const { supabase, user, organizationId } = await access("crm.write");
  let companyId: string;
  if (input.companyMode === "existing") {
    const { data, error } = await supabase
      .from("companies")
      .select("id")
      .eq("id", input.companyId)
      .eq("organization_id", organizationId)
      .single();
    must(error);
    companyId = (data as { id: string }).id;
  } else {
    const { data: duplicate } = await supabase
      .from("companies")
      .select("id")
      .eq("organization_id", organizationId)
      .ilike("name", input.companyName)
      .maybeSingle();
    if (duplicate)
      throw new Error(
        "Esta empresa ya existe. Selecciona “Empresa existente” para continuar.",
      );
    const { data, error } = await supabase
      .from("companies")
      .insert({
        organization_id: organizationId,
        name: input.companyName,
        owner_id: user.id,
        source_id: input.sourceId,
        created_by: user.id,
      })
      .select("id")
      .single();
    must(error);
    companyId = (data as { id: string }).id;
  }
  let contactId =
    input.companyMode === "existing" ? input.contactId : undefined;
  if (contactId) {
    const { error } = await supabase
      .from("contacts")
      .select("id")
      .eq("id", contactId)
      .eq("company_id", companyId)
      .eq("organization_id", organizationId)
      .single();
    must(error);
  } else {
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        organization_id: organizationId,
        company_id: companyId,
        first_name: input.firstName!,
        last_name: input.lastName,
        email: input.email,
        phone: input.phone,
        owner_id: user.id,
        created_by: user.id,
      })
      .select("id")
      .single();
    must(error);
    contactId = (data as { id: string }).id;
  }
  const { error } = await supabase
    .from("leads")
    .insert({
      organization_id: organizationId,
      company_id: companyId,
      contact_id: contactId,
      source_id: input.sourceId,
      note: input.note,
      owner_id: user.id,
      created_by: user.id,
    });
  must(error);
  revalidatePath("/sales/leads");
  redirect("/sales/leads");
}
async function createCompanyImpl(formData: FormData) {
  const input = parse(companyCreateSchema, formData);
  const { supabase, user, organizationId } = await access("crm.write");
  const { data, error } = await supabase
    .from("companies")
    .insert({
      organization_id: organizationId,
      ...companyIntakePayload(input),
      owner_id: user.id,
      created_by: user.id,
    })
    .select("id")
    .single();
  must(error);
  revalidatePath("/sales/companies");
  revalidatePath("/dashboard");
  redirect(`/sales/companies/${(data as { id: string }).id}`);
}
async function createContactImpl(formData: FormData) {
  const input = parse(contactCreateSchema, formData);
  const { supabase, user, organizationId } = await access("crm.write");
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      organization_id: organizationId,
      ...contactIntakePayload(input),
      owner_id: user.id,
      created_by: user.id,
    })
    .select("id")
    .single();
  must(error);
  revalidatePath("/sales/contacts");
  revalidatePath("/dashboard");
  redirect(`/sales/contacts/${(data as { id: string }).id}`);
}
async function updateCompanyImpl(formData: FormData) {
  const input = parse(companyUpdateSchema, formData);
  const { supabase, organizationId } = await access("crm.write");
  const { id, ...values } = input;
  must(
    (
      await supabase
        .from("companies")
        .update(companyIntakePayload(values))
        .eq("id", id)
        .eq("organization_id", organizationId)
    ).error,
  );
  revalidatePath("/sales/companies");
  revalidatePath(`/sales/companies/${id}`);
  redirect("/sales/companies?notice=updated");
}
async function updateContactImpl(formData: FormData) {
  const input = parse(contactUpdateSchema, formData);
  const { supabase, organizationId } = await access("crm.write");
  const { id, ...values } = input;
  must(
    (
      await supabase
        .from("contacts")
        .update(contactIntakePayload(values))
        .eq("id", id)
        .eq("organization_id", organizationId)
    ).error,
  );
  revalidatePath("/sales/contacts");
  revalidatePath(`/sales/contacts/${id}`);
}
async function deleteContactImpl(formData: FormData) {
  const { id } = parse(recordIdSchema, formData);
  const { supabase, organizationId } = await access("crm.write");
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error)
    throw new Error(
      "No se pudo eliminar el contacto porque tiene relaciones protegidas. No se aplicó ningún cambio.",
    );
  revalidatePath("/sales/contacts");
  revalidatePath("/sales/companies");
  redirect("/sales/contacts");
}
async function archiveCompanyImpl(formData: FormData) {
  const { id } = parse(recordIdSchema, formData);
  const { supabase, organizationId } = await access("crm.write");
  must(
    (
      await supabase
        .from("companies")
        .update({ status: "archived" })
        .eq("id", id)
        .eq("organization_id", organizationId)
    ).error,
  );
  revalidatePath("/sales/companies");
  revalidatePath(`/sales/companies/${id}`);
  redirect("/sales/companies?notice=archived");
}
async function deleteCompanyImpl(formData: FormData) {
  const { id } = parse(recordIdSchema, formData);
  const { supabase, organizationId } = await access("crm.write");
  const results = await Promise.all(
    ["deals", "projects", "invoices", "contacts"].map((table) =>
      supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("company_id", id)
        .eq("organization_id", organizationId),
    ),
  );
  if (results.some((result) => result.error))
    throw new Error(
      "No se pudo comprobar si la empresa tiene registros vinculados. No se aplicó ningún cambio.",
    );
  const decision = companyRemovalDecision({
    deals: results[0].count ?? 0,
    projects: results[1].count ?? 0,
    invoices: results[2].count ?? 0,
    contacts: results[3].count ?? 0,
  });
  if (!decision.allowed) throw new Error(decision.reason);
  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error)
    throw new Error(
      "No se pudo eliminar la empresa. No se aplicó ningún cambio.",
    );
  revalidatePath("/sales/companies");
  redirect("/sales/companies?notice=deleted");
}
async function convertLeadImpl(formData: FormData) {
  const input = parse(convertLeadSchema, formData);
  const { supabase, user, organizationId } = await access("crm.write");
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("company_id, contact_id")
    .eq("id", input.leadId)
    .eq("organization_id", organizationId)
    .single();
  must(leadError);
  const { data: stage, error: stageError } = await supabase
    .from("pipeline_stages")
    .select("probability_default, stage_kind")
    .eq("id", input.stageId)
    .eq("pipeline_id", input.pipelineId)
    .eq("organization_id", organizationId)
    .single();
  must(stageError);
  const stageData = stage as {
    probability_default: number;
    stage_kind: "open" | "won" | "lost";
  };
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .insert({
      organization_id: organizationId,
      lead_id: input.leadId,
      pipeline_id: input.pipelineId,
      stage_id: input.stageId,
      company_id: (lead as { company_id: string | null }).company_id,
      contact_id: (lead as { contact_id: string | null }).contact_id,
      name: input.name,
      implementation_value: input.implementationValue,
      potential_mrr: input.potentialMrr,
      probability: stageData.probability_default,
      status:
        stageData.stage_kind === "won"
          ? "won"
          : stageData.stage_kind === "lost"
            ? "lost"
            : "open",
      owner_id: user.id,
      created_by: user.id,
    })
    .select("id")
    .single();
  must(dealError);
  const { error } = await supabase
    .from("leads")
    .update({
      status: "converted",
      converted_deal_id: (deal as { id: string }).id,
    })
    .eq("id", input.leadId)
    .eq("organization_id", organizationId);
  must(error);
  revalidatePath("/sales/pipeline");
  revalidatePath("/sales/leads");
  redirect(conversionDestination((deal as { id: string }).id));
}
async function updateLeadFollowupImpl(formData: FormData) {
  const input = parse(leadFollowupSchema, formData);
  const { supabase, organizationId } = await access("crm.write");
  const updates: Record<string, unknown> = {
    status: input.status,
    next_action: input.nextAction ?? null,
    next_action_at: input.nextActionAt ?? null,
  };
  if (input.noteAppend) {
    const { data: current, error: currentError } = await supabase
      .from("leads")
      .select("note")
      .eq("id", input.leadId)
      .eq("organization_id", organizationId)
      .single();
    must(currentError);
    const existing = (current as { note: string | null }).note;
    updates.note = existing
      ? `${existing}\n\n${input.noteAppend}`
      : input.noteAppend;
  }
  must(
    (
      await supabase
        .from("leads")
        .update(updates)
        .eq("id", input.leadId)
        .eq("organization_id", organizationId)
    ).error,
  );
  revalidatePath(`/sales/leads/${input.leadId}`);
  revalidatePath("/sales/leads");
}
async function updateDealStageImpl(formData: FormData) {
  const input = parse(stageUpdateSchema, formData);
  const { supabase, organizationId } = await access("crm.write");
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("pipeline_id")
    .eq("id", input.dealId)
    .eq("organization_id", organizationId)
    .single();
  must(dealError);
  const { data: stage, error: stageError } = await supabase
    .from("pipeline_stages")
    .select("probability_default, stage_kind, pipeline_id")
    .eq("id", input.stageId)
    .eq("pipeline_id", (deal as { pipeline_id: string }).pipeline_id)
    .eq("organization_id", organizationId)
    .single();
  must(stageError);
  assertStageBelongsToPipeline(
    (deal as { pipeline_id: string }).pipeline_id,
    (stage as { pipeline_id: string }).pipeline_id,
  );
  const value = stage as {
    probability_default: number;
    stage_kind: "open" | "won" | "lost";
  };
  must(
    (
      await supabase
        .from("deals")
        .update({
          stage_id: input.stageId,
          probability: value.probability_default,
          status:
            value.stage_kind === "won"
              ? "won"
              : value.stage_kind === "lost"
                ? "lost"
                : "open",
        })
        .eq("id", input.dealId)
        .eq("organization_id", organizationId)
    ).error,
  );
  revalidatePath("/sales/pipeline");
}
async function logActivityImpl(formData: FormData) {
  const input = parse(activitySchema, formData);
  const { supabase, user, organizationId } = await access("crm.write");
  let links = {
    company_id: input.companyId,
    contact_id: input.contactId,
    lead_id: input.leadId,
    deal_id: input.dealId,
  };
  if (input.leadId) {
    const { data, error } = await supabase
      .from("leads")
      .select("company_id,contact_id")
      .eq("id", input.leadId)
      .eq("organization_id", organizationId)
      .single();
    must(error);
    links = {
      ...links,
      company_id:
        links.company_id ??
        (data as { company_id: string | null }).company_id ??
        undefined,
      contact_id:
        links.contact_id ??
        (data as { contact_id: string | null }).contact_id ??
        undefined,
    };
  }
  if (input.dealId) {
    const { data, error } = await supabase
      .from("deals")
      .select("company_id,contact_id")
      .eq("id", input.dealId)
      .eq("organization_id", organizationId)
      .single();
    must(error);
    links = {
      ...links,
      company_id:
        links.company_id ??
        (data as { company_id: string | null }).company_id ??
        undefined,
      contact_id:
        links.contact_id ??
        (data as { contact_id: string | null }).contact_id ??
        undefined,
    };
    if (["call", "email", "whatsapp", "meeting"].includes(input.type))
      must(
        (
          await supabase
            .from("deals")
            .update({ last_contact_at: new Date().toISOString() })
            .eq("id", input.dealId)
            .eq("organization_id", organizationId)
        ).error,
      );
  }
  must(
    (
      await supabase
        .from("activities")
        .insert({
          organization_id: organizationId,
          ...input,
          ...links,
          created_by: user.id,
        })
    ).error,
  );
  revalidatePath("/sales/activities");
  if (input.leadId) revalidatePath(`/sales/leads/${input.leadId}`);
  if (input.dealId) revalidatePath("/sales/pipeline");
}
async function saveTaskImpl(formData: FormData) {
  const input = parse(taskSchema, formData);
  const { supabase, user, organizationId } = await access("tasks.write");
  const { id, dueAt, dealId, leadId, companyId, contactId, ...payload } = input;
  const values = {
    ...payload,
    due_at: dueAt,
    deal_id: dealId,
    lead_id: leadId,
    company_id: companyId,
    contact_id: contactId,
  };
  must(
    id
      ? (
          await supabase
            .from("tasks")
            .update(values)
            .eq("id", id)
            .eq("organization_id", organizationId)
        ).error
      : (
          await supabase
            .from("tasks")
            .insert({
              ...values,
              organization_id: organizationId,
              owner_id: user.id,
              created_by: user.id,
            })
        ).error,
  );
  revalidatePath("/work/tasks");
  if (leadId) revalidatePath(`/sales/leads/${leadId}`);
}
async function completeTaskImpl(formData: FormData) {
  const input = parse(taskCompletionSchema, formData);
  const { supabase, organizationId } = await access("tasks.write");
  must(
    (
      await supabase
        .from("tasks")
        .update({
          status: input.completed ? "completed" : "todo",
          completed_at: input.completed ? new Date().toISOString() : null,
        })
        .eq("id", input.id)
        .eq("organization_id", organizationId)
    ).error,
  );
  revalidatePath("/work/tasks");
}
async function saveDiagnosticAnswerImpl(formData: FormData) {
  const input = parse(diagnosticAnswerSchema, formData);
  const { supabase } = await access("diagnostics.write");
  must(
    (
      await supabase
        .from("diagnostic_answers")
        .upsert(
          {
            diagnostic_id: input.diagnosticId,
            question_key: input.questionKey,
            answer: input.answer,
          },
          { onConflict: "diagnostic_id,question_key" },
        )
    ).error,
  );
  revalidatePath("/sales/diagnostics");
}
async function addDiagnosticProblemImpl(formData: FormData) {
  const input = parse(diagnosticProblemSchema, formData);
  const { supabase } = await access("diagnostics.write");
  must(
    (
      await supabase
        .from("business_problems")
        .insert({
          diagnostic_id: input.diagnosticId,
          description: input.description,
          severity: input.severity,
          impact: input.impact,
          potential_solution: input.potentialSolution,
        })
    ).error,
  );
  revalidatePath("/sales/diagnostics");
}
/* Interés por servicio dentro del diagnóstico: lo quiere, más adelante, o
   lo descartó. `upsert` sobre (diagnostic_id, service_id) porque cambiar de
   opinión debe actualizar la fila, no añadir otra. */
async function saveServiceInterestImpl(formData: FormData) {
  const input = parse(serviceInterestSchema, formData);
  const { supabase, user, organizationId } = await access("diagnostics.write");
  must(
    (
      await supabase.from("diagnostic_service_interest").upsert(
        {
          organization_id: organizationId,
          diagnostic_id: input.diagnosticId,
          service_id: input.serviceId,
          interest: input.interest,
          note: input.note,
          created_by: user.id,
        },
        { onConflict: "diagnostic_id,service_id" },
      )
    ).error,
  );
  revalidatePath("/sales/diagnostics");
}

async function startDiagnosticImpl(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "");
  const { supabase, user, organizationId } = await access("diagnostics.write");
  if (!/^[0-9a-f-]{36}$/i.test(dealId)) throw new Error("Datos inválidos.");
  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id")
    .eq("id", dealId)
    .eq("organization_id", organizationId)
    .single();
  must(dealError);
  /* `upsert` con ignoreDuplicates devuelve null cuando la fila ya existe,
     así que al pulsar por segunda vez el diagnóstico de la misma
     oportunidad caías en la lista vacía en vez de abrir el que ya tenías:
     parecía que el botón no hacía nada. Se busca primero y solo se crea si
     falta. */
  const { data: existing } = await supabase
    .from("diagnostics")
    .select("id")
    .eq("deal_id", (deal as { id: string }).id)
    .maybeSingle();

  let diagnosticId = (existing as { id: string } | null)?.id ?? null;

  if (!diagnosticId) {
    const { data, error } = await supabase
      .from("diagnostics")
      .insert({
        organization_id: organizationId,
        deal_id: (deal as { id: string }).id,
        created_by: user.id,
      })
      .select("id")
      .single();
    must(error);
    diagnosticId = (data as { id: string }).id;
  }

  revalidatePath("/sales/diagnostics");
  redirect(`/sales/diagnostics?diagnostic=${diagnosticId}`);
}


/* Cada acción de arriba queda sin exportar directamente y se expone
   envuelta en safeAction: así el mensaje de error real llega al cliente
   incluso en producción, donde Next.js borra el de cualquier excepción que
   escape sin atrapar de un Server Action. Ver src/lib/actions/safe-action.ts. */
export const createQuickLead = safeAction(createQuickLeadImpl);
export const createCompany = safeAction(createCompanyImpl);
export const createContact = safeAction(createContactImpl);
export const updateCompany = safeAction(updateCompanyImpl);
export const updateContact = safeAction(updateContactImpl);
export const deleteContact = safeAction(deleteContactImpl);
export const archiveCompany = safeAction(archiveCompanyImpl);
export const deleteCompany = safeAction(deleteCompanyImpl);
export const convertLead = safeAction(convertLeadImpl);
export const updateLeadFollowup = safeAction(updateLeadFollowupImpl);
export const updateDealStage = safeAction(updateDealStageImpl);
export const logActivity = safeAction(logActivityImpl);
export const saveTask = safeAction(saveTaskImpl);
export const completeTask = safeAction(completeTaskImpl);
export const saveDiagnosticAnswer = safeAction(saveDiagnosticAnswerImpl);
export const addDiagnosticProblem = safeAction(addDiagnosticProblemImpl);
export const saveServiceInterest = safeAction(saveServiceInterestImpl);
export const startDiagnostic = safeAction(startDiagnosticImpl);
