-- AlphaTravel platform-owner control plane.
-- Separates office administrators from the AlphaTravel super-administrator,
-- adds subscription lifecycle fields and exposes aggregate-only analytics.

alter table public.organizations
  add column if not exists contact_email text,
  add column if not exists phone text,
  add column if not exists plan text not null default 'professional',
  add column if not exists subscription_status text not null default 'active',
  add column if not exists is_active boolean not null default true,
  add column if not exists user_limit integer not null default 10,
  add column if not exists renewal_date date,
  add column if not exists notes text;

alter table public.organizations
  add constraint organizations_contact_email_format
  check (contact_email is null or contact_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  add constraint organizations_plan_valid
  check (plan in ('starter', 'professional', 'enterprise')),
  add constraint organizations_subscription_status_valid
  check (subscription_status in ('trial', 'active', 'past_due', 'cancelled')),
  add constraint organizations_user_limit_valid
  check (user_limit between 1 and 1000),
  add constraint organizations_notes_length
  check (notes is null or char_length(notes) <= 2000);

update public.organizations
set contact_email = coalesce(
  contact_email,
  (select member.email from public.organization_members member where member.organization_id = organizations.id and member.role = 'admin' order by member.created_at limit 1)
);

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.platform_admins (user_id, display_name)
select member.user_id, member.display_name
from public.organization_members member
join public.organizations organization on organization.id = member.organization_id
where member.username = 'admin'
  and member.role = 'admin'
  and member.is_active
order by (organization.slug = 'alphatravel') desc, member.created_at
limit 1
on conflict (user_id) do nothing;

create trigger platform_admins_updated
before update on public.platform_admins
for each row execute function public.set_updated_at();

alter table public.platform_admins enable row level security;
grant select on table public.platform_admins to authenticated;
revoke insert, update, delete on table public.platform_admins from authenticated;

create policy platform_admins_self_read
on public.platform_admins for select to authenticated
using (user_id = auth.uid() and is_active);

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.platform_admins administrator
    where administrator.user_id = auth.uid() and administrator.is_active
  );
$$;

revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

create table public.platform_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 2 and 120),
  target_organization_id uuid references public.organizations(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index platform_audit_logs_time_idx on public.platform_audit_logs (occurred_at desc);
alter table public.platform_audit_logs enable row level security;
revoke all on table public.platform_audit_logs from public, anon, authenticated;

-- A suspended office must lose access immediately, including for existing
-- sessions. Platform administrators remain isolated in platform_admins.
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members member
    join public.organizations organization on organization.id = member.organization_id
    where member.organization_id = target_org
      and member.user_id = auth.uid()
      and member.is_active
      and organization.is_active
  );
$$;

create or replace function public.has_org_role(target_org uuid, allowed_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members member
    join public.organizations organization on organization.id = member.organization_id
    where member.organization_id = target_org
      and member.user_id = auth.uid()
      and member.is_active
      and organization.is_active
      and member.role = any(allowed_roles)
  );
$$;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select member.organization_id
  from public.organization_members member
  join public.organizations organization on organization.id = member.organization_id
  where member.user_id = auth.uid()
    and member.is_active
    and organization.is_active
  order by member.created_at
  limit 1;
$$;

drop policy if exists members_self_read on public.organization_members;
drop policy if exists members_admin_read on public.organization_members;
drop policy if exists audit_admin_mfa_read on public.audit_logs;
drop policy if exists audit_admin_read on public.audit_logs;
drop policy if exists organizations_admin_mfa_update on public.organizations;
drop policy if exists organizations_admin_update on public.organizations;

create policy members_self_read
on public.organization_members for select to authenticated
using (user_id = auth.uid() and public.is_org_member(organization_id));

create policy members_admin_read
on public.organization_members for select to authenticated
using (public.has_org_role(organization_id, array['admin']::public.app_role[]));

create policy audit_admin_read
on public.audit_logs for select to authenticated
using (public.has_org_role(organization_id, array['admin']::public.app_role[]));

create policy organizations_admin_update
on public.organizations for update to authenticated
using (public.has_org_role(id, array['admin']::public.app_role[]))
with check (public.has_org_role(id, array['admin']::public.app_role[]));

create policy organizations_platform_read
on public.organizations for select to authenticated
using (public.is_platform_admin());

-- Office administrators no longer require a TOTP/AAL2 session. Authorization
-- still requires an authenticated active administrator in an active office.
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
     or not public.has_org_role(org_id, array['admin']::public.app_role[]) then
    raise exception 'Not authorized';
  end if;
  if normalized_username !~ '^[a-z][a-z0-9._-]{2,31}$' then
    raise exception 'Invalid username';
  end if;

  perform 1 from public.organization_members
  where organization_id = org_id and user_id = target_user_id
  for update;
  if not found then raise exception 'Member not found'; end if;

  update public.organization_members
  set username = normalized_username,
      role = target_role,
      is_active = target_active
  where organization_id = org_id and user_id = target_user_id;
end;
$$;

revoke all on function public.admin_update_member(uuid, text, public.app_role, boolean) from public;
grant execute on function public.admin_update_member(uuid, text, public.app_role, boolean) to authenticated;

create or replace function public.resolve_username_login(target_username text)
returns table (user_id uuid, email text, is_active boolean)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select member.user_id, member.email, member.is_active and organization.is_active
  from public.organization_members member
  join public.organizations organization on organization.id = member.organization_id
  where member.username = lower(trim(target_username))
  limit 1;
$$;

revoke all on function public.resolve_username_login(text) from public, anon, authenticated;
grant execute on function public.resolve_username_login(text) to service_role;

create or replace function public.platform_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Not authorized';
  end if;

  select jsonb_build_object(
    'stats', jsonb_build_object(
      'totalOffices', (select count(*) from public.organizations),
      'activeOffices', (select count(*) from public.organizations where is_active),
      'activeUsers', (select count(*) from public.organization_members where is_active),
      'pilgrims', (select count(*) from public.pilgrims where archived_at is null),
      'trips', (select count(*) from public.trips),
      'registrations', (select count(*) from public.registrations where status <> 'cancelled'),
      'collected', coalesce((select sum(case when status in ('paid','partial') then amount when status = 'refunded' then -amount else 0 end) from public.payments), 0)
    ),
    'offices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', organization.id,
        'name', organization.name,
        'slug', organization.slug,
        'contactEmail', coalesce(organization.contact_email, ''),
        'phone', coalesce(organization.phone, ''),
        'timezone', organization.timezone,
        'currency', organization.currency,
        'plan', organization.plan,
        'subscriptionStatus', organization.subscription_status,
        'isActive', organization.is_active,
        'userLimit', organization.user_limit,
        'renewalDate', organization.renewal_date,
        'notes', coalesce(organization.notes, ''),
        'createdAt', organization.created_at,
        'memberCount', (select count(*) from public.organization_members member where member.organization_id = organization.id),
        'pilgrimCount', (select count(*) from public.pilgrims pilgrim where pilgrim.organization_id = organization.id and pilgrim.archived_at is null),
        'tripCount', (select count(*) from public.trips trip where trip.organization_id = organization.id),
        'registrationCount', (select count(*) from public.registrations registration where registration.organization_id = organization.id and registration.status <> 'cancelled'),
        'collected', coalesce((select sum(case when payment.status in ('paid','partial') then payment.amount when payment.status = 'refunded' then -payment.amount else 0 end) from public.payments payment where payment.organization_id = organization.id), 0),
        'isPlatformOffice', organization.slug = 'alphatravel',
        'members', coalesce((
          select jsonb_agg(jsonb_build_object(
            'userId', member.user_id,
            'username', member.username,
            'email', coalesce(member.email, ''),
            'displayName', member.display_name,
            'role', member.role,
            'isActive', member.is_active,
            'createdAt', member.created_at,
            'lastSignInAt', auth_user.last_sign_in_at
          ) order by member.created_at)
          from public.organization_members member
          left join auth.users auth_user on auth_user.id = member.user_id
          where member.organization_id = organization.id
        ), '[]'::jsonb)
      ) order by organization.created_at desc)
      from public.organizations organization
    ), '[]'::jsonb),
    'monthly', coalesce((
      select jsonb_agg(jsonb_build_object(
        'month', to_char(month_row.month_start, 'YYYY-MM'),
        'offices', (select count(*) from public.organizations organization where organization.created_at >= month_row.month_start and organization.created_at < month_row.month_start + interval '1 month'),
        'pilgrims', (select count(*) from public.pilgrims pilgrim where pilgrim.created_at >= month_row.month_start and pilgrim.created_at < month_row.month_start + interval '1 month'),
        'trips', (select count(*) from public.trips trip where trip.created_at >= month_row.month_start and trip.created_at < month_row.month_start + interval '1 month'),
        'collected', coalesce((select sum(case when payment.status in ('paid','partial') then payment.amount when payment.status = 'refunded' then -payment.amount else 0 end) from public.payments payment where payment.created_at >= month_row.month_start and payment.created_at < month_row.month_start + interval '1 month'), 0)
      ) order by month_row.month_start)
      from (
        select generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') as month_start
      ) month_row
    ), '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', activity_row.id,
        'action', activity_row.action,
        'officeName', coalesce(organization.name, 'Piattaforma'),
        'actorName', coalesce(administrator.display_name, 'Sistema'),
        'occurredAt', activity_row.occurred_at
      ) order by activity_row.occurred_at desc)
      from (select * from public.platform_audit_logs order by occurred_at desc limit 30) activity_row
      left join public.organizations organization on organization.id = activity_row.target_organization_id
      left join public.platform_admins administrator on administrator.user_id = activity_row.actor_user_id
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.platform_dashboard() from public, anon;
grant execute on function public.platform_dashboard() to authenticated;
