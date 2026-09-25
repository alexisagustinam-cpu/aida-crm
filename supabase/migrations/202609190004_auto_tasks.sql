-- Tareas que se crean solas, en dos momentos de la operación:
--
--  1. Entra un prospecto (por el formulario, por el endpoint de la web o a
--     mano) → aparece "Contactar a <nombre>" para hoy.
--  2. Se genera una factura de cuota → aparece "Cobrar cuota" con
--     vencimiento en la fecha de la factura.
--
-- Van como triggers y no como código en cada acción del servidor porque hay
-- más de un camino que crea un lead (createQuickLead, el endpoint de la web
-- en automai-labs, y cualquiera que se añada después) y las cuotas se crean
-- desde create_contract_with_schedule. Un trigger se dispara sin importar
-- por dónde entró la fila, así que la tarea no depende de que cada punto de
-- entrada se acuerde de crearla.

create or replace function public.create_lead_followup_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact_name text;
begin
  select trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
    into v_contact_name
    from public.contacts
    where id = new.contact_id;

  insert into public.tasks (
    organization_id, company_id, contact_id, lead_id,
    title, priority, due_at, owner_id, created_by
  ) values (
    new.organization_id,
    new.company_id,
    new.contact_id,
    new.id,
    'Contactar a ' || coalesce(nullif(v_contact_name, ''), 'nuevo prospecto'),
    'high',
    now(),
    new.owner_id,
    new.created_by
  );
  return new;
end;
$$;

create trigger leads_create_followup_task
  after insert on public.leads
  for each row execute procedure public.create_lead_followup_task();

create or replace function public.create_invoice_collection_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tasks (
    organization_id, company_id, title, priority, due_at, created_by
  ) values (
    new.organization_id,
    new.company_id,
    'Cobrar factura ' || new.number,
    'medium',
    new.due_date::timestamptz,
    new.created_by
  );
  return new;
end;
$$;

create trigger invoices_create_collection_task
  after insert on public.invoices
  for each row execute procedure public.create_invoice_collection_task();
