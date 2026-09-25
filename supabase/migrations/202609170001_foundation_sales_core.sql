-- AutomAI CRM OS - Foundation + Sales Core
-- Additive first migration for a new Supabase project. Do not run against a populated database
-- until backup/PITR and SQL review have been completed.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create type public.app_role as enum ('owner', 'admin', 'sales', 'operations', 'finance', 'viewer');
create type public.record_status as enum ('active', 'archived');
create type public.deal_status as enum ('open', 'won', 'lost');
create type public.task_status as enum ('todo', 'in_progress', 'waiting', 'completed');
create type public.task_priority as enum ('low', 'medium', 'high');
create type public.activity_type as enum ('note', 'call', 'email', 'whatsapp', 'meeting', 'stage_change', 'proposal', 'contract', 'task', 'payment', 'file', 'system');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  timezone text not null default 'America/Guayaquil',
  currency text not null default 'USD' check (currency = 'USD'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  monthly_revenue_goal numeric(12,2) not null default 3000 check (monthly_revenue_goal >= 0),
  mrr_goal numeric(12,2) not null default 1000 check (mrr_goal >= 0),
  locale text not null default 'es-EC',
  date_format text not null default 'dd/MM/yyyy',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table public.permissions (
  key text primary key,
  description text not null
);

create table public.roles (
  key public.app_role primary key,
  description text not null
);

create table public.role_permissions (
  role_key public.app_role not null references public.roles(key) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (role_key, permission_key)
);

create table public.user_roles (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_key public.app_role not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  primary key (organization_id, user_id)
);

create table public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (organization_id, name)
);

create table public.pipelines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (organization_id, name)
);

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  position integer not null check (position >= 0),
  probability_default smallint not null default 0 check (probability_default between 0 and 100),
  color text not null default '#6F6B64' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  stage_kind text not null default 'open' check (stage_kind in ('open', 'won', 'lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (pipeline_id, position),
  unique (pipeline_id, name)
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  legal_name text,
  name text not null check (char_length(trim(name)) between 2 and 160),
  industry text,
  tax_id text,
  country text not null default 'Ecuador',
  province text,
  city text,
  address text,
  website text,
  instagram_url text,
  facebook_url text,
  linkedin_url text,
  whatsapp text,
  phone text,
  email text,
  company_size text check (company_size in ('solo', 'small', 'medium', 'large')),
  source_id uuid references public.lead_sources(id) on delete set null,
  status public.record_status not null default 'active',
  owner_id uuid references auth.users(id) on delete set null,
  search_document tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(legal_name, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(industry, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (organization_id, name)
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  first_name text not null check (char_length(trim(first_name)) between 1 and 80),
  last_name text,
  job_title text,
  email text,
  phone text,
  whatsapp text,
  preferred_channel text check (preferred_channel in ('whatsapp', 'email', 'phone', 'linkedin')),
  influence text check (influence in ('decision_maker', 'influencer', 'user', 'other')),
  birthday date,
  notes text,
  owner_id uuid references auth.users(id) on delete set null,
  search_document tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(first_name, '') || ' ' || coalesce(last_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(email, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(job_title, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create unique index contacts_unique_email_per_org on public.contacts (organization_id, lower(email)) where email is not null;

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  source_id uuid references public.lead_sources(id) on delete set null,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'unqualified', 'converted')),
  note text,
  next_action text,
  next_action_at timestamptz,
  owner_id uuid references auth.users(id) on delete set null,
  converted_deal_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category text,
  description text,
  estimated_internal_cost numeric(12,2) check (estimated_internal_cost >= 0),
  reference_price numeric(12,2) check (reference_price >= 0),
  recurrence_possible boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (organization_id, name)
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  pipeline_id uuid not null references public.pipelines(id) on delete restrict,
  stage_id uuid not null references public.pipeline_stages(id) on delete restrict,
  company_id uuid references public.companies(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  name text not null check (char_length(trim(name)) between 2 and 180),
  status public.deal_status not null default 'open',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  problem_detected text,
  proposed_solution text,
  implementation_value numeric(12,2) not null default 0 check (implementation_value >= 0),
  potential_mrr numeric(12,2) not null default 0 check (potential_mrr >= 0),
  probability smallint not null default 0 check (probability between 0 and 100),
  weighted_value numeric(12,2) generated always as (round(implementation_value * probability / 100, 2)) stored,
  estimated_close_date date,
  next_action text,
  next_action_at timestamptz,
  last_contact_at timestamptz,
  lost_reason text,
  competitor text,
  owner_id uuid references auth.users(id) on delete set null,
  search_document tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(problem_detected, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(proposed_solution, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.leads
  add constraint leads_converted_deal_id_fkey foreign key (converted_deal_id) references public.deals(id) on delete set null;

create table public.deal_stage_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,
  from_stage_id uuid references public.pipeline_stages(id) on delete set null,
  to_stage_id uuid not null references public.pipeline_stages(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete cascade,
  type public.activity_type not null,
  title text not null check (char_length(trim(title)) between 1 and 180),
  body text,
  occurred_at timestamptz not null default now(),
  duration_minutes integer check (duration_minutes >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  due_at timestamptz,
  reminder_at timestamptz,
  completed_at timestamptz,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  deal_id uuid not null unique references public.deals(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'completed')),
  structured_summary text,
  conducted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table public.diagnostic_answers (
  id uuid primary key default gen_random_uuid(),
  diagnostic_id uuid not null references public.diagnostics(id) on delete cascade,
  question_key text not null,
  answer text,
  created_at timestamptz not null default now(),
  unique (diagnostic_id, question_key)
);

create table public.business_problems (
  id uuid primary key default gen_random_uuid(),
  diagnostic_id uuid not null references public.diagnostics(id) on delete cascade,
  description text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  impact text,
  potential_solution text,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index user_roles_user_id_idx on public.user_roles (user_id, organization_id);
create index companies_org_owner_idx on public.companies (organization_id, owner_id);
create index contacts_org_company_idx on public.contacts (organization_id, company_id);
create index leads_org_status_idx on public.leads (organization_id, status, next_action_at);
create index deals_org_stage_idx on public.deals (organization_id, stage_id, status);
create index deals_org_owner_idx on public.deals (organization_id, owner_id, next_action_at);
create index deals_org_close_idx on public.deals (organization_id, estimated_close_date);
create index deal_stage_history_deal_idx on public.deal_stage_history (deal_id, changed_at desc);
create index activities_org_occurred_idx on public.activities (organization_id, occurred_at desc);
create index tasks_org_due_idx on public.tasks (organization_id, status, due_at);
create index audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);
create index companies_search_idx on public.companies using gin(search_document);
create index contacts_search_idx on public.contacts using gin(search_document);
create index deals_search_idx on public.deals using gin(search_document);
create index companies_name_trgm_idx on public.companies using gin(name gin_trgm_ops);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where organization_id = target_organization_id and user_id = auth.uid()
  );
$$;

create or replace function public.has_permission(target_organization_id uuid, requested_permission text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_key = ur.role_key
    where ur.organization_id = target_organization_id
      and ur.user_id = auth.uid()
      and rp.permission_key = requested_permission
  );
$$;

create or replace function public.record_deal_stage_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.stage_id is distinct from new.stage_id then
    insert into public.deal_stage_history (organization_id, deal_id, from_stage_id, to_stage_id, actor_id)
    values (new.organization_id, new.id, old.stage_id, new.stage_id, auth.uid());

    insert into public.activities (organization_id, company_id, contact_id, deal_id, type, title, occurred_at, created_by)
    values (
      new.organization_id, new.company_id, new.contact_id, new.id, 'stage_change',
      'Oportunidad movida de etapa', now(), auth.uid()
    );
  end if;
  return new;
end;
$$;

create or replace function public.audit_sensitive_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
  target_id uuid;
  target_org uuid;
begin
  payload := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_id := nullif(payload ->> 'id', '')::uuid;
  target_org := (payload ->> 'organization_id')::uuid;

  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    target_org, auth.uid(), lower(tg_op), tg_table_name, target_id,
    jsonb_build_object('changed_at', now())
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger companies_updated_at before update on public.companies for each row execute procedure public.set_updated_at();
create trigger contacts_updated_at before update on public.contacts for each row execute procedure public.set_updated_at();
create trigger leads_updated_at before update on public.leads for each row execute procedure public.set_updated_at();
create trigger deals_updated_at before update on public.deals for each row execute procedure public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks for each row execute procedure public.set_updated_at();
create trigger diagnostics_updated_at before update on public.diagnostics for each row execute procedure public.set_updated_at();
create trigger deal_stage_changed after update of stage_id on public.deals for each row execute procedure public.record_deal_stage_history();
create trigger audit_deals after insert or update or delete on public.deals for each row execute procedure public.audit_sensitive_change();
create trigger audit_user_roles after insert or update or delete on public.user_roles for each row execute procedure public.audit_sensitive_change();

insert into public.roles (key, description) values
  ('owner', 'Acceso absoluto y configuración crítica'),
  ('admin', 'Administración operativa'),
  ('sales', 'Gestión comercial'),
  ('operations', 'Gestión de entrega'),
  ('finance', 'Gestión financiera comercial'),
  ('viewer', 'Consulta autorizada')
on conflict do nothing;

insert into public.permissions (key, description) values
  ('crm.read', 'Consultar empresas, contactos, prospectos, oportunidades y timeline'),
  ('crm.write', 'Crear y actualizar empresas, contactos, prospectos y oportunidades'),
  ('tasks.read', 'Consultar tareas'),
  ('tasks.write', 'Crear y actualizar tareas'),
  ('diagnostics.read', 'Consultar diagnósticos'),
  ('diagnostics.write', 'Crear y actualizar diagnósticos'),
  ('finance.read', 'Consultar módulos financieros'),
  ('finance.write', 'Modificar módulos financieros'),
  ('system.manage', 'Gestionar roles e integraciones'),
  ('audit.read', 'Consultar auditoría'),
  ('records.delete', 'Eliminar registros')
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
select role_key, permission_key
from (values
  ('owner'::public.app_role, 'crm.read'), ('owner', 'crm.write'), ('owner', 'tasks.read'), ('owner', 'tasks.write'), ('owner', 'diagnostics.read'), ('owner', 'diagnostics.write'), ('owner', 'finance.read'), ('owner', 'finance.write'), ('owner', 'system.manage'), ('owner', 'audit.read'), ('owner', 'records.delete'),
  ('admin'::public.app_role, 'crm.read'), ('admin', 'crm.write'), ('admin', 'tasks.read'), ('admin', 'tasks.write'), ('admin', 'diagnostics.read'), ('admin', 'diagnostics.write'), ('admin', 'finance.read'), ('admin', 'finance.write'), ('admin', 'audit.read'),
  ('sales'::public.app_role, 'crm.read'), ('sales', 'crm.write'), ('sales', 'tasks.read'), ('sales', 'tasks.write'), ('sales', 'diagnostics.read'), ('sales', 'diagnostics.write'),
  ('operations'::public.app_role, 'crm.read'), ('operations', 'tasks.read'), ('operations', 'tasks.write'),
  ('finance'::public.app_role, 'tasks.read'), ('finance', 'finance.read'), ('finance', 'finance.write'),
  ('viewer'::public.app_role, 'crm.read'), ('viewer', 'tasks.read'), ('viewer', 'diagnostics.read')
) as role_map(role_key, permission_key)
on conflict do nothing;

create or replace function public.create_organization_for_owner(
  organization_name text,
  organization_slug text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_organization_id uuid;
  sales_pipeline_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (trim(organization_name), lower(trim(organization_slug)), auth.uid())
  returning id into new_organization_id;

  insert into public.organization_settings (organization_id, created_by)
  values (new_organization_id, auth.uid());

  insert into public.user_roles (organization_id, user_id, role_key, created_by)
  values (new_organization_id, auth.uid(), 'owner', auth.uid());

  insert into public.lead_sources (organization_id, name, position, created_by)
  values
    (new_organization_id, 'Prospección manual', 10, auth.uid()),
    (new_organization_id, 'Instagram', 20, auth.uid()),
    (new_organization_id, 'Feria', 30, auth.uid()),
    (new_organization_id, 'Referido', 40, auth.uid()),
    (new_organization_id, 'Web', 50, auth.uid()),
    (new_organization_id, 'LinkedIn', 60, auth.uid()),
    (new_organization_id, 'Google', 70, auth.uid()),
    (new_organization_id, 'Networking', 80, auth.uid()),
    (new_organization_id, 'Universidad', 90, auth.uid()),
    (new_organization_id, 'Cliente existente', 100, auth.uid()),
    (new_organization_id, 'Otro', 110, auth.uid());

  insert into public.pipelines (organization_id, name, is_default, created_by)
  values (new_organization_id, 'Ventas', true, auth.uid())
  returning id into sales_pipeline_id;

  insert into public.pipeline_stages (organization_id, pipeline_id, name, position, probability_default, color, stage_kind, created_by)
  values
    (new_organization_id, sales_pipeline_id, 'Prospecto', 10, 10, '#6F6B64', 'open', auth.uid()),
    (new_organization_id, sales_pipeline_id, 'Contactado', 20, 20, '#B45309', 'open', auth.uid()),
    (new_organization_id, sales_pipeline_id, 'Diagnóstico', 30, 35, '#9A6700', 'open', auth.uid()),
    (new_organization_id, sales_pipeline_id, 'Propuesta', 40, 50, '#C2410C', 'open', auth.uid()),
    (new_organization_id, sales_pipeline_id, 'Negociación', 50, 75, '#FF4D00', 'open', auth.uid()),
    (new_organization_id, sales_pipeline_id, 'Ganado', 60, 100, '#4D7C0F', 'won', auth.uid()),
    (new_organization_id, sales_pipeline_id, 'Perdido', 70, 0, '#B42318', 'lost', auth.uid());

  return new_organization_id;
end;
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_settings enable row level security;
alter table public.user_roles enable row level security;
alter table public.lead_sources enable row level security;
alter table public.pipelines enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.leads enable row level security;
alter table public.services enable row level security;
alter table public.deals enable row level security;
alter table public.deal_stage_history enable row level security;
alter table public.activities enable row level security;
alter table public.tasks enable row level security;
alter table public.diagnostics enable row level security;
alter table public.diagnostic_answers enable row level security;
alter table public.business_problems enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_self_select on public.profiles for select using (id = auth.uid());
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy roles_read on public.roles for select using (auth.uid() is not null);
create policy permissions_read on public.permissions for select using (auth.uid() is not null);
create policy role_permissions_read on public.role_permissions for select using (auth.uid() is not null);

create policy organizations_read on public.organizations for select using (public.is_org_member(id));
create policy organizations_update on public.organizations for update using (public.has_permission(id, 'system.manage')) with check (public.has_permission(id, 'system.manage'));
create policy settings_read on public.organization_settings for select using (public.is_org_member(organization_id));
create policy settings_update on public.organization_settings for update using (public.has_permission(organization_id, 'system.manage')) with check (public.has_permission(organization_id, 'system.manage'));
create policy user_roles_read on public.user_roles for select using (public.is_org_member(organization_id));
create policy user_roles_write on public.user_roles for all using (public.has_permission(organization_id, 'system.manage')) with check (public.has_permission(organization_id, 'system.manage'));

create policy lead_sources_access on public.lead_sources for all using (public.has_permission(organization_id, 'crm.read')) with check (public.has_permission(organization_id, 'crm.write'));
create policy pipelines_access on public.pipelines for all using (public.has_permission(organization_id, 'crm.read')) with check (public.has_permission(organization_id, 'crm.write'));
create policy pipeline_stages_access on public.pipeline_stages for all using (public.has_permission(organization_id, 'crm.read')) with check (public.has_permission(organization_id, 'crm.write'));
create policy companies_access on public.companies for all using (public.has_permission(organization_id, 'crm.read')) with check (public.has_permission(organization_id, 'crm.write'));
create policy contacts_access on public.contacts for all using (public.has_permission(organization_id, 'crm.read')) with check (public.has_permission(organization_id, 'crm.write'));
create policy leads_access on public.leads for all using (public.has_permission(organization_id, 'crm.read')) with check (public.has_permission(organization_id, 'crm.write'));
create policy services_access on public.services for all using (public.has_permission(organization_id, 'crm.read')) with check (public.has_permission(organization_id, 'crm.write'));
create policy deals_access on public.deals for all using (public.has_permission(organization_id, 'crm.read')) with check (public.has_permission(organization_id, 'crm.write'));
create policy history_read on public.deal_stage_history for select using (public.has_permission(organization_id, 'crm.read'));
create policy activities_access on public.activities for all using (public.has_permission(organization_id, 'crm.read')) with check (public.has_permission(organization_id, 'crm.write'));
create policy tasks_access on public.tasks for all using (public.has_permission(organization_id, 'tasks.read')) with check (public.has_permission(organization_id, 'tasks.write'));
create policy diagnostics_access on public.diagnostics for all using (public.has_permission(organization_id, 'diagnostics.read')) with check (public.has_permission(organization_id, 'diagnostics.write'));
create policy diagnostic_answers_read on public.diagnostic_answers for select using (exists (select 1 from public.diagnostics d where d.id = diagnostic_id and public.has_permission(d.organization_id, 'diagnostics.read')));
create policy diagnostic_answers_write on public.diagnostic_answers for all using (exists (select 1 from public.diagnostics d where d.id = diagnostic_id and public.has_permission(d.organization_id, 'diagnostics.write'))) with check (exists (select 1 from public.diagnostics d where d.id = diagnostic_id and public.has_permission(d.organization_id, 'diagnostics.write')));
create policy business_problems_read on public.business_problems for select using (exists (select 1 from public.diagnostics d where d.id = diagnostic_id and public.has_permission(d.organization_id, 'diagnostics.read')));
create policy business_problems_write on public.business_problems for all using (exists (select 1 from public.diagnostics d where d.id = diagnostic_id and public.has_permission(d.organization_id, 'diagnostics.write'))) with check (exists (select 1 from public.diagnostics d where d.id = diagnostic_id and public.has_permission(d.organization_id, 'diagnostics.write')));
create policy audit_logs_read on public.audit_logs for select using (public.has_permission(organization_id, 'audit.read'));
