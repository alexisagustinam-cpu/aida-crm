import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { ActionFeedbackForm } from "@/components/ui/action-feedback-form";
import {
  convertLead,
  logActivity,
  saveTask,
  updateLeadFollowup,
} from "@/app/actions/sales";
import { getOrganizationContext } from "@/lib/supabase/context";
import { notFound } from "next/navigation";

const STATUS_LABELS: Record<string, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Calificado",
  unqualified: "No calificado",
  converted: "Convertido",
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, organizationId } = await getOrganizationContext();
  const [{ data: lead }, { data: pipelineData }, { data: stageData }, { data: activities }] =
    await Promise.all([
      supabase
        .from("leads")
        .select(
          "id, company_id, contact_id, status, note, next_action, next_action_at, companies(name), contacts(first_name, last_name)",
        )
        .eq("id", id)
        .eq("organization_id", organizationId!)
        .maybeSingle(),
      supabase
        .from("pipelines")
        .select("id,name")
        .eq("organization_id", organizationId!)
        .eq("is_default", true)
        .maybeSingle(),
      supabase
        .from("pipeline_stages")
        .select("id,name,pipeline_id")
        .eq("organization_id", organizationId!)
        .order("position"),
      supabase
        .from("activities")
        .select("id,type,title,occurred_at")
        .eq("lead_id", id)
        .eq("organization_id", organizationId!)
        .order("occurred_at", { ascending: false })
        .limit(10),
    ]);
  if (!lead) notFound();
  const pipeline = pipelineData as { id: string; name: string } | null;
  const stages = (stageData ?? []) as Array<{
    id: string;
    name: string;
    pipeline_id: string;
  }>;
  const item = lead as {
    id: string;
    company_id: string | null;
    contact_id: string | null;
    status: string;
    note: string | null;
    next_action: string | null;
    next_action_at: string | null;
    companies: { name: string } | null;
    contacts: { first_name: string; last_name: string | null } | null;
  };
  const timeline = (activities ?? []) as Array<{
    id: string;
    type: string;
    title: string;
    occurred_at: string;
  }>;

  return (
    <div className="product-grid min-h-[calc(100dvh-72px)] p-5 md:p-8">
      <p className="mono text-xs uppercase tracking-[.16em] text-brand-primary">
        Ventas / Prospectos
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-[-.06em]">
        {item.companies?.name}
      </h1>
      <p className="mt-2 text-brand-muted">
        {item.contacts?.first_name} {item.contacts?.last_name} ·{" "}
        {STATUS_LABELS[item.status] ?? item.status}
      </p>
      {item.next_action && (
        <p className="mt-3 text-sm" aria-label="Próxima acción">
          Próxima acción: {item.next_action}
          {item.next_action_at &&
            ` · ${new Date(item.next_action_at).toLocaleDateString("es-EC")}`}
        </p>
      )}
      {item.note && (
        <p className="mt-3 whitespace-pre-line border-l-2 border-brand-border pl-3 text-sm text-brand-muted">
          {item.note}
        </p>
      )}

      <ActionFeedbackForm
        action={updateLeadFollowup}
        successMessage="Seguimiento actualizado correctamente"
        className="mt-6 max-w-xl border border-brand-border bg-brand-surface-elevated p-4"
      >
        <h2 className="font-semibold">Actualizar seguimiento</h2>
        <p className="mt-1 text-xs text-brand-muted">
          Registra qué pasó y cuándo tocarlo de nuevo — de eso depende que la
          tarea de seguimiento aparezca sola cuando llegue la fecha.
        </p>
        <input type="hidden" name="leadId" value={item.id} />
        <label className="mt-3 block text-sm font-medium">
          Estado
          <select
            name="status"
            defaultValue={item.status === "converted" ? "contacted" : item.status}
            disabled={item.status === "converted"}
            className="mt-1 w-full border border-brand-border bg-brand-bg p-2"
          >
            <option value="new">Nuevo</option>
            <option value="contacted">Contactado</option>
            <option value="qualified">Calificado</option>
            <option value="unqualified">No calificado</option>
          </select>
        </label>
        <label className="mt-3 block text-sm font-medium">
          Próxima acción
          <input
            name="nextAction"
            defaultValue={item.next_action ?? ""}
            placeholder="Ej. Enviar seguimiento si no responde"
            className="mt-1 w-full border border-brand-border bg-brand-bg p-2"
          />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Fecha de esa próxima acción
          <input
            name="nextActionAt"
            type="date"
            defaultValue={item.next_action_at?.slice(0, 10) ?? ""}
            className="mt-1 w-full border border-brand-border bg-brand-bg p-2"
          />
        </label>
        <label className="mt-3 block text-sm font-medium">
          Agregar a la nota (se suma a lo que ya hay, no lo reemplaza)
          <textarea
            name="noteAppend"
            placeholder="Ej. Respondió por WhatsApp, pidió cotización"
            className="mt-1 w-full border border-brand-border bg-brand-bg p-2"
          />
        </label>
        <ActionSubmitButton className="mt-3 text-sm">
          Guardar seguimiento
        </ActionSubmitButton>
      </ActionFeedbackForm>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <ActionFeedbackForm
          action={logActivity}
          successMessage="Actividad guardada correctamente"
          className="border border-brand-border bg-brand-surface-elevated p-4"
        >
          <h2 className="font-semibold">Registrar actividad</h2>
          <input type="hidden" name="leadId" value={item.id} />
          <select
            name="type"
            aria-label="Tipo de actividad"
            className="mt-3 w-full border border-brand-border bg-brand-bg p-2"
          >
            <option value="call">Llamada</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="meeting">Reunión</option>
            <option value="note">Nota</option>
          </select>
          <input
            required
            name="title"
            placeholder="Qué ocurrió"
            className="mt-2 w-full border border-brand-border bg-brand-bg p-2"
          />
          <textarea
            name="body"
            placeholder="Contexto"
            className="mt-2 w-full border border-brand-border bg-brand-bg p-2"
          />
          <ActionSubmitButton className="mt-2 text-sm">
            Guardar actividad
          </ActionSubmitButton>
        </ActionFeedbackForm>
        <ActionFeedbackForm
          action={saveTask}
          successMessage="Tarea creada correctamente"
          className="border border-brand-border bg-brand-surface-elevated p-4"
        >
          <h2 className="font-semibold">Crear próxima tarea</h2>
          <input type="hidden" name="leadId" value={item.id} />
          <input type="hidden" name="companyId" value={item.company_id ?? ""} />
          <input type="hidden" name="contactId" value={item.contact_id ?? ""} />
          <input
            required
            name="title"
            placeholder="Siguiente acción"
            className="mt-3 w-full border border-brand-border bg-brand-bg p-2"
          />
          <input
            name="dueAt"
            type="date"
            className="mt-2 w-full border border-brand-border bg-brand-bg p-2"
          />
          <ActionSubmitButton className="mt-2 text-sm">
            Crear tarea
          </ActionSubmitButton>
        </ActionFeedbackForm>
      </div>

      {timeline.length > 0 && (
        <section className="mt-5 border border-brand-border bg-brand-surface-elevated p-4">
          <h2 className="font-semibold">Actividad reciente</h2>
          <ul className="mt-3 space-y-2">
            {timeline.map((a) => (
              <li key={a.id} className="text-sm text-brand-muted">
                {a.type} · {a.title} ·{" "}
                {new Date(a.occurred_at).toLocaleDateString("es-EC")}
              </li>
            ))}
          </ul>
        </section>
      )}

      {item.status !== "converted" && pipeline && (
        <ActionFeedbackForm
          action={convertLead}
          successMessage="Prospecto convertido correctamente"
          className="mt-8 max-w-md border border-brand-border bg-brand-surface-elevated p-5"
        >
          <h2 className="font-semibold">Convertir en oportunidad</h2>
          <input type="hidden" name="leadId" value={item.id} />
          <input type="hidden" name="pipelineId" value={pipeline.id} />
          <label className="mt-4 block text-sm font-medium">
            Nombre de la oportunidad
            <span className="mt-1 block text-xs font-normal text-brand-muted">
              Usa un nombre que identifique claramente el servicio o proyecto
              propuesto.
            </span>
            <input required name="name" className="mt-1 w-full border border-brand-border bg-brand-bg p-2.5" />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Valor de implementación única
            <span className="mt-1 block text-xs font-normal text-brand-muted">
              Monto único estimado para puesta en marcha, configuración o
              proyecto inicial.
            </span>
            <input
              required
              name="implementationValue"
              type="number"
              min="0"
              defaultValue="0"
              className="mt-1 w-full border border-brand-border bg-brand-bg p-2.5"
            />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Ingreso mensual recurrente potencial
            <span className="mt-1 block text-xs font-normal text-brand-muted">
              Monto mensual estimado que podría facturarse de forma
              recurrente.
            </span>
            <input
              name="potentialMrr"
              type="number"
              min="0"
              defaultValue="0"
              className="mt-1 w-full border border-brand-border bg-brand-bg p-2.5"
            />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Etapa inicial
            <span className="mt-1 block text-xs font-normal text-brand-muted">
              Define la etapa del pipeline en la que quedará creada la
              oportunidad.
            </span>
            <select
              required
              name="stageId"
              className="mt-1 w-full border border-brand-border bg-brand-bg p-2.5"
            >
              {stages
                .filter((s) => s.pipeline_id === pipeline.id)
                .map((stage) => (
                  <option value={stage.id} key={stage.id}>
                    {stage.name}
                  </option>
                ))}
            </select>
          </label>
          <ActionSubmitButton className="mt-4">
            Convertir prospecto
          </ActionSubmitButton>
        </ActionFeedbackForm>
      )}
    </div>
  );
}
