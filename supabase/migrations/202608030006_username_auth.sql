-- Username-based access without exposing the Supabase Auth email identity.
-- Usernames are globally unique because the login form does not ask for an
-- organization identifier.

alter table public.organization_members
  add column if not exists username text;

with first_alphatravel_admin as (
  select m.organization_id, m.user_id
  from public.organization_members m
  join public.organizations o on o.id = m.organization_id
  where o.slug = 'alphatravel' and m.role = 'admin'
  order by m.created_at, m.user_id
  limit 1
)
update public.organization_members m
set username = 'admin'
from first_alphatravel_admin first_admin
where m.organization_id = first_admin.organization_id
  and m.user_id = first_admin.user_id
  and m.username is null;

update public.organization_members
set username = 'user_' || left(replace(user_id::text, '-', ''), 12)
where username is null;

alter table public.organization_members
  alter column username set not null;

alter table public.organization_members
  add constraint organization_members_username_format
  check (username ~ '^[a-z][a-z0-9._-]{2,31}$');

create unique index organization_members_username_unique_idx
  on public.organization_members (lower(username));

-- The application has no organization switcher and all authorization helpers
-- expect exactly one membership for each Auth identity.
create unique index organization_members_user_unique_idx
  on public.organization_members (user_id);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.username_login_attempts (
  attempt_key text primary key check (attempt_key ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  attempts smallint not null default 0 check (attempts between 0 and 100),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

revoke all on table private.username_login_attempts from public, anon, authenticated;

create or replace function public.consume_username_login_attempt(attempt_key text)
returns boolean
language plpgsql
security definer
set search_path = private, pg_temp
as $$
declare
  current_attempt private.username_login_attempts%rowtype;
  observed_at timestamptz := clock_timestamp();
  normalized_key text := attempt_key;
begin
  if normalized_key !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  insert into private.username_login_attempts (attempt_key)
  values (normalized_key)
  on conflict do nothing;

  select * into current_attempt
  from private.username_login_attempts
  where username_login_attempts.attempt_key = normalized_key
  for update;

  if current_attempt.blocked_until is not null and current_attempt.blocked_until > observed_at then
    return false;
  end if;

  if current_attempt.window_started_at <= observed_at - interval '15 minutes' then
    update private.username_login_attempts
    set window_started_at = observed_at,
        attempts = 1,
        blocked_until = null,
        updated_at = observed_at
    where username_login_attempts.attempt_key = normalized_key;
    return true;
  end if;

  if current_attempt.attempts >= 5 then
    update private.username_login_attempts
    set blocked_until = greatest(
          coalesce(blocked_until, observed_at),
          window_started_at + interval '15 minutes'
        ),
        updated_at = observed_at
    where username_login_attempts.attempt_key = normalized_key;
    return false;
  end if;

  update private.username_login_attempts
  set attempts = attempts + 1,
      updated_at = observed_at
  where username_login_attempts.attempt_key = normalized_key;
  return true;
end;
$$;

create or replace function public.clear_username_login_attempt(attempt_key text)
returns void
language sql
security definer
set search_path = private, pg_temp
as $$
  delete from private.username_login_attempts
  where username_login_attempts.attempt_key = $1;
$$;

revoke all on function public.consume_username_login_attempt(text) from public, anon, authenticated;
revoke all on function public.clear_username_login_attempt(text) from public, anon, authenticated;
grant execute on function public.consume_username_login_attempt(text) to service_role;
grant execute on function public.clear_username_login_attempt(text) to service_role;

drop function if exists public.admin_update_member(uuid, public.app_role, boolean);

create or replace function public.admin_update_member(
  target_user_id uuid,
  target_username text,
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
  normalized_username text := lower(trim(target_username));
begin
  org_id := public.current_organization_id();

  if auth.uid() is null
     or org_id is null
     or coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'
     or not public.has_org_role(org_id, array['admin']::public.app_role[]) then
    raise exception 'Not authorized';
  end if;

  if normalized_username !~ '^[a-z][a-z0-9._-]{2,31}$' then
    raise exception 'Invalid username';
  end if;

  perform 1
  from public.organization_members
  where organization_id = org_id and user_id = target_user_id
  for update;

  if not found then
    raise exception 'Member not found';
  end if;

  update public.organization_members
  set username = normalized_username,
      role = target_role,
      is_active = target_active
  where organization_id = org_id and user_id = target_user_id;
end;
$$;

revoke all on function public.admin_update_member(uuid, text, public.app_role, boolean) from public;
grant execute on function public.admin_update_member(uuid, text, public.app_role, boolean) to authenticated;
