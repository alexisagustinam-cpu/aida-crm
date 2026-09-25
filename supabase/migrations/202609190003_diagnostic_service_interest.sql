-- Interés por servicio dentro de un diagnóstico.
--
-- El diagnóstico ya guardaba los problemas del negocio (con gravedad e
-- impacto) y respuestas libres, pero no lo que más se necesita al volver a
-- ese cliente meses después: qué servicios le ofreciste, cuáles quiso y
-- cuáles descartó. Eso hoy solo existía si terminabas en una propuesta, y
-- un "ahora no, quizá más adelante" nunca llega a propuesta.
--
-- Va por diagnóstico y no por empresa porque el interés cambia con el
-- tiempo: lo que descartó en marzo puede querer en octubre, y el histórico
-- es justamente el dato que sirve.

create table public.diagnostic_service_interest (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  diagnostic_id uuid not null references public.diagnostics(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  -- 'wanted'   lo quiere ahora
  -- 'later'    le interesa pero no es prioridad
  -- 'declined' lo descartó
  interest text not null default 'wanted' check (interest in ('wanted', 'later', 'declined')),
  priority integer not null default 0,
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  -- Un servicio aparece una sola vez por diagnóstico: cambiar de opinión
  -- actualiza la fila, no añade otra.
  unique (diagnostic_id, service_id)
);

create index diagnostic_service_interest_diagnostic_idx
  on public.diagnostic_service_interest (diagnostic_id);

alter table public.diagnostic_service_interest enable row level security;

create policy diagnostic_service_interest_access
  on public.diagnostic_service_interest
  for all
  using (public.has_permission(organization_id, 'diagnostics.read'))
  with check (public.has_permission(organization_id, 'diagnostics.write'));
