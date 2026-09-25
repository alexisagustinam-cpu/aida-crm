-- AutomAI CRM OS — Commercial, Delivery and Finance (additive)
-- This migration deliberately only adds objects; it never removes operational data.

do $$ begin
  create type public.proposal_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.contract_status as enum ('draft', 'active', 'expired', 'cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.project_status as enum ('planned', 'active', 'on_hold', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.deliverable_status as enum ('not_started', 'in_progress', 'review', 'completed', 'blocked');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.subscription_frequency as enum ('monthly', 'annual');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.subscription_status as enum ('trial', 'active', 'past_due', 'paused', 'cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.invoice_status as enum ('draft', 'issued', 'partial', 'paid', 'overdue', 'void');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_method as enum ('bank_transfer', 'cash', 'card', 'other');
exception when duplicate_object then null; end $$;

-- Services was introduced by the foundation migration. Keep this idempotent
-- declaration so this commercial migration remains self-describing and additive.
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, category text, description text, estimated_internal_cost numeric(12,2) check (estimated_internal_cost >= 0),
  reference_price numeric(12,2) check (reference_price >= 0), recurrence_possible boolean not null default false, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id) on delete set null,
  unique (organization_id, name)
);

create table public.proposals (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict, deal_id uuid references public.deals(id) on delete set null,
  title text not null check (char_length(trim(title)) between 2 and 180), status public.proposal_status not null default 'draft', valid_until date,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0), tax_total numeric(12,2) not null default 0 check (tax_total >= 0), total numeric(12,2) not null default 0 check (total >= 0),
  sent_at timestamptz, responded_at timestamptz, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id) on delete set null
);
create table public.proposal_items (
  id uuid primary key default gen_random_uuid(), proposal_id uuid not null references public.proposals(id) on delete cascade, service_id uuid references public.services(id) on delete set null,
  description text not null check (char_length(trim(description)) between 1 and 500), quantity numeric(12,2) not null check (quantity > 0), unit_price numeric(12,2) not null check (unit_price >= 0), line_total numeric(12,2) generated always as (round(quantity * unit_price, 2)) stored, position integer not null default 0 check (position >= 0), created_at timestamptz not null default now()
);
create table public.contracts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict, proposal_id uuid references public.proposals(id) on delete set null,
  title text not null check (char_length(trim(title)) between 2 and 180), status public.contract_status not null default 'draft', starts_on date not null, ends_on date check (ends_on is null or ends_on >= starts_on), value numeric(12,2) not null default 0 check (value >= 0), signed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id) on delete set null
);
create table public.projects (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict, contract_id uuid references public.contracts(id) on delete set null, deal_id uuid references public.deals(id) on delete set null,
  name text not null check (char_length(trim(name)) between 2 and 180), status public.project_status not null default 'planned', start_date date, due_date date check (due_date is null or start_date is null or due_date >= start_date), completed_at timestamptz, owner_id uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id) on delete set null
);
create table public.project_deliverables (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade, name text not null check (char_length(trim(name)) between 2 and 180), status public.deliverable_status not null default 'not_started', due_date date, completed_at timestamptz, position integer not null default 0 check (position >= 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id) on delete set null
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict, contract_id uuid references public.contracts(id) on delete set null,
  name text not null check (char_length(trim(name)) between 2 and 180), amount numeric(12,2) not null check (amount > 0), frequency public.subscription_frequency not null, status public.subscription_status not null default 'trial', start_date date not null, end_date date check (end_date is null or end_date >= start_date), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id) on delete set null
);
create table public.invoices (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict, contract_id uuid references public.contracts(id) on delete set null, project_id uuid references public.projects(id) on delete set null,
  number text not null, status public.invoice_status not null default 'draft', issue_date date not null, due_date date not null check (due_date >= issue_date), subtotal numeric(12,2) not null default 0 check (subtotal >= 0), tax_total numeric(12,2) not null default 0 check (tax_total >= 0), total numeric(12,2) not null default 0 check (total >= 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references auth.users(id) on delete set null, unique (organization_id, number)
);
create table public.invoice_items (
  id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.invoices(id) on delete cascade, service_id uuid references public.services(id) on delete set null,
  description text not null check (char_length(trim(description)) between 1 and 500), quantity numeric(12,2) not null check (quantity > 0), unit_price numeric(12,2) not null check (unit_price >= 0), line_total numeric(12,2) generated always as (round(quantity * unit_price, 2)) stored, position integer not null default 0 check (position >= 0), created_at timestamptz not null default now()
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, invoice_id uuid not null references public.invoices(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0), paid_at timestamptz not null default now(), method public.payment_method not null default 'bank_transfer', reference text, created_at timestamptz not null default now(), created_by uuid references auth.users(id) on delete set null
);
create table public.expenses (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, project_id uuid references public.projects(id) on delete set null,
  description text not null check (char_length(trim(description)) between 2 and 500), amount numeric(12,2) not null check (amount > 0), incurred_on date not null, created_at timestamptz not null default now(), created_by uuid references auth.users(id) on delete set null
);

create index proposals_org_status_idx on public.proposals (organization_id, status, valid_until); create index contracts_org_status_idx on public.contracts (organization_id, status, ends_on); create index projects_org_status_idx on public.projects (organization_id, status, due_date); create index deliverables_project_due_idx on public.project_deliverables (project_id, status, due_date); create index subscriptions_org_mrr_idx on public.subscriptions (organization_id, status, frequency); create index invoices_org_status_due_idx on public.invoices (organization_id, status, due_date); create index payments_org_paid_idx on public.payments (organization_id, paid_at); create index expenses_org_incurred_idx on public.expenses (organization_id, incurred_on);

create or replace function public.refresh_proposal_totals() returns trigger language plpgsql security definer set search_path = public as $$ declare target uuid; begin target := case when tg_op = 'DELETE' then old.proposal_id else new.proposal_id end; update public.proposals set subtotal = coalesce((select sum(line_total) from public.proposal_items where proposal_id = target), 0), total = coalesce((select sum(line_total) from public.proposal_items where proposal_id = target), 0) + tax_total where id = target; if tg_op = 'DELETE' then return old; end if; return new; end; $$;
create or replace function public.refresh_invoice_totals_and_status() returns trigger language plpgsql security definer set search_path = public as $$ declare target uuid; paid numeric(12,2); invoice_total numeric(12,2); invoice_due date; begin target := case when tg_op = 'DELETE' then old.invoice_id else new.invoice_id end; update public.invoices set subtotal = coalesce((select sum(line_total) from public.invoice_items where invoice_id = target), 0), total = coalesce((select sum(line_total) from public.invoice_items where invoice_id = target), 0) + tax_total where id = target; select total, due_date, coalesce((select sum(amount) from public.payments where invoice_id = target), 0) into invoice_total, invoice_due, paid from public.invoices where id = target; update public.invoices set status = case when status = 'void' then 'void' when paid >= invoice_total and invoice_total > 0 then 'paid' when paid > 0 then 'partial' when issue_date <= current_date and invoice_due < current_date then 'overdue' when issue_date <= current_date then 'issued' else 'draft' end where id = target; if tg_op = 'DELETE' then return old; end if; return new; end; $$;
create or replace function public.convert_won_deal_to_project(target_deal_id uuid, project_name text) returns uuid language plpgsql security definer set search_path = public as $$ declare deal_row public.deals%rowtype; project_id uuid; begin select * into deal_row from public.deals where id = target_deal_id and organization_id in (select organization_id from public.user_roles where user_id = auth.uid()); if not found or deal_row.status <> 'won' then raise exception 'Only won deals can be converted'; end if; select id into project_id from public.projects where deal_id = target_deal_id; if project_id is null then insert into public.projects (organization_id, company_id, deal_id, name, status, owner_id, created_by) values (deal_row.organization_id, deal_row.company_id, deal_row.id, trim(project_name), 'planned', auth.uid(), auth.uid()) returning id into project_id; end if; return project_id; end; $$;

create trigger proposal_items_refresh after insert or update or delete on public.proposal_items for each row execute procedure public.refresh_proposal_totals(); create trigger invoice_items_refresh after insert or update or delete on public.invoice_items for each row execute procedure public.refresh_invoice_totals_and_status(); create trigger payments_refresh after insert or update or delete on public.payments for each row execute procedure public.refresh_invoice_totals_and_status();
create trigger proposals_updated_at before update on public.proposals for each row execute procedure public.set_updated_at(); create trigger contracts_updated_at before update on public.contracts for each row execute procedure public.set_updated_at(); create trigger projects_updated_at before update on public.projects for each row execute procedure public.set_updated_at(); create trigger deliverables_updated_at before update on public.project_deliverables for each row execute procedure public.set_updated_at(); create trigger subscriptions_updated_at before update on public.subscriptions for each row execute procedure public.set_updated_at(); create trigger invoices_updated_at before update on public.invoices for each row execute procedure public.set_updated_at();
create trigger audit_proposals after insert or update or delete on public.proposals for each row execute procedure public.audit_sensitive_change(); create trigger audit_contracts after insert or update or delete on public.contracts for each row execute procedure public.audit_sensitive_change(); create trigger audit_projects after insert or update or delete on public.projects for each row execute procedure public.audit_sensitive_change(); create trigger audit_invoices after insert or update or delete on public.invoices for each row execute procedure public.audit_sensitive_change(); create trigger audit_payments after insert or update or delete on public.payments for each row execute procedure public.audit_sensitive_change(); create trigger audit_expenses after insert or update or delete on public.expenses for each row execute procedure public.audit_sensitive_change();

insert into public.permissions (key, description) values ('commercial.read', 'Consultar servicios, propuestas y contratos'), ('commercial.write', 'Gestionar servicios, propuestas y contratos'), ('delivery.read', 'Consultar proyectos y entregables'), ('delivery.write', 'Gestionar proyectos y entregables') on conflict do nothing;
insert into public.role_permissions (role_key, permission_key) values ('owner', 'commercial.read'), ('owner', 'commercial.write'), ('owner', 'delivery.read'), ('owner', 'delivery.write'), ('admin', 'commercial.read'), ('admin', 'commercial.write'), ('admin', 'delivery.read'), ('admin', 'delivery.write'), ('sales', 'commercial.read'), ('sales', 'commercial.write'), ('operations', 'commercial.read'), ('operations', 'delivery.read'), ('operations', 'delivery.write'), ('finance', 'commercial.read') on conflict do nothing;

alter table public.proposals enable row level security; alter table public.proposal_items enable row level security; alter table public.contracts enable row level security; alter table public.projects enable row level security; alter table public.project_deliverables enable row level security; alter table public.subscriptions enable row level security; alter table public.invoices enable row level security; alter table public.invoice_items enable row level security; alter table public.payments enable row level security; alter table public.expenses enable row level security;
create policy proposals_access on public.proposals for all using (public.has_permission(organization_id, 'commercial.read')) with check (public.has_permission(organization_id, 'commercial.write')); create policy contracts_access on public.contracts for all using (public.has_permission(organization_id, 'commercial.read')) with check (public.has_permission(organization_id, 'commercial.write')); create policy projects_access on public.projects for all using (public.has_permission(organization_id, 'delivery.read')) with check (public.has_permission(organization_id, 'delivery.write')); create policy subscriptions_access on public.subscriptions for all using (public.has_permission(organization_id, 'finance.read')) with check (public.has_permission(organization_id, 'finance.write')); create policy invoices_access on public.invoices for all using (public.has_permission(organization_id, 'finance.read')) with check (public.has_permission(organization_id, 'finance.write')); create policy payments_access on public.payments for all using (public.has_permission(organization_id, 'finance.read')) with check (public.has_permission(organization_id, 'finance.write')); create policy expenses_access on public.expenses for all using (public.has_permission(organization_id, 'finance.read')) with check (public.has_permission(organization_id, 'finance.write'));
create policy proposal_items_access on public.proposal_items for all using (exists (select 1 from public.proposals p where p.id = proposal_id and public.has_permission(p.organization_id, 'commercial.read'))) with check (exists (select 1 from public.proposals p where p.id = proposal_id and public.has_permission(p.organization_id, 'commercial.write'))); create policy deliverables_access on public.project_deliverables for all using (exists (select 1 from public.projects p where p.id = project_id and public.has_permission(p.organization_id, 'delivery.read'))) with check (exists (select 1 from public.projects p where p.id = project_id and public.has_permission(p.organization_id, 'delivery.write'))); create policy invoice_items_access on public.invoice_items for all using (exists (select 1 from public.invoices i where i.id = invoice_id and public.has_permission(i.organization_id, 'finance.read'))) with check (exists (select 1 from public.invoices i where i.id = invoice_id and public.has_permission(i.organization_id, 'finance.write')));
