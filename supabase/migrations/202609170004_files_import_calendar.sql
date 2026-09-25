-- AutomAI CRM OS — Files, imports and calendar hardening (strictly additive).
-- No existing records, policies or objects are removed or widened.

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check (entity_type in ('companies', 'contacts', 'deals')),
  row_count integer not null check (row_count > 0 and row_count <= 5000),
  imported_at timestamptz not null default now(),
  imported_by uuid not null references auth.users(id) on delete restrict
);
create index if not exists import_batches_org_created_idx on public.import_batches (organization_id, imported_at desc);
create trigger audit_import_batches after insert or update or delete on public.import_batches for each row execute procedure public.audit_sensitive_change();
alter table public.import_batches enable row level security;
create policy import_batches_access on public.import_batches for select using (public.has_permission(organization_id, 'operations.read'));
create policy import_batches_write on public.import_batches for insert with check (public.has_permission(organization_id, 'operations.write') and imported_by = auth.uid());

-- Private bucket: object access is granted only to authenticated users belonging
-- to the organization encoded as the first path segment (<organization UUID>/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('automai-documents', 'automai-documents', false, 26214400, array['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'])
on conflict (id) do nothing;
create policy automai_documents_select on storage.objects for select to authenticated using (
  bucket_id = 'automai-documents' and (storage.foldername(name))[1] in (select organization_id::text from public.user_roles where user_id = auth.uid())
);
create policy automai_documents_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'automai-documents' and (storage.foldername(name))[1] in (select organization_id::text from public.user_roles where user_id = auth.uid())
);
create policy automai_documents_delete on storage.objects for delete to authenticated using (
  bucket_id = 'automai-documents' and (storage.foldername(name))[1] in (select organization_id::text from public.user_roles where user_id = auth.uid())
);
