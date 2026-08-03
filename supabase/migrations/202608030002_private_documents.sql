-- Private document storage. Paths must start with the organization UUID:
-- <organization_id>/<pilgrim-or-trip>/<random-uuid>.<extension>

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'private-documents',
  'private-documents',
  false,
  20971520,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy private_documents_read
on storage.objects for select to authenticated
using (
  bucket_id = 'private-documents'
  and exists (
    select 1
    from public.documents d
    where d.storage_path = name
      and d.organization_id = case
        when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then ((storage.foldername(name))[1])::uuid
        else null
      end
      and public.is_org_member(d.organization_id)
      and (
        not d.is_sensitive
        or public.has_org_role(d.organization_id, array['admin','manager','operator','guide']::public.app_role[])
      )
  )
);

create policy private_documents_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'private-documents'
  and public.has_org_role(
    case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then ((storage.foldername(name))[1])::uuid
      else null
    end,
    array['admin','manager','operator']::public.app_role[]
  )
);

create policy private_documents_update
on storage.objects for update to authenticated
using (
  bucket_id = 'private-documents'
  and public.has_org_role(
    case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then ((storage.foldername(name))[1])::uuid
      else null
    end,
    array['admin','manager','operator']::public.app_role[]
  )
)
with check (
  bucket_id = 'private-documents'
  and public.has_org_role(
    case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then ((storage.foldername(name))[1])::uuid
      else null
    end,
    array['admin','manager','operator']::public.app_role[]
  )
);

create policy private_documents_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'private-documents'
  and public.has_org_role(
    case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then ((storage.foldername(name))[1])::uuid
      else null
    end,
    array['admin','manager']::public.app_role[]
  )
);
