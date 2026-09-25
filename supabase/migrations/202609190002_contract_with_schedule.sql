-- Crea un contrato y sus cuotas en una sola transacción.
--
-- Hasta ahora estos flujos se escribían desde la aplicación en pasos
-- sueltos: si fallaba el tercer insert, quedaban registros a medias y nadie
-- se enteraba. Una función de Postgres se ejecuta entera o no se ejecuta,
-- así que un contrato sin sus cuotas deja de ser posible.
--
-- Cada cuota es una factura con su propio vencimiento colgada del contrato
-- (`invoices.contract_id`), que es como el esquema ya representaba esto.
-- No hace falta tabla nueva.
--
-- `security invoker` a propósito: la función corre con los permisos de
-- quien la llama, así que las políticas RLS de contracts, invoices e
-- invoice_items se siguen aplicando igual que en un insert normal.

create or replace function public.create_contract_with_schedule(
  p_organization_id uuid,
  p_company_id uuid,
  p_title text,
  p_total numeric,
  p_starts_on date,
  p_proposal_id uuid,
  p_installments jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_contract_id uuid;
  v_invoice_id uuid;
  v_item jsonb;
  v_position integer := 0;
  v_sum numeric := 0;
  v_ends_on date;
begin
  if jsonb_array_length(p_installments) < 1 then
    raise exception 'Un contrato necesita al menos una cuota.';
  end if;

  -- Las cuotas tienen que sumar el total. Se comprueba aquí y no solo en el
  -- formulario: es la última línea antes de los datos.
  select sum((value->>'amount')::numeric), max((value->>'dueDate')::date)
    into v_sum, v_ends_on
    from jsonb_array_elements(p_installments);

  if round(v_sum, 2) <> round(p_total, 2) then
    raise exception 'Las cuotas suman % y el total es %.', v_sum, p_total;
  end if;

  -- contracts exige ends_on >= starts_on. Si alguien fecha todas las cuotas
  -- antes del inicio, el contrato termina el día que empieza.
  v_ends_on := greatest(v_ends_on, p_starts_on);

  insert into public.contracts (
    organization_id, company_id, proposal_id, title, value, starts_on, ends_on, created_by
  ) values (
    p_organization_id, p_company_id, p_proposal_id, p_title, p_total, p_starts_on, v_ends_on, auth.uid()
  )
  returning id into v_contract_id;

  for v_item in select value from jsonb_array_elements(p_installments)
  loop
    v_position := v_position + 1;

    insert into public.invoices (
      organization_id, company_id, contract_id, number, issue_date, due_date,
      subtotal, total, created_by
    ) values (
      p_organization_id,
      p_company_id,
      v_contract_id,
      'INV-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
      p_starts_on,
      -- Una cuota no puede vencer antes de emitirse; si la primera es
      -- anterior al inicio del contrato, se emite ese mismo día.
      greatest((v_item->>'dueDate')::date, p_starts_on),
      (v_item->>'amount')::numeric,
      (v_item->>'amount')::numeric,
      auth.uid()
    )
    returning id into v_invoice_id;

    insert into public.invoice_items (invoice_id, description, quantity, unit_price, position)
    values (
      v_invoice_id,
      'Cuota ' || v_position || ' de ' || jsonb_array_length(p_installments) || ' — ' || p_title,
      1,
      (v_item->>'amount')::numeric,
      v_position
    );
  end loop;

  return v_contract_id;
end;
$$;
