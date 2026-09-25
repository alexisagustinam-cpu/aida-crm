import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganizationContext } from "@/lib/supabase/context";
import { deleteContact, updateContact } from "@/app/actions/sales";
import { RecordActionConfirm } from "@/components/sales/record-action-confirm";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { ActionFeedbackForm } from "@/components/ui/action-feedback-form";

type Contact = {
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  company_id: string | null;
};

export default async function ContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, organizationId } = await getOrganizationContext();
  const { data } = await supabase
    .from("contacts")
    .select("id,first_name,last_name,email,phone,job_title,company_id")
    .eq("id", id)
    .eq("organization_id", organizationId!)
    .maybeSingle();
  const contact = data as unknown as Contact | null;

  if (!contact) notFound();

  return (
    <div className="px-6 py-10 md:px-8">
      <p className="mono text-xs uppercase text-brand-primary">Contacto</p>
      <h1 className="mt-2 text-3xl font-bold">
        {contact.first_name} {contact.last_name}
      </h1>
      <ActionFeedbackForm
        action={updateContact}
        successMessage="Contacto guardado correctamente"
        className="mt-8 grid max-w-xl gap-3 rounded-xl border border-brand-border p-5"
      >
        <input type="hidden" name="id" value={id} />
        <input
          type="hidden"
          name="companyId"
          value={contact.company_id ?? ""}
        />
        <label>
          Cargo
          <input
            name="jobTitle"
            defaultValue={contact.job_title ?? ""}
            className="mt-1 w-full border border-brand-border bg-brand-bg p-2"
          />
        </label>
        <label>
          Email
          <input
            name="email"
            type="email"
            defaultValue={contact.email ?? ""}
            className="mt-1 w-full border border-brand-border bg-brand-bg p-2"
          />
        </label>
        <label>
          Teléfono
          <input
            name="phone"
            defaultValue={contact.phone ?? ""}
            className="mt-1 w-full border border-brand-border bg-brand-bg p-2"
          />
        </label>
        <input type="hidden" name="firstName" value={contact.first_name} />
        <input type="hidden" name="lastName" value={contact.last_name ?? ""} />
        <ActionSubmitButton className="justify-self-start">
          Guardar cambios
        </ActionSubmitButton>
      </ActionFeedbackForm>
      <RecordActionConfirm
        id={id}
        label="Eliminar contacto"
        message="¿Eliminar este contacto? Los registros históricos vinculados conservarán asociación solo según el comportamiento actual de sus claves foráneas. Si la base de datos lo impide, no se eliminará nada."
        action={deleteContact}
      />
      {contact.company_id && (
        <Link
          className="mt-5 inline-block underline"
          href={`/sales/companies/${contact.company_id}`}
        >
          Abrir Cliente 360
        </Link>
      )}
    </div>
  );
}
