import { ActionSubmitButton } from '@/components/ui/action-submit-button'
import { ActionFeedbackForm } from '@/components/ui/action-feedback-form'
import Link from "next/link";
import { notFound } from "next/navigation";
import { createContact, logActivity, saveTask } from "@/app/actions/sales";
import { getOrganizationContext } from "@/lib/supabase/context";
import { SaveNotice } from "@/components/sales/save-notice";
import { clientWorkflowSummary } from "@/features/commercial/domain/client-workflow";

type Item = { id: string; label: string; href: string };
/* Cada bloque de la ficha lleva su propio botón de añadir. Antes los ocho
   eran informativos: decían "no hay contratos" y te obligaban a salir a
   buscar la pantalla correcta y volver a elegir la empresa a mano. El
   contador en la cabecera es la otra mitad: de un vistazo se ve dónde hay
   algo y dónde no, sin tener que abrir. */
function Group({
  title,
  items,
  empty,
  addHref,
  addLabel,
}: {
  title: string;
  items: Item[];
  empty: string;
  addHref?: string;
  addLabel?: string;
}) {
  return (
    <section className="rounded-xl border border-brand-border p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">
          {title}
          {items.length > 0 && (
            <span className="mono ml-2 text-xs font-normal text-brand-muted">
              {items.length}
            </span>
          )}
        </h2>
        {addHref && items.length > 0 && (
          <Link
            href={addHref}
            className="mono text-xs uppercase tracking-[.1em] text-brand-primary underline-offset-2 hover:underline"
          >
            + Añadir
          </Link>
        )}
      </div>

      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm text-brand-muted">
          {items.map((item) => (
            <li key={item.id}>
              <Link className="underline" href={item.href}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-brand-muted">{empty}</p>
          {addHref && (
            <Link
              href={addHref}
              className="mt-3 inline-flex min-h-11 items-center border border-brand-border bg-brand-surface-elevated px-3 py-2 text-sm font-medium hover:border-brand-text"
            >
              {addLabel ?? "Añadir"}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

export default async function Company360({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ setup?: string; notice?: string }>;
}) {
  const { id } = await params;
  const { setup, notice } = await searchParams;
  const { supabase, organizationId } = await getOrganizationContext();
  const [
    { data: company },
    { data: contacts = [] },
    { data: deals = [] },
    { data: projects = [] },
    { data: invoices = [] },
    { data: proposals = [] },
    { data: contracts = [] },
    { data: activities = [] },
  ] = await Promise.all([
    supabase
      .from("companies")
      .select("id,name,industry")
      .eq("id", id)
      .eq("organization_id", organizationId!)
      .maybeSingle(),
    supabase
      .from("contacts")
      .select("id,first_name,last_name")
      .eq("company_id", id)
      .eq("organization_id", organizationId!),
    supabase
      .from("deals")
      .select("id,name,status")
      .eq("company_id", id)
      .eq("organization_id", organizationId!),
    supabase
      .from("projects")
      .select("id,name,status")
      .eq("company_id", id)
      .eq("organization_id", organizationId!),
    supabase
      .from("invoices")
      .select("id,number,status,total,payments(amount)")
      .eq("company_id", id)
      .eq("organization_id", organizationId!),
    supabase
      .from("proposals")
      .select("id,title,status")
      .eq("company_id", id)
      .eq("organization_id", organizationId!),
    supabase
      .from("contracts")
      .select("id,title,status,value")
      .eq("company_id", id)
      .eq("organization_id", organizationId!),
    supabase
      .from("activities")
      .select("id,title,type,occurred_at")
      .eq("company_id", id)
      .eq("organization_id", organizationId!)
      .order("occurred_at", { ascending: false })
      .limit(20),
  ]);
  if (!company) notFound();
  const contactItems = (
    contacts as Array<{
      id: string;
      first_name: string;
      last_name: string | null;
    }>
  ).map((contact) => ({
    id: contact.id,
    label: `${contact.first_name} ${contact.last_name ?? ""}`.trim(),
    href: `/sales/contacts/${contact.id}`,
  }));
  const dealItems = (
    deals as Array<{ id: string; name: string; status: string }>
  ).map((deal) => ({
    id: deal.id,
    label: `${deal.name} · ${deal.status}`,
    href: `/sales/pipeline/${deal.id}`,
  }));
  const projectItems = (
    projects as Array<{ id: string; name: string; status: string }>
  ).map((project) => ({
    id: project.id,
    label: `${project.name} · ${project.status}`,
    href: `/work/projects/${project.id}`,
  }));
  const invoiceItems = (
    invoices as Array<{
      id: string;
      number: string;
      status: string;
      total: number;
    }>
  ).map((invoice) => ({
    id: invoice.id,
    label: `${invoice.number} · $${Number(invoice.total).toLocaleString("en-US")} · ${invoice.status}`,
    href: `/finance/invoices/${invoice.id}`,
  }));
  const proposalItems = (
    proposals as Array<{ id: string; title: string; status: string }>
  ).map((proposal) => ({
    id: proposal.id,
    label: `${proposal.title} · ${proposal.status}`,
    href: `/commercial/proposals?company=${id}`,
  }));
  const contractItems = (
    contracts as Array<{ id: string; title: string; status: string }>
  ).map((contract) => ({
    id: contract.id,
    label: `${contract.title} · ${contract.status}`,
    href: `/commercial/contracts?company=${id}`,
  }));
  const activityItems = (
    activities as Array<{ id: string; title: string; type: string }>
  ).map((activity) => ({
    id: activity.id,
    label: `${activity.title} · ${activity.type}`,
    href: `/sales/activities?company=${id}`,
  }));
  const workflow = clientWorkflowSummary({
    hasWonDeal: (deals as Array<{ status: string }>).some((deal) => deal.status === 'won'),
    agreements: (contracts as Array<{ status: string } & { value?: number }>).map((contract) => ({ value: Number(contract.value ?? 0), documentUrl: null })),
    invoices: (invoices as Array<{ total: number; payments?: Array<{ amount: number }> }>).map((invoice) => ({ total: Number(invoice.total), payments: (invoice.payments ?? []).map((payment) => Number(payment.amount)) })),
    projects: projects as unknown[],
  });
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  return (
    <main className="px-6 py-10 md:px-8">
      <SaveNotice message={notice === "created" ? "Cliente guardado correctamente" : undefined} />
      <p className="mono text-xs uppercase text-brand-primary">Cliente 360</p>
      <h1 className="mt-2 text-3xl font-bold">
        {(company as { name: string }).name}
      </h1>
      <section className="mt-5 border border-brand-primary/40 bg-brand-surface-elevated p-4">
        <p className="mono text-xs uppercase text-brand-primary">Estado del cliente</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-4">
          <div><p className="text-sm text-brand-muted">Estado</p><p className="font-semibold">{workflow.status}</p></div>
          <div><p className="text-sm text-brand-muted">Acordado</p><p className="font-semibold">{money.format(workflow.contracted)}</p></div>
          <div><p className="text-sm text-brand-muted">Cobrado</p><p className="font-semibold">{money.format(workflow.collected)}</p></div>
          <div><p className="text-sm text-brand-muted">Saldo</p><p className="font-semibold">{money.format(workflow.balance)}</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {workflow.nextStep === 'Registrar acuerdo' && <Link className="rounded-md bg-brand-text px-3 py-2 font-medium text-brand-bg" href={`/commercial/contracts?company=${id}`}>Registrar acuerdo</Link>}
          {workflow.nextStep === 'Registrar pago' && <Link className="rounded-md bg-brand-text px-3 py-2 font-medium text-brand-bg" href={`/finance/invoices?company=${id}`}>Registrar pago</Link>}
          {workflow.nextStep === 'Crear proyecto' && <Link className="rounded-md bg-brand-text px-3 py-2 font-medium text-brand-bg" href={`/work/projects?company=${id}`}>Crear proyecto</Link>}
          {workflow.nextStep === 'Ver proyecto' && projectItems[0] && <Link className="rounded-md bg-brand-text px-3 py-2 font-medium text-brand-bg" href={projectItems[0].href}>Ver proyecto</Link>}
          <Link className="px-3 py-2 text-brand-primary underline" href={`/commercial/contracts?company=${id}`}>Acuerdo y PDF</Link>
          <Link className="px-3 py-2 text-brand-primary underline" href={`/finance/invoices?company=${id}`}>Pagos</Link>
        </div>
      </section>

      {setup === "1" && (
        <section className="mt-5 border border-brand-primary/40 bg-brand-surface-elevated p-4">
          <h2 className="font-semibold">Primeros pasos del cliente</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Este cliente puede existir sin sitio web ni email. Elige el
            siguiente registro según lo que ya sabes.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link
              className="text-brand-primary underline"
              href={`/work/projects?company=${id}`}
            >
              Crear proyecto activo
            </Link>
            <Link
              className="text-brand-primary underline"
              href={`/finance/invoices?company=${id}`}
            >
              Registrar factura/cobro existente
            </Link>
            <Link
              className="text-brand-primary underline"
              href={`/finance/mrr?company=${id}`}
            >
              Crear suscripción
            </Link>
          </div>
        </section>
      )}
      <section className="mt-6 grid gap-3 border border-brand-border bg-brand-surface-elevated p-4 md:grid-cols-2">
        <ActionFeedbackForm action={createContact} successMessage="Contacto creado correctamente">
          <h2 className="font-semibold">Nuevo contacto</h2>
          <input type="hidden" name="companyId" value={id} />
          <input
            required
            name="firstName"
            placeholder="Nombre"
            className="mt-2 w-full border border-brand-border bg-brand-bg p-2 text-sm"
          />
          <ActionSubmitButton className="mt-2 text-sm">
            Crear contacto
          </ActionSubmitButton>
        </ActionFeedbackForm>
        <ActionFeedbackForm action={logActivity} successMessage="Actividad guardada correctamente">
          <h2 className="font-semibold">Nueva actividad</h2>
          <p className="mt-1 text-xs text-brand-muted">
            Registra algo que ya pasó, por ejemplo una llamada, reunión o nota.
          </p>
          <input type="hidden" name="companyId" value={id} />
          <input type="hidden" name="type" value="note" />
          <input
            required
            name="title"
            placeholder="Qué ocurrió"
            className="mt-2 w-full border border-brand-border bg-brand-bg p-2 text-sm"
          />
          <ActionSubmitButton className="mt-2 text-sm">
            Guardar actividad
          </ActionSubmitButton>
        </ActionFeedbackForm>
        <ActionFeedbackForm action={saveTask} successMessage="Tarea creada correctamente">
          <h2 className="font-semibold">Nueva tarea</h2>
          <p className="mt-1 text-xs text-brand-muted">
            Crea una acción futura, por ejemplo llamar, enviar propuesta o dar
            seguimiento.
          </p>
          <input type="hidden" name="companyId" value={id} />
          <input
            required
            name="title"
            placeholder="Siguiente acción"
            className="mt-2 w-full border border-brand-border bg-brand-bg p-2 text-sm"
          />
          <ActionSubmitButton className="mt-2 text-sm">
            Crear tarea
          </ActionSubmitButton>
        </ActionFeedbackForm>
      </section>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Group
          title="Contactos"
          items={contactItems}
          empty="No hay contactos relacionados. Usa «Nuevo contacto», arriba."
        />
        <Group
          title="Oportunidades"
          items={dealItems}
          empty="No hay oportunidades relacionadas."
          addHref={`/sales/leads?company=${id}`}
          addLabel="Crear oportunidad"
        />
        <Group
          title="Proyectos"
          items={projectItems}
          empty="No hay proyectos relacionados."
          addHref={`/work/projects?company=${id}`}
          addLabel="Crear proyecto"
        />
        <Group
          title="Facturas"
          items={invoiceItems}
          empty="No hay facturas relacionadas."
          addHref={`/finance/invoices?company=${id}`}
          addLabel="Crear factura"
        />
        <Group
          title="Propuestas"
          items={proposalItems}
          empty="No hay propuestas relacionadas."
          addHref={`/commercial/proposals?company=${id}`}
          addLabel="Crear propuesta"
        />
        <Group
          title="Contratos"
          items={contractItems}
          empty="No hay contratos relacionados."
          addHref={`/commercial/contracts?company=${id}`}
          addLabel="Crear contrato"
        />
        <Group
          title="Timeline"
          items={activityItems}
          empty="Nada registrado todavía. Usa «Nueva actividad», arriba."
        />
        
      </div>
    </main>
  );
}
