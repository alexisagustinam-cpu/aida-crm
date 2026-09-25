import Link from "next/link";
import { getOrganizationContext } from "@/lib/supabase/context";
import { CsvTools } from "@/components/sales/csv-tools";
import { CrmCreateDialog } from "@/components/sales/crm-create-dialog";
import { CRM_INTAKE_COPY } from "@/features/sales/domain/intake-copy";
import { createContact } from "@/app/actions/sales";
import { EmptyState } from "@/components/sales/empty-state";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";

type Contact = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  job_title: string | null;
  company_id: string | null;
};

function ContactList({
  contacts,
  companyNameById,
}: {
  contacts: Contact[];
  companyNameById: Map<string, string>;
}) {
  return (
    <div className="mt-8 space-y-2">
      {contacts.map((contact) => (
        <Link
          key={contact.id}
          href={`/sales/contacts/${contact.id}`}
          className="block rounded-xl border border-brand-border p-4 hover:bg-brand-surface"
        >
          <b>
            {contact.first_name} {contact.last_name}
          </b>
          <span className="ml-3 text-sm text-brand-muted">
            {contact.job_title ?? contact.email ?? "Sin detalle"}
            {contact.company_id &&
              companyNameById.has(contact.company_id) &&
              ` · ${companyNameById.get(contact.company_id)}`}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; company?: string }>;
}) {
  const { q, company } = await searchParams;
  const { supabase, organizationId } = await getOrganizationContext();

  let contactsQuery = organizationId
    ? supabase
        .from("contacts")
        .select("id,first_name,last_name,email,job_title,company_id")
        .eq("organization_id", organizationId)
    : null;
  // `,` y `(` `)` son la sintaxis propia del filtro .or() de PostgREST —
  // sin quitarlos, un término de búsqueda con una coma rompe el filtro o
  // permite añadir condiciones que no estaban pensadas ahí.
  const safeQ = q?.replace(/[,()]/g, " ").trim();
  if (contactsQuery && safeQ)
    contactsQuery = contactsQuery.or(
      `first_name.ilike.%${safeQ}%,last_name.ilike.%${safeQ}%,email.ilike.%${safeQ}%`,
    );
  if (contactsQuery && company) contactsQuery = contactsQuery.eq("company_id", company);

  const [{ data }, { data: companiesData }] = organizationId
    ? await Promise.all([
        contactsQuery!.order("first_name"),
        supabase
          .from("companies")
          .select("id,name")
          .eq("organization_id", organizationId)
          .order("name"),
      ])
    : [{ data: [] }, { data: [] }];
  const contacts = (data ?? []) as unknown as Contact[];
  const companies = (companiesData ?? []) as Array<{
    id: string;
    name: string;
  }>;
  const companyNameById = new Map(companies.map((c) => [c.id, c.name]));

  return (
    <div className="product-grid min-h-[calc(100dvh-72px)] p-5 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mono text-xs uppercase text-brand-primary">
              CRM / contactos
            </p>
            <h1 className="mt-2 text-3xl font-bold">Contactos</h1>
            <p className="mt-2 text-sm text-brand-muted">
              Un contacto es una persona; puede pertenecer a una empresa o ser
              externo.
            </p>
          </div>
          <CrmCreateDialog
            entity="contact"
            action={createContact}
            companies={companies}
          />
        </div>
        <div className="mt-5">
          <details>
            <summary className="cursor-pointer text-sm text-brand-primary underline underline-offset-4">
              Importar/Exportar
            </summary>
            <CsvTools entity="contacts" />
          </details>
        </div>
        <form method="get" className="mt-5 flex flex-wrap items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre o email..."
            className="min-w-0 flex-1 border border-brand-border bg-brand-bg p-2.5 text-sm"
          />
          <select
            name="company"
            defaultValue={company ?? ""}
            aria-label="Filtrar por empresa"
            className="border border-brand-border bg-brand-bg p-2.5 text-sm"
          >
            <option value="">Toda empresa</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ActionSubmitButton className="bg-brand-text px-4 py-2.5 text-sm font-medium text-brand-bg">
            Buscar
          </ActionSubmitButton>
          {(q || company) && (
            <Link
              href="/sales/contacts"
              className="text-sm text-brand-muted underline underline-offset-4"
            >
              Limpiar
            </Link>
          )}
        </form>
        {contacts.length ? (
          <ContactList contacts={contacts} companyNameById={companyNameById} />
        ) : (
          <div className="mt-8">
            <EmptyState title={CRM_INTAKE_COPY.contact.empty}>
              <CrmCreateDialog
                entity="contact"
                action={createContact}
                companies={companies}
              />
            </EmptyState>
          </div>
        )}
      </div>
    </div>
  );
}
