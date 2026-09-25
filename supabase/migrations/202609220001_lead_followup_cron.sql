-- Antes, `next_action_at` en un lead era solo un dato guardado: nadie lo
-- revisaba por su cuenta. Había que entrar a la lista de Leads y ordenar por
-- esa fecha para acordarte de escribirle a alguien. Esto lo convierte en un
-- recordatorio real: cuando llega la fecha, aparece solo en Tareas.
--
-- `followup_notified_at` guarda para qué `next_action_at` ya se creó el
-- aviso, así el job puede correr cada hora sin duplicar la tarea. Si más
-- adelante alguien reprograma el seguimiento (cambia `next_action_at`), deja
-- de coincidir con `followup_notified_at` y el job vuelve a avisar para la
-- nueva fecha.

alter table public.leads add column followup_notified_at timestamptz;

create or replace function public.create_due_lead_followup_tasks()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tasks (
    organization_id, company_id, contact_id, lead_id,
    title, priority, due_at, owner_id, created_by
  )
  select
    l.organization_id,
    l.company_id,
    l.contact_id,
    l.id,
    -- `left(..., 180)` porque tasks.title exige <= 180 caracteres y
    -- next_action/el nombre de la empresa son texto libre sin tope: sin el
    -- truncado, una sola fila con un título largo revienta el insert
    -- completo y ninguna tarea se crea esa hora, para ningún lead.
    left(
      coalesce(nullif(trim(l.next_action), ''), 'Seguimiento') || ' — ' || coalesce(c.name, 'prospecto'),
      180
    ),
    'high',
    l.next_action_at,
    l.owner_id,
    l.owner_id
  from public.leads l
  left join public.companies c on c.id = l.company_id
  where l.next_action_at is not null
    and l.next_action_at <= now()
    and l.status in ('new', 'contacted', 'unqualified')
    and l.followup_notified_at is distinct from l.next_action_at;

  update public.leads
  set followup_notified_at = next_action_at
  where next_action_at is not null
    and next_action_at <= now()
    and status in ('new', 'contacted', 'unqualified')
    and followup_notified_at is distinct from next_action_at;
end;
$$;

-- Sin este revoke, PostgREST expone la función como rpc/create_due_lead_...
-- a cualquier usuario autenticado (Postgres otorga EXECUTE a PUBLIC al
-- crearla). Como corre `security definer`, llamarla así saltaría las
-- políticas RLS de leads/tasks y tocaría filas de cualquier organización,
-- no solo la de quien la invoque. pg_cron no necesita este permiso: llama a
-- la función como el rol que agenda el job, no vía la API de PostgREST.
revoke execute on function public.create_due_lead_followup_tasks() from public, anon, authenticated;

-- pg_cron corre como superusuario y agenda la ejecución periódica; si el
-- proyecto de Supabase no tiene la extensión habilitada, este `create
-- extension` puede fallar por permisos — en ese caso se activa una vez desde
-- el dashboard (Database → Extensions → pg_cron) y se repite solo la parte
-- de `cron.schedule` de abajo.
create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'lead-followup-tasks-hourly',
  '0 * * * *',
  $$select public.create_due_lead_followup_tasks();$$
);
