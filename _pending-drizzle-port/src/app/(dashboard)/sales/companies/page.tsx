import Link from "next/link";
import { getOrganizationContext } from "@/lib/supabase/context";
import { CsvTools } from "@/components/sales/csv-tools";
import { CrmCreateDialog } from "@/components/sales/crm-create-dialog";
import { CompanyRowActions } from "@/components/sales/company-row-actions";
import { SaveNotice } from "@/components/sales/save-notice";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { CRM_INTAKE_COPY } from "@/features/sales/domain/intake-copy";
import {
  archiveCompany,
  createCompany,
  deleteCompany,
  updateCompany,
} from "@/app/actions/sales";
import { EmptyState } from "@/components/sales/empty-state";

type Company = { id: string; name: string; industry: string | null };

function CompanyList({ companies }: { companies: Company[] }) {
  return (
    <div className="mt-8 space-y-2">
      {companies.map((company) => (
        <article
          key={company.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-brand-border p-3 transition-colors hover:bg-brand-surface"
        >
          <Link
            href={`/sales/companies/${company.id}`}
            className="min-w-0 flex-1 rounded-md px-1 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            <b>{company.name}</b>
            <span className="ml-3 text-sm text-brand-muted">
              {company.industry ?? "Sin industria"}
            </span>
          </Link>
          <CompanyRowActions
            company={company}
            updateAction={updateCompany}
            archiveAction={archiveCompany}
            deleteAction={deleteCompany}
          />
        </article>
      ))}
    </div>
  );
}

const noticeMessages: Record<string, string> = {
  updated: "Empresa guardada correctamente",
  archived: "Empresa archivada correctamente",
  deleted: "Empresa eliminada correctamente",
};

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{
    notice?: string;
    q?: string;
    industry?: string;
    sort?: string;
  }>;
}) {
  const { notice, q, industry, sort } = await searchParams;
  const { supabase, organizationId } = await getOrganizationContext();

  let query = organizationId
    ? supabase
        .from("companies")
        .select("id,name,industry,email,phone")
        .eq("organization_id", organizationId)
    : null;
  if (query && q) query = query.ilike("name", `%${q}%`);
  if (query && industry) query = query.eq("industry", industry);
  const { data } = query
    ? await query.order(sort === "recent" ? "created_at" : "name", {
        ascending: sort !== "recent",
      })
    : { data: [] };
  const companies = (data ?? []) as unknown as Company[];

  const { data: industryRows } = organizationId
    ? await supabase
        .from("companies")
        .select("industry")
        .eq("organization_id", organizationId)
        .not("industry", "is", null)
    : { data: [] };
  const industries = Array.from(
    new Set(
      ((industryRows ?? []) as Array<{ industry: string }>).map(
        (row) => row.industry,
      ),
    ),
  ).sort();

  return (
    <div className="product-grid min-h-[calc(100dvh-72px)] p-5 md:p-8">
      <div className="mx-auto max-w-6xl">
        <SaveNotice message={notice ? noticeMessages[notice] : undefined} />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mono text-xs uppercase text-brand-primary">
              CRM / empresas
            </p>
            <h1 className="mt-2 text-3xl font-bold">Empresas</h1>
            <p className="mt-2 text-sm text-brand-muted">
              Una empresa es un negocio, cliente o cuenta.
            </p>
          </div>
          <CrmCreateDialog
            entity="company"
            action={createCompany}
            companies={[]}
          />
        </div>
        <div className="mt-5">
          <details>
            <summary className="cursor-pointer text-sm text-brand-primary underline underline-offset-4">
              Importar/Exportar
            </summary>
            <CsvTools entity="companies" />
          </details>
        </div>
        <form
          method="get"
          className="mt-5 flex flex-wrap items-center gap-2"
        >
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre..."
            className="min-w-0 flex-1 border border-brand-border bg-brand-bg p-2.5 text-sm"
          />
          <select
            name="industry"
            defaultValue={industry ?? ""}
            aria-label="Filtrar por industria"
            className="border border-brand-border bg-brand-bg p-2.5 text-sm"
          >
            <option value="">Toda industria</option>
            {industries.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            name="sort"
            defaultValue={sort ?? "name"}
            aria-label="Ordenar por"
            className="border border-brand-border bg-brand-bg p-2.5 text-sm"
          >
            <option value="name">Nombre (A-Z)</option>
            <option value="recent">Más recientes primero</option>
          </select>
          <ActionSubmitButton className="bg-brand-text px-4 py-2.5 text-sm font-medium text-brand-bg">
            Buscar
          </ActionSubmitButton>
          {(q || industry || sort) && (
            <Link
              href="/sales/companies"
              className="text-sm text-brand-muted underline underline-offset-4"
            >
              Limpiar
            </Link>
          )}
        </form>
        {companies.length ? (
          <CompanyList companies={companies} />
        ) : (
          <div className="mt-8">
            <EmptyState title={CRM_INTAKE_COPY.company.empty}>
              <CrmCreateDialog
                entity="company"
                action={createCompany}
                companies={[]}
              />
            </EmptyState>
          </div>
        )}
      </div>
    </div>
  );
}
