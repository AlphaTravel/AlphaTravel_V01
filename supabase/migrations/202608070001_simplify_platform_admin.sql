-- Essential platform administration: compact dashboard queries, dedicated
-- office lifecycle commands and a guarded two-phase permanent deletion.

create or replace function public.platform_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $dashboard$
  with authorized as (
    select 1 where auth.uid() is not null and public.is_platform_admin()
  ),
  member_rollup as (
    select
      member.organization_id,
      count(*)::integer as member_count,
      count(*) filter (where member.is_active)::integer as active_member_count,
      jsonb_agg(
        jsonb_build_object(
          'userId', member.user_id,
          'username', member.username,
          'displayName', member.display_name,
          'role', member.role,
          'isActive', member.is_active
        ) order by member.created_at
      ) as members
    from public.organization_members member
    cross join authorized
    group by member.organization_id
  ),
  pilgrim_rollup as (
    select pilgrim.organization_id, count(*)::integer as pilgrim_count
    from public.pilgrims pilgrim
    cross join authorized
    where pilgrim.archived_at is null
    group by pilgrim.organization_id
  ),
  trip_rollup as (
    select trip.organization_id, count(*)::integer as trip_count
    from public.trips trip
    cross join authorized
    group by trip.organization_id
  ),
  office_rollup as (
    select
      organization.id,
      organization.name,
      coalesce(organization.contact_email, '') as contact_email,
      organization.is_active,
      organization.created_at,
      coalesce(member_rollup.member_count, 0) as member_count,
      coalesce(member_rollup.active_member_count, 0) as active_member_count,
      coalesce(member_rollup.members, '[]'::jsonb) as members,
      coalesce(pilgrim_rollup.pilgrim_count, 0) as pilgrim_count,
      coalesce(trip_rollup.trip_count, 0) as trip_count
    from public.organizations organization
    cross join authorized
    left join member_rollup on member_rollup.organization_id = organization.id
    left join pilgrim_rollup on pilgrim_rollup.organization_id = organization.id
    left join trip_rollup on trip_rollup.organization_id = organization.id
    where organization.slug <> 'alphatravel'
  )
  select jsonb_build_object(
    'stats', jsonb_build_object(
      'totalOffices', count(*),
      'activeOffices', count(*) filter (where office.is_active),
      'activeUsers', coalesce(sum(case when office.is_active then office.active_member_count else 0 end), 0),
      'pilgrims', coalesce(sum(office.pilgrim_count), 0),
      'trips', coalesce(sum(office.trip_count), 0)
    ),
    'offices', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', office.id,
          'name', office.name,
          'contactEmail', office.contact_email,
          'isActive', office.is_active,
          'createdAt', office.created_at,
          'memberCount', office.member_count,
          'activeMemberCount', office.active_member_count,
          'pilgrimCount', office.pilgrim_count,
          'tripCount', office.trip_count,
          'members', office.members
        ) order by office.created_at desc
      ),
      '[]'::jsonb
    )
  )
  from office_rollup office;
$dashboard$;

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
    name, slug, contact_email, timezone, currency, plan,
    subscription_status, is_active, user_limit
  ) values (
    trim(payload->>'name'), lower(trim(payload->>'slug')), lower(trim(payload->>'contactEmail')),
    'Europe/Rome', 'EUR', 'professional', 'active', true, 1000
  ) returning id into created_organization_id;

  insert into public.organization_members (
    organization_id, user_id, username, email, display_name, role, is_active
  ) values (
    created_organization_id, new_user_id, lower(trim(payload->>'adminUsername')),
    lower(trim(payload->>'adminEmail')), trim(payload->>'adminDisplayName'), 'admin', true
  );

  insert into public.platform_audit_logs (actor_user_id, action, target_organization_id)
  values (auth.uid(), 'Ufficio creato', created_organization_id);
  return created_organization_id;
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
begin
  if auth.uid() is null or not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  if new_user_id is null or not exists (select 1 from auth.users where id = new_user_id) then raise exception 'Auth user not found'; end if;
  if not exists (
    select 1 from public.organizations
    where id = target_organization_id and slug <> 'alphatravel'
  ) then raise exception 'Office not found'; end if;

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

create or replace function public.platform_update_office(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_organization_id uuid := (payload->>'organizationId')::uuid;
begin
  if auth.uid() is null or not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  if not exists (select 1 from public.organizations where id = target_organization_id and slug <> 'alphatravel') then
    raise exception 'Office not found';
  end if;

  update public.organizations
  set name = trim(payload->>'name'),
      contact_email = lower(trim(payload->>'contactEmail'))
  where id = target_organization_id;

  insert into public.platform_audit_logs (actor_user_id, action, target_organization_id)
  values (auth.uid(), 'Ufficio aggiornato', target_organization_id);
end;
$$;

create or replace function public.platform_set_office_active(target_organization_id uuid, target_active boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  if not exists (select 1 from public.organizations where id = target_organization_id and slug <> 'alphatravel') then
    raise exception 'Office not found';
  end if;

  update public.organizations set is_active = target_active where id = target_organization_id;
  insert into public.platform_audit_logs (actor_user_id, action, target_organization_id)
  values (auth.uid(), case when target_active then 'Ufficio riattivato' else 'Ufficio sospeso' end, target_organization_id);
end;
$$;

create or replace function public.platform_prepare_delete_office(target_organization_id uuid, confirmation text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  office_name text;
  office_slug text;
  user_ids jsonb;
begin
  if auth.uid() is null or not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  select name, slug into office_name, office_slug
  from public.organizations where id = target_organization_id for update;
  if office_name is null then raise exception 'Office not found'; end if;
  if office_slug = 'alphatravel' then raise exception 'Platform office cannot be deleted'; end if;
  if confirmation is null or confirmation <> office_name then raise exception 'Invalid confirmation'; end if;

  update public.organizations set is_active = false where id = target_organization_id;
  select coalesce(jsonb_agg(member.user_id), '[]'::jsonb) into user_ids
  from public.organization_members member
  where member.organization_id = target_organization_id;

  insert into public.platform_audit_logs (actor_user_id, action, target_organization_id)
  values (auth.uid(), 'Eliminazione ufficio avviata', target_organization_id);
  return jsonb_build_object('name', office_name, 'userIds', user_ids);
end;
$$;

create or replace function public.platform_delete_office(target_organization_id uuid, confirmation text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  office_name text;
  office_slug text;
begin
  if auth.uid() is null or not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  select name, slug into office_name, office_slug
  from public.organizations where id = target_organization_id for update;
  if office_name is null then raise exception 'Office not found'; end if;
  if office_slug = 'alphatravel' then raise exception 'Platform office cannot be deleted'; end if;
  if confirmation is null or confirmation <> office_name then raise exception 'Invalid confirmation'; end if;

  -- Payments and registrations contain restrictive cross-links. Removing them
  -- first lets the remaining tenant graph be deleted safely by organization.
  delete from public.payments where organization_id = target_organization_id;
  delete from public.registrations where organization_id = target_organization_id;
  delete from public.organizations where id = target_organization_id;

  insert into public.platform_audit_logs (actor_user_id, action, details)
  values (
    auth.uid(),
    'Ufficio eliminato',
    jsonb_build_object('organizationId', target_organization_id, 'name', office_name)
  );
end;
$$;

revoke all on function public.platform_set_office_active(uuid, boolean) from public, anon;
revoke all on function public.platform_prepare_delete_office(uuid, text) from public, anon;
revoke all on function public.platform_delete_office(uuid, text) from public, anon;
revoke all on function public.platform_create_member(jsonb, uuid) from public, anon;
grant execute on function public.platform_set_office_active(uuid, boolean) to authenticated;
grant execute on function public.platform_prepare_delete_office(uuid, text) to authenticated;
grant execute on function public.platform_delete_office(uuid, text) to authenticated;
grant execute on function public.platform_create_member(jsonb, uuid) to authenticated;
