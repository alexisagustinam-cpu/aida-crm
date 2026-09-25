import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { ActionFeedbackForm } from "@/components/ui/action-feedback-form";
import {
  addDiagnosticProblem,
  saveDiagnosticAnswer,
  saveServiceInterest,
} from "@/app/actions/sales";
import { EmptyState } from "@/components/sales/empty-state";
import { getOrganizationContext } from "@/lib/supabase/context";
import {
  DIAGNOSTIC_QUESTIONS,
  INTEREST_LABELS,
  questionLabel,
  type Interest,
} from "@/features/sales/domain/diagnostic-questions";

type Diagnostic = {
  id: string;
  status: string;
  deals: { name: string } | null;
  diagnostic_answers: Array<{ question_key: string; answer: string | null }>;
  business_problems: Array<{ id: string; description: string; severity: string }>;
  diagnostic_service_interest: Array<{
    service_id: string;
    interest: Interest;
    note: string | null;
    services: { name: string } | null;
  }>;
};

export default async function DiagnosticsPage() {
  const { supabase, organizationId } = await getOrganizationContext();

  const [{ data }, { data: serviceData }] = await Promise.all([
    supabase
      .from("diagnostics")
      .select(
        "id, status, deals(name), diagnostic_answers(question_key, answer), business_problems(id, description, severity), diagnostic_service_interest(service_id, interest, note, services(name))",
      )
      .eq("organization_id", organizationId!)
      .order("created_at", { ascending: false }),
    supabase
      .from("services")
      .select("id, name")
      .eq("organization_id", organizationId!)
      .eq("is_active", true)
      .order("name"),
  ]);

  const diagnostics = (data ?? []) as unknown as Diagnostic[];
  const services = (serviceData ?? []) as Array<{ id: string; name: string }>;

  return (
    <div className="product-grid min-h-[calc(100dvh-72px)] p-5 md:p-8">
      <p className="mono text-xs uppercase tracking-[.16em] text-brand-primary">
        Ventas / Diagnósticos
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-[-.06em]">Diagnósticos</h1>

      {diagnostics.length === 0 ? (
        <div className="mt-7">
          <EmptyState title="Aún no hay diagnósticos. Se crean desde una oportunidad del pipeline." />
        </div>
      ) : (
        <div className="mt-7 space-y-5">
          {diagnostics.map((diagnostic) => {
            const answers = new Map(
              diagnostic.diagnostic_answers.map((a) => [a.question_key, a.answer]),
            );
            const contestadas = diagnostic.diagnostic_answers.filter((a) =>
              a.answer?.trim(),
            ).length;

            return (
              <section
                key={diagnostic.id}
                className="border border-brand-border bg-brand-surface-elevated p-5"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-semibold">{diagnostic.deals?.name}</h2>
                  {/* Cuánto llevas contestado, sin tener que abrir y contar. */}
                  <span className="mono text-xs text-brand-muted">
                    {contestadas}/{DIAGNOSTIC_QUESTIONS.length} respuestas
                  </span>
                </div>

                {/* ── Las preguntas ──────────────────────────────── */}
                <div className="mt-5 space-y-3">
                  {DIAGNOSTIC_QUESTIONS.map((question) => {
                    const answer = answers.get(question.key) ?? "";
                    return (
                      <ActionFeedbackForm
                        key={question.key}
                        action={saveDiagnosticAnswer}
                        successMessage="Respuesta guardada correctamente"
                        className="border border-brand-border p-3"
                      >
                        <input type="hidden" name="diagnosticId" value={diagnostic.id} />
                        <input type="hidden" name="questionKey" value={question.key} />
                        <label
                          htmlFor={`${diagnostic.id}-${question.key}`}
                          className="block text-sm font-medium"
                        >
                          {question.label}
                        </label>
                        {question.hint && (
                          <p className="mt-0.5 text-xs text-brand-muted">{question.hint}</p>
                        )}
                        <div className="mt-2 flex gap-2">
                          <textarea
                            id={`${diagnostic.id}-${question.key}`}
                            name="answer"
                            defaultValue={answer}
                            rows={2}
                            className="min-w-0 flex-1 border border-brand-border bg-brand-bg p-2 text-sm"
                          />
                          <ActionSubmitButton variant="secondary" className="text-xs">
                            Guardar
                          </ActionSubmitButton>
                        </div>
                      </ActionFeedbackForm>
                    );
                  })}
                </div>

                {/* ── Servicios: qué quiere y qué no ─────────────── */}
                <div className="mt-6 border-t border-brand-border pt-5">
                  <h3 className="font-medium">Servicios</h3>
                  <p className="mt-1 text-xs text-brand-muted">
                    Lo que descartó hoy es lo que le puedes ofrecer en seis meses.
                  </p>

                  {diagnostic.diagnostic_service_interest.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm">
                      {diagnostic.diagnostic_service_interest.map((row) => (
                        <li key={row.service_id} className="flex gap-2">
                          <span className="mono text-xs text-brand-muted">
                            {INTEREST_LABELS[row.interest]}
                          </span>
                          <span>{row.services?.name}</span>
                          {row.note && (
                            <span className="text-brand-muted">— {row.note}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {services.length === 0 ? (
                    <p className="mt-3 text-sm text-brand-muted">
                      Primero crea tus servicios en Comercial → Servicios.
                    </p>
                  ) : (
                    <ActionFeedbackForm
                      action={saveServiceInterest}
                      successMessage="Interés guardado correctamente"
                      className="mt-3 flex flex-wrap items-center gap-2"
                    >
                      <input type="hidden" name="diagnosticId" value={diagnostic.id} />
                      <select
                        required
                        name="serviceId"
                        aria-label="Servicio"
                        className="border border-brand-border bg-brand-bg p-2 text-sm"
                      >
                        <option value="">Servicio</option>
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                      <select
                        name="interest"
                        aria-label="Interés"
                        className="border border-brand-border bg-brand-bg p-2 text-sm"
                      >
                        {(Object.keys(INTEREST_LABELS) as Interest[]).map((key) => (
                          <option key={key} value={key}>
                            {INTEREST_LABELS[key]}
                          </option>
                        ))}
                      </select>
                      <input
                        name="note"
                        placeholder="Nota (opcional)"
                        className="min-w-0 flex-1 border border-brand-border bg-brand-bg p-2 text-sm"
                      />
                      <ActionSubmitButton variant="secondary" className="text-xs">
                        Guardar
                      </ActionSubmitButton>
                    </ActionFeedbackForm>
                  )}
                </div>

                {/* ── Problemas detectados ───────────────────────── */}
                <div className="mt-6 border-t border-brand-border pt-5">
                  <h3 className="font-medium">Problemas detectados</h3>
                  {diagnostic.business_problems.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm">
                      {diagnostic.business_problems.map((problem) => (
                        <li key={problem.id}>
                          <span className="mono text-xs text-brand-muted">
                            {problem.severity}
                          </span>{" "}
                          {problem.description}
                        </li>
                      ))}
                    </ul>
                  )}
                  <ActionFeedbackForm
                    action={addDiagnosticProblem}
                    successMessage="Problema añadido correctamente"
                    className="mt-3 flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="diagnosticId" value={diagnostic.id} />
                    <input
                      required
                      name="description"
                      placeholder="Problema identificado"
                      className="min-w-0 flex-1 border border-brand-border bg-brand-bg p-2 text-sm"
                    />
                    <select
                      name="severity"
                      aria-label="Severidad"
                      className="border border-brand-border bg-brand-bg p-2 text-sm"
                    >
                      <option value="medium">Media</option>
                      <option value="low">Baja</option>
                      <option value="high">Alta</option>
                      <option value="critical">Crítica</option>
                    </select>
                    <ActionSubmitButton variant="secondary" className="text-xs">
                      Añadir
                    </ActionSubmitButton>
                  </ActionFeedbackForm>
                </div>

                {/* Se guarda lo contestado aunque no esté todo: un diagnóstico
                    a medias sigue siendo mejor que ninguno. */}
                <p className="mono mt-5 text-[10px] uppercase text-brand-muted">
                  {diagnostic.status}
                  {contestadas > 0 &&
                    ` · última respuesta en «${questionLabel(diagnostic.diagnostic_answers.at(-1)?.question_key ?? "")}»`}
                </p>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
