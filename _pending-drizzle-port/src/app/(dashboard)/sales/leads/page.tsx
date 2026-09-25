import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { ActionFeedbackForm } from "@/components/ui/action-feedback-form";
import { createQuickLead } from "@/app/actions/sales";
import { EmptyState } from "@/components/sales/empty-state";
import { getOrganizationContext } from "@/lib/supabase/context";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Calificado",
  unqualified: "No calificado",
  converted: "Convertido",
};

type Lead = {
  id: string;
  note: string | null;
  status: string;
  created_at: string;
  companies: { name: string } | null;
  contacts: { first_name: string; last_name: string | null } | null;
  lead_sources: { name: string } | null;
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; source?: string }>;
}) {
  const { q, status, source } = await searchParams;
  const { supabase, organizationId } = await getOrganizationContext();

  const [{ data }, { data: companiesData }, { data: contactsData }, { data: sourcesData }] =
    await Promise.all([
      supabase
        .from("leads")
        .select(
          "id, note, status, created_at, companies(name), contacts(first_name, last_name), lead_sources(name)",
        )
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false }),
      supabase
        .from("companies")
        .select("id,name")
        .eq("organization_id", organizationId!)
        .order("name"),
      supabase
        .from("contacts")
        .select("id,company_id,first_name,last_name")
        .eq("organization_id", organizationId!)
        .order("first_name"),
      supabase
        .from("lead_sources")
        .select("name")
        .eq("organization_id", organizationId!)
        .order("position"),
    ]);

  const companies = (companiesData ?? []) as Array<{ id: string; name: string }>;
  const contacts = (contactsData ?? []) as Array<{
    id: string;
    company_id: string | null;
    first_name: string;
    last_name: string | null;
  }>;
  const sources = (sourcesData ?? []) as Array<{ name: string }>;

  const allLeads = (data ?? []) as unknown as Lead[];
  const needle = q?.trim().toLowerCase();
  const leads = allLeads.filter((lead) => {
    if (status && lead.status !== status) return false;
    if (source && lead.lead_sources?.name !== source) return false;
    if (needle) {
      const haystack = [
        lead.companies?.name,
        lead.contacts?.first_name,
        lead.contacts?.last_name,
        lead.note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  return (
    <div className="product-grid min-h-[calc(100dvh-72px)] p-5 md:p-8">
      <div className="mx-auto max-w-6xl">
        <p className="mono text-xs uppercase tracking-[.16em] text-brand-primary">
          Ventas / Prospectos
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.06em]">
          Prospectos
        </h1>
        <div className="mt-7 grid gap-6 lg:grid-cols-[360px_1fr]">
          <ActionFeedbackForm
            action={createQuickLead}
            successMessage="Prospecto creado correctamente"
            className="border border-brand-border bg-brand-surface-elevated p-5"
          >
            <h2 className="font-semibold">Nuevo prospecto</h2>
            <div className="mt-4 space-y-3">
              <select
                name="companyMode"
                aria-label="Tipo de empresa"
                className="w-full border border-brand-border bg-brand-bg p-2.5"
              >
                <option value="new">Nueva empresa</option>
                <option value="existing">Empresa existente</option>
              </select>
              <input
                name="companyName"
                placeholder="Nueva empresa (si corresponde)"
                className="w-full border border-brand-border bg-brand-bg p-2.5"
              />
              <select
                name="companyId"
                aria-label="Empresa existente"
                className="w-full border border-brand-border bg-brand-bg p-2.5"
              >
                <option value="">Seleccionar empresa existente</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                name="contactId"
                aria-label="Contacto existente opcional"
                className="w-full border border-brand-border bg-brand-bg p-2.5"
              >
                <option value="">Crear contacto nuevo</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name ?? ""}
                  </option>
                ))}
              </select>
              <input
                name="firstName"
                placeholder="Nombre (requerido si crea contacto)"
                className="w-full border border-brand-border bg-brand-bg p-2.5"
              />
              <input
                name="lastName"
                placeholder="Apellido"
                className="w-full border border-brand-border bg-brand-bg p-2.5"
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                className="w-full border border-brand-border bg-brand-bg p-2.5"
              />
              <input
                name="phone"
                placeholder="Teléfono"
                className="w-full border border-brand-border bg-brand-bg p-2.5"
              />
              <textarea
                name="note"
                placeholder="Contexto inicial"
                className="w-full border border-brand-border bg-brand-bg p-2.5"
              />
            </div>
            <ActionSubmitButton className="mt-4 w-full bg-brand-text p-2.5 text-sm font-medium text-brand-bg">
              Crear prospecto
            </ActionSubmitButton>
          </ActionFeedbackForm>
          <section>
            <form method="get" className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Buscar por empresa, contacto o nota..."
                className="min-w-0 flex-1 border border-brand-border bg-brand-bg p-2.5 text-sm"
              />
              <select
                name="status"
                defaultValue={status ?? ""}
                aria-label="Filtrar por estado"
                className="border border-brand-border bg-brand-bg p-2.5 text-sm"
              >
                <option value="">Todo estado</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                name="source"
                defaultValue={source ?? ""}
                aria-label="Filtrar por fuente"
                className="border border-brand-border bg-brand-bg p-2.5 text-sm"
              >
                <option value="">Toda fuente</option>
                {sources.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ActionSubmitButton className="bg-brand-text px-4 py-2.5 text-sm font-medium text-brand-bg">
                Buscar
              </ActionSubmitButton>
              {(q || status || source) && (
                <Link
                  href="/sales/leads"
                  className="text-sm text-brand-muted underline underline-offset-4"
                >
                  Limpiar
                </Link>
              )}
            </form>
            <div className="mt-4">
              {leads.length === 0 ? (
                <EmptyState
                  title={
                    allLeads.length === 0
                      ? "Aún no hay prospectos. Crea el primero con el formulario."
                      : "Ningún prospecto coincide con la búsqueda."
                  }
                />
              ) : (
                <ul className="divide-y divide-brand-border border border-brand-border bg-brand-surface-elevated">
                  {leads.map((lead) => (
                    <li key={lead.id} className="p-0">
                      <Link
                        href={`/sales/leads/${lead.id}`}
                        className="block p-4 focus-visible:outline-2 focus-visible:outline-brand-primary"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="font-medium">{lead.companies?.name}</p>
                          <span className="mono text-xs text-brand-muted">
                            {STATUS_LABELS[lead.status] ?? lead.status}
                          </span>
                        </div>
                        <p className="text-sm text-brand-muted">
                          {lead.contacts?.first_name} {lead.contacts?.last_name}
                          {lead.lead_sources?.name && ` · ${lead.lead_sources.name}`}
                        </p>
                        {lead.note && (
                          <p className="mt-1 whitespace-pre-line text-sm text-brand-muted">
                            {lead.note}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
