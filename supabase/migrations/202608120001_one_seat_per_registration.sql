-- A participant can occupy only one seat in a trip. Keep the latest assignment
-- if old application versions ever produced duplicates, then enforce it in DB.
with ranked_assignments as (
  select id, row_number() over (
    partition by registration_id
    order by assigned_at desc, id desc
  ) as assignment_rank
  from public.seat_assignments
)
delete from public.seat_assignments assignment
using ranked_assignments ranked
where assignment.id = ranked.id
  and ranked.assignment_rank > 1;

create unique index if not exists seat_assignments_registration_unique_idx
  on public.seat_assignments (registration_id);

-- Keep the summary expiry synchronized with the real protected archive. This
-- lets every authorized role see the same readiness without exposing files.
create or replace function public.sync_pilgrim_document_expiry()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_pilgrim_id uuid;
begin
  if tg_op = 'DELETE' then target_pilgrim_id := old.pilgrim_id; else target_pilgrim_id := new.pilgrim_id; end if;
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

drop trigger if exists documents_sync_pilgrim_expiry on public.documents;
create trigger documents_sync_pilgrim_expiry
after insert or update of pilgrim_id, kind, expires_on or delete on public.documents
for each row execute function public.sync_pilgrim_document_expiry();

update public.pilgrims pilgrim
set document_expiry = archive.latest_expiry
from (
  select pilgrim_id, max(expires_on) as latest_expiry
  from public.documents
  where pilgrim_id is not null
    and kind in ('identity', 'passport')
  group by pilgrim_id
) archive
where pilgrim.id = archive.pilgrim_id;

revoke all on function public.sync_pilgrim_document_expiry() from public;
