-- Transactional platform commands. The caller JWT is authoritative; these
-- functions never trust a tenant id coming from an ordinary office user.

create or replace function public.platform_create_office(payload jsonb, new_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  created_organization_id uuid;
begin
  if auth.uid() is null or not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  if new_user_id is null or not exists (select 1 from auth.users where id = new_user_id) then raise exception 'Auth user not found'; end if;

  insert into public.organizations (
    name, slug, contact_email, phone, timezone, currency, plan,
    subscription_status, is_active, user_limit, renewal_date, notes
  ) values (
    trim(payload->>'name'), lower(trim(payload->>'slug')), lower(trim(payload->>'contactEmail')),
    nullif(trim(payload->>'phone'), ''), payload->>'timezone', payload->>'currency',
    payload->>'plan', payload->>'subscriptionStatus', true,
    (payload->>'userLimit')::integer, nullif(payload->>'renewalDate', '')::date,
    nullif(trim(payload->>'notes'), '')
  ) returning id into created_organization_id;

  insert into public.organization_members (
    organization_id, user_id, username, email, display_name, role, is_active
  ) values (
    created_organization_id, new_user_id, lower(trim(payload->>'adminUsername')),
    lower(trim(payload->>'adminEmail')), trim(payload->>'adminDisplayName'), 'admin', true
  );

  insert into public.platform_audit_logs (actor_user_id, action, target_organization_id, details)
  values (auth.uid(), 'Ufficio creato', created_organization_id, jsonb_build_object('plan', payload->>'plan'));
  return created_organization_id;
end;
$$;

create or replace function public.platform_update_office(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_organization_id uuid := (payload->>'organizationId')::uuid;
  current_slug text;
  requested_active boolean := coalesce((payload->>'isActive')::boolean, true);
begin
  if auth.uid() is null or not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  select slug into current_slug from public.organizations where id = target_organization_id for update;
  if current_slug is null then raise exception 'Office not found'; end if;
  if current_slug = 'alphatravel' and not requested_active then raise exception 'Platform office cannot be disabled'; end if;

  update public.organizations set
    name = trim(payload->>'name'),
    slug = lower(trim(payload->>'slug')),
    contact_email = lower(trim(payload->>'contactEmail')),
    phone = nullif(trim(payload->>'phone'), ''),
    timezone = payload->>'timezone',
    currency = payload->>'currency',
    plan = payload->>'plan',
    subscription_status = payload->>'subscriptionStatus',
    is_active = requested_active,
    user_limit = (payload->>'userLimit')::integer,
    renewal_date = nullif(payload->>'renewalDate', '')::date,
    notes = nullif(trim(payload->>'notes'), '')
  where id = target_organization_id;

  insert into public.platform_audit_logs (actor_user_id, action, target_organization_id, details)
  values (
    auth.uid(), case when requested_active then 'Ufficio aggiornato' else 'Ufficio disattivato' end,
    target_organization_id, jsonb_build_object('plan', payload->>'plan', 'subscriptionStatus', payload->>'subscriptionStatus')
  );
end;
$$;

create or replace function public.platform_create_member(payload jsonb, new_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_organization_id uuid := (payload->>'organizationId')::uuid;
  allowed_users integer;
  active_users integer;
begin
  if auth.uid() is null or not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  if new_user_id is null or not exists (select 1 from auth.users where id = new_user_id) then raise exception 'Auth user not found'; end if;

  select user_limit into allowed_users from public.organizations where id = target_organization_id for update;
  if allowed_users is null then raise exception 'Office not found'; end if;
  select count(*) into active_users
  from public.organization_members member
  where member.organization_id = target_organization_id and member.is_active;
  if active_users >= allowed_users then raise exception 'User limit reached'; end if;

  insert into public.organization_members (
    organization_id, user_id, username, email, display_name, role, is_active
  ) values (
    target_organization_id, new_user_id, lower(trim(payload->>'username')), lower(trim(payload->>'email')),
    trim(payload->>'displayName'), (payload->>'role')::public.app_role, true
  );

  insert into public.platform_audit_logs (actor_user_id, action, target_organization_id, details)
  values (auth.uid(), 'Accesso creato', target_organization_id, jsonb_build_object('userId', new_user_id, 'role', payload->>'role'));
end;
$$;

create or replace function public.platform_get_member(target_organization_id uuid, target_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  select jsonb_build_object(
    'organizationId', member.organization_id,
    'userId', member.user_id,
    'username', member.username,
    'email', member.email,
    'displayName', member.display_name,
    'role', member.role,
    'isActive', member.is_active
  ) into result
  from public.organization_members member
  where member.organization_id = target_organization_id and member.user_id = target_user_id;
  if result is null then raise exception 'Member not found'; end if;
  return result;
end;
$$;

create or replace function public.platform_update_member(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_organization_id uuid := (payload->>'organizationId')::uuid;
  target_user_id uuid := (payload->>'userId')::uuid;
  requested_active boolean := coalesce((payload->>'isActive')::boolean, true);
  was_active boolean;
  allowed_users integer;
  active_users integer;
begin
  if auth.uid() is null or not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  select is_active into was_active from public.organization_members
  where organization_members.organization_id = target_organization_id
    and organization_members.user_id = target_user_id
  for update;
  if was_active is null then raise exception 'Member not found'; end if;
  if not requested_active and exists (select 1 from public.platform_admins administrator where administrator.user_id = target_user_id and administrator.is_active) then
    raise exception 'Platform administrator cannot be suspended';
  end if;
  if not was_active and requested_active then
    select user_limit into allowed_users from public.organizations where id = target_organization_id for update;
    select count(*) into active_users
    from public.organization_members member
    where member.organization_id = target_organization_id and member.is_active;
    if active_users >= allowed_users then raise exception 'User limit reached'; end if;
  end if;

  update public.organization_members set
    username = lower(trim(payload->>'username')),
    email = lower(trim(payload->>'email')),
    display_name = trim(payload->>'displayName'),
    role = (payload->>'role')::public.app_role,
    is_active = requested_active
  where organization_members.organization_id = target_organization_id
    and organization_members.user_id = target_user_id;

  insert into public.platform_audit_logs (actor_user_id, action, target_organization_id, details)
  values (
    auth.uid(),
    case when coalesce((payload->>'passwordChanged')::boolean, false) then 'Accesso e password aggiornati' else 'Accesso aggiornato' end,
    target_organization_id,
    jsonb_build_object('userId', target_user_id, 'role', payload->>'role', 'isActive', requested_active)
  );
end;
$$;

revoke all on function public.platform_create_office(jsonb, uuid) from public, anon;
revoke all on function public.platform_update_office(jsonb) from public, anon;
revoke all on function public.platform_create_member(jsonb, uuid) from public, anon;
revoke all on function public.platform_get_member(uuid, uuid) from public, anon;
revoke all on function public.platform_update_member(jsonb) from public, anon;
grant execute on function public.platform_create_office(jsonb, uuid) to authenticated;
grant execute on function public.platform_update_office(jsonb) to authenticated;
grant execute on function public.platform_create_member(jsonb, uuid) to authenticated;
grant execute on function public.platform_get_member(uuid, uuid) to authenticated;
grant execute on function public.platform_update_member(jsonb) to authenticated;
