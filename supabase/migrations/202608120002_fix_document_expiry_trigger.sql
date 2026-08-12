create or replace function public.sync_pilgrim_document_expiry()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_pilgrim_id uuid;
begin
  if tg_op = 'DELETE' then
    target_pilgrim_id := old.pilgrim_id;
  else
    target_pilgrim_id := new.pilgrim_id;
  end if;
  if target_pilgrim_id is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  update public.pilgrims pilgrim
  set document_expiry = (
    select max(document.expires_on)
    from public.documents document
    where document.pilgrim_id = target_pilgrim_id
      and document.kind in ('identity', 'passport')
  )
  where pilgrim.id = target_pilgrim_id;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

revoke all on function public.sync_pilgrim_document_expiry() from public;
