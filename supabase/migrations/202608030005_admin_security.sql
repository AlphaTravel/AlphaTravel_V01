-- Administrative control plane hardening.
-- Membership writes are only possible through a constrained RPC or a trusted
-- Supabase Edge Function. Administrators must have an AAL2 (MFA) session.

alter table public.organization_members
  add column if not exists email text;

alter table public.organization_members
  add constraint organization_members_email_format
  check (
    email is null
    or email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  );

create unique index if not exists organization_members_org_email_idx
  on public.organization_members (organization_id, lower(email))
  where email is not null;

insert into public.organizations (name, slug, timezone, currency)
values ('AlphaTravel', 'alphatravel', 'Europe/Rome', 'EUR')
on conflict (slug) do nothing;

drop policy if exists members_read on public.organization_members;
drop policy if exists members_admin_all on public.organization_members;
drop policy if exists audit_read on public.audit_logs;
drop policy if exists organizations_update on public.organizations;

create policy members_self_read
on public.organization_members for select to authenticated
using (user_id = auth.uid());

create policy members_admin_read
on public.organization_members for select to authenticated
using (
  public.has_org_role(organization_id, array['admin']::public.app_role[])
  and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
);

create policy audit_admin_mfa_read
on public.audit_logs for select to authenticated
using (
  public.has_org_role(organization_id, array['admin']::public.app_role[])
  and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
);

create policy organizations_admin_mfa_update
on public.organizations for update to authenticated
using (
  public.has_org_role(id, array['admin']::public.app_role[])
  and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
)
with check (
  public.has_org_role(id, array['admin']::public.app_role[])
  and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
);

-- Prevent direct Data API membership changes. The RPC below applies the
-- invariants; the Edge Function uses a server-side secret only inside Supabase.
revoke insert, update, delete on table public.organization_members from authenticated;

create or replace function public.protect_last_active_admin()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  removes_admin boolean;
begin
  if tg_op = 'DELETE' then
    removes_admin := true;
  else
    removes_admin := not new.is_active or new.role <> 'admin';
  end if;

  if old.role = 'admin' and old.is_active and removes_admin
     and not exists (
       select 1
       from public.organization_members m
       where m.organization_id = old.organization_id
         and m.user_id <> old.user_id
         and m.role = 'admin'
         and m.is_active
     ) then
    raise exception 'At least one active administrator is required';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists members_last_admin_guard on public.organization_members;
create trigger members_last_admin_guard
before update or delete on public.organization_members
for each row execute function public.protect_last_active_admin();

create or replace function public.write_member_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    table_name,
    record_id
  ) values (
    coalesce(new.organization_id, old.organization_id),
    auth.uid(),
    tg_op,
    'organization_members',
    coalesce(new.user_id, old.user_id)
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists members_audit on public.organization_members;
create trigger members_audit
after insert or update or delete on public.organization_members
for each row execute function public.write_member_audit_log();

create or replace function public.admin_update_member(
  target_user_id uuid,
  target_role public.app_role,
  target_active boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  org_id uuid;
begin
  org_id := public.current_organization_id();

  if auth.uid() is null
     or org_id is null
     or coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'
     or not public.has_org_role(org_id, array['admin']::public.app_role[]) then
    raise exception 'Not authorized';
  end if;

  perform 1
  from public.organization_members
  where organization_id = org_id and user_id = target_user_id
  for update;

  if not found then
    raise exception 'Member not found';
  end if;

  update public.organization_members
  set role = target_role, is_active = target_active
  where organization_id = org_id and user_id = target_user_id;
end;
$$;

revoke all on function public.admin_update_member(uuid, public.app_role, boolean) from public;
grant execute on function public.admin_update_member(uuid, public.app_role, boolean) to authenticated;
