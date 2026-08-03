-- AlphaTravel core schema
-- Multi-tenant by organization. Every exposed table has Row Level Security enabled.

create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('admin', 'manager', 'operator', 'guide', 'accountant', 'viewer');
create type public.trip_status as enum ('draft', 'open', 'confirmed', 'full', 'completed', 'cancelled');
create type public.registration_status as enum ('pending', 'confirmed', 'incomplete', 'cancelled');
create type public.payment_status as enum ('pending', 'partial', 'paid', 'overdue', 'refunded');
create type public.mobility_level as enum ('independent', 'light_support', 'assistance');
create type public.document_kind as enum ('identity', 'passport', 'consent', 'insurance', 'medical', 'voucher', 'other');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  timezone text not null default 'Europe/Rome',
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'viewer',
  display_name text not null check (char_length(display_name) between 2 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.pilgrims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 100),
  last_name text not null check (char_length(last_name) between 1 and 100),
  birth_date date,
  birth_place text,
  nationality text,
  fiscal_code text,
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  document_number text,
  document_expiry date,
  privacy_notice_version text,
  privacy_notice_delivered_at timestamptz,
  operational_messages_allowed boolean not null default false,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, fiscal_code),
  check (email is null or email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

comment on table public.pilgrims is 'Core personal data. Health data is deliberately separated into pilgrim_health_profiles.';

create table public.pilgrim_health_profiles (
  pilgrim_id uuid primary key references public.pilgrims(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mobility public.mobility_level not null default 'independent',
  indicative_walking_km numeric(5,2) check (indicative_walking_km between 0 and 100),
  dietary_requirements text,
  allergies text,
  assistance_notes text,
  health_data_consent boolean not null default false,
  consent_recorded_at timestamptz,
  consent_recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pilgrim_id uuid not null references public.pilgrims(id) on delete cascade,
  name text not null,
  relationship text,
  phone text not null,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null check (code ~ '^[A-Za-z0-9-]{3,20}$'),
  title text not null check (char_length(title) between 3 and 160),
  destination text not null,
  description text,
  starts_on date not null,
  ends_on date not null,
  registration_deadline date,
  minimum_participants integer not null default 1 check (minimum_participants > 0),
  capacity integer not null check (capacity > 0),
  status public.trip_status not null default 'draft',
  base_price numeric(12,2) not null default 0 check (base_price >= 0),
  deposit_amount numeric(12,2) not null default 0 check (deposit_amount >= 0),
  single_room_supplement numeric(12,2) not null default 0 check (single_room_supplement >= 0),
  balance_due_on date,
  planned_walking_km numeric(7,2) not null default 0 check (planned_walking_km >= 0),
  manager_user_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  check (ends_on >= starts_on),
  check (minimum_participants <= capacity)
);

create table public.trip_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  leader_name text,
  leader_phone text,
  meeting_point text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, name)
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  pilgrim_id uuid not null references public.pilgrims(id) on delete restrict,
  group_id uuid references public.trip_groups(id) on delete set null,
  status public.registration_status not null default 'pending',
  room_preference text check (room_preference in ('single', 'double', 'triple', 'accessible') or room_preference is null),
  preferred_roommate text,
  agreed_price numeric(12,2) not null default 0 check (agreed_price >= 0),
  notes text,
  registered_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, pilgrim_id)
);

create table public.accommodations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  address text,
  city text,
  phone text,
  check_in_at timestamptz,
  check_out_at timestamptz,
  accessible_rooms integer not null default 0 check (accessible_rooms >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  accommodation_id uuid not null references public.accommodations(id) on delete cascade,
  room_number text not null,
  room_type text not null check (room_type in ('single', 'double', 'triple', 'quad', 'accessible', 'other')),
  capacity integer not null check (capacity > 0 and capacity <= 20),
  floor text,
  is_accessible boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (accommodation_id, room_number)
);

create table public.room_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  registration_id uuid not null references public.registrations(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null default auth.uid(),
  assigned_at timestamptz not null default now(),
  unique (registration_id),
  unique (room_id, registration_id)
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  vehicle_type text not null default 'coach' check (vehicle_type in ('coach', 'minibus', 'plane', 'train', 'ship', 'other')),
  operator_name text,
  plate_or_reference text,
  capacity integer not null check (capacity > 0),
  departure_place text,
  departure_at timestamptz,
  arrival_place text,
  arrival_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicle_seats (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  seat_label text not null,
  is_accessible boolean not null default false,
  is_reserved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (vehicle_id, seat_label)
);

create table public.seat_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_seat_id uuid not null references public.vehicle_seats(id) on delete cascade,
  registration_id uuid not null references public.registrations(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null default auth.uid(),
  assigned_at timestamptz not null default now(),
  unique (vehicle_seat_id),
  unique (registration_id, vehicle_seat_id)
);

create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  item_type text not null check (item_type in ('travel', 'walk', 'meal', 'event', 'hotel', 'free_time', 'other')),
  title text not null,
  details text,
  location text,
  walking_km numeric(6,2) not null default 0 check (walking_km >= 0),
  difficulty text check (difficulty in ('easy', 'medium', 'hard') or difficulty is null),
  accessible_alternative text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  registration_id uuid not null references public.registrations(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  status public.payment_status not null default 'pending',
  method text check (method in ('bank_transfer', 'cash', 'card_provider', 'cheque', 'other') or method is null),
  external_reference text,
  due_on date,
  paid_at timestamptz,
  notes text,
  recorded_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.payments is 'Operational payment ledger only. Never store full card data, CVV, or banking credentials.';

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pilgrim_id uuid references public.pilgrims(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  kind public.document_kind not null,
  storage_path text not null check (storage_path !~ '^https?://'),
  original_filename text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0 and byte_size <= 20971520),
  is_sensitive boolean not null default false,
  expires_on date,
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (pilgrim_id is not null or trip_id is not null),
  unique (organization_id, storage_path)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  occurred_at timestamptz not null default now()
);

create index pilgrims_organization_name_idx on public.pilgrims (organization_id, last_name, first_name);
create index trips_organization_dates_idx on public.trips (organization_id, starts_on, ends_on);
create index registrations_trip_idx on public.registrations (trip_id, status);
create index registrations_pilgrim_idx on public.registrations (pilgrim_id);
create index health_organization_idx on public.pilgrim_health_profiles (organization_id);
create index rooms_accommodation_idx on public.rooms (accommodation_id);
create index room_assignments_room_idx on public.room_assignments (room_id);
create index vehicle_seats_vehicle_idx on public.vehicle_seats (vehicle_id);
create index itinerary_trip_time_idx on public.itinerary_items (trip_id, starts_at);
create index payments_registration_idx on public.payments (registration_id, status);
create index documents_pilgrim_idx on public.documents (pilgrim_id);
create index documents_trip_idx on public.documents (trip_id);
create index audit_logs_org_time_idx on public.audit_logs (organization_id, occurred_at desc);

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_org and m.user_id = auth.uid() and m.is_active
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
    select 1 from public.organization_members m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.is_active
      and m.role = any(allowed_roles)
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid, public.app_role[]) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, public.app_role[]) to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.validate_same_organization()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare expected_org uuid;
begin
  if tg_table_name = 'pilgrim_health_profiles' then select organization_id into expected_org from public.pilgrims where id = new.pilgrim_id;
  elsif tg_table_name = 'emergency_contacts' then select organization_id into expected_org from public.pilgrims where id = new.pilgrim_id;
  elsif tg_table_name = 'trip_groups' then select organization_id into expected_org from public.trips where id = new.trip_id;
  elsif tg_table_name = 'registrations' then
    select t.organization_id into expected_org from public.trips t where t.id = new.trip_id;
    if expected_org is distinct from (select p.organization_id from public.pilgrims p where p.id = new.pilgrim_id) then raise exception 'Trip and pilgrim must belong to the same organization'; end if;
  elsif tg_table_name = 'accommodations' then select organization_id into expected_org from public.trips where id = new.trip_id;
  elsif tg_table_name = 'rooms' then select organization_id into expected_org from public.accommodations where id = new.accommodation_id;
  elsif tg_table_name = 'room_assignments' then
    select r.organization_id into expected_org from public.rooms r where r.id = new.room_id;
    if expected_org is distinct from (select x.organization_id from public.registrations x where x.id = new.registration_id) then raise exception 'Room and registration must belong to the same organization'; end if;
  elsif tg_table_name = 'vehicles' then select organization_id into expected_org from public.trips where id = new.trip_id;
  elsif tg_table_name = 'vehicle_seats' then select organization_id into expected_org from public.vehicles where id = new.vehicle_id;
  elsif tg_table_name = 'seat_assignments' then
    select s.organization_id into expected_org from public.vehicle_seats s where s.id = new.vehicle_seat_id;
    if expected_org is distinct from (select x.organization_id from public.registrations x where x.id = new.registration_id) then raise exception 'Seat and registration must belong to the same organization'; end if;
  elsif tg_table_name = 'itinerary_items' then select organization_id into expected_org from public.trips where id = new.trip_id;
  elsif tg_table_name = 'payments' then select organization_id into expected_org from public.registrations where id = new.registration_id;
  end if;
  if expected_org is null or expected_org is distinct from new.organization_id then raise exception 'Invalid organization relationship'; end if;
  return new;
end;
$$;

create or replace function public.enforce_room_capacity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare room_capacity integer; assigned_count integer;
begin
  select capacity into room_capacity from public.rooms where id = new.room_id for update;
  select count(*) into assigned_count from public.room_assignments where room_id = new.room_id and id <> coalesce(new.id, gen_random_uuid());
  if assigned_count >= room_capacity then raise exception 'Room capacity exceeded'; end if;
  return new;
end;
$$;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare org_id uuid; row_id uuid;
begin
  org_id := coalesce(new.organization_id, old.organization_id);
  if tg_table_name = 'pilgrim_health_profiles' then
    row_id := coalesce(new.pilgrim_id, old.pilgrim_id);
  else
    row_id := coalesce(new.id, old.id);
  end if;
  insert into public.audit_logs (organization_id, actor_user_id, action, table_name, record_id)
  values (org_id, auth.uid(), tg_op, tg_table_name, row_id);
  return coalesce(new, old);
end;
$$;

create trigger organizations_updated before update on public.organizations for each row execute function public.set_updated_at();
create trigger members_updated before update on public.organization_members for each row execute function public.set_updated_at();
create trigger pilgrims_updated before update on public.pilgrims for each row execute function public.set_updated_at();
create trigger health_updated before update on public.pilgrim_health_profiles for each row execute function public.set_updated_at();
create trigger contacts_updated before update on public.emergency_contacts for each row execute function public.set_updated_at();
create trigger trips_updated before update on public.trips for each row execute function public.set_updated_at();
create trigger groups_updated before update on public.trip_groups for each row execute function public.set_updated_at();
create trigger registrations_updated before update on public.registrations for each row execute function public.set_updated_at();
create trigger accommodations_updated before update on public.accommodations for each row execute function public.set_updated_at();
create trigger rooms_updated before update on public.rooms for each row execute function public.set_updated_at();
create trigger vehicles_updated before update on public.vehicles for each row execute function public.set_updated_at();
create trigger itinerary_updated before update on public.itinerary_items for each row execute function public.set_updated_at();
create trigger payments_updated before update on public.payments for each row execute function public.set_updated_at();

create trigger health_same_org before insert or update on public.pilgrim_health_profiles for each row execute function public.validate_same_organization();
create trigger contacts_same_org before insert or update on public.emergency_contacts for each row execute function public.validate_same_organization();
create trigger groups_same_org before insert or update on public.trip_groups for each row execute function public.validate_same_organization();
create trigger registrations_same_org before insert or update on public.registrations for each row execute function public.validate_same_organization();
create trigger accommodations_same_org before insert or update on public.accommodations for each row execute function public.validate_same_organization();
create trigger rooms_same_org before insert or update on public.rooms for each row execute function public.validate_same_organization();
create trigger room_assignments_same_org before insert or update on public.room_assignments for each row execute function public.validate_same_organization();
create trigger room_capacity before insert or update of room_id on public.room_assignments for each row execute function public.enforce_room_capacity();
create trigger vehicles_same_org before insert or update on public.vehicles for each row execute function public.validate_same_organization();
create trigger seats_same_org before insert or update on public.vehicle_seats for each row execute function public.validate_same_organization();
create trigger seat_assignments_same_org before insert or update on public.seat_assignments for each row execute function public.validate_same_organization();
create trigger itinerary_same_org before insert or update on public.itinerary_items for each row execute function public.validate_same_organization();
create trigger payments_same_org before insert or update on public.payments for each row execute function public.validate_same_organization();

create trigger pilgrims_audit after insert or update or delete on public.pilgrims for each row execute function public.write_audit_log();
create trigger health_audit after insert or update or delete on public.pilgrim_health_profiles for each row execute function public.write_audit_log();
create trigger registrations_audit after insert or update or delete on public.registrations for each row execute function public.write_audit_log();
create trigger payments_audit after insert or update or delete on public.payments for each row execute function public.write_audit_log();
create trigger documents_audit after insert or update or delete on public.documents for each row execute function public.write_audit_log();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.pilgrims enable row level security;
alter table public.pilgrim_health_profiles enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.trips enable row level security;
alter table public.trip_groups enable row level security;
alter table public.registrations enable row level security;
alter table public.accommodations enable row level security;
alter table public.rooms enable row level security;
alter table public.room_assignments enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_seats enable row level security;
alter table public.seat_assignments enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.payments enable row level security;
alter table public.documents enable row level security;
alter table public.audit_logs enable row level security;

create policy organizations_read on public.organizations for select to authenticated using (public.is_org_member(id));
create policy organizations_update on public.organizations for update to authenticated using (public.has_org_role(id, array['admin']::public.app_role[])) with check (public.has_org_role(id, array['admin']::public.app_role[]));
create policy members_read on public.organization_members for select to authenticated using (public.is_org_member(organization_id));
create policy members_admin_all on public.organization_members for all to authenticated using (public.has_org_role(organization_id, array['admin']::public.app_role[])) with check (public.has_org_role(organization_id, array['admin']::public.app_role[]));

create policy pilgrims_read on public.pilgrims for select to authenticated using (public.is_org_member(organization_id));
create policy pilgrims_write on public.pilgrims for all to authenticated using (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[])) with check (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[]));
create policy health_read on public.pilgrim_health_profiles for select to authenticated using (public.has_org_role(organization_id, array['admin','manager','operator','guide']::public.app_role[]));
create policy health_write on public.pilgrim_health_profiles for all to authenticated using (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[])) with check (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[]));
create policy contacts_read on public.emergency_contacts for select to authenticated using (public.has_org_role(organization_id, array['admin','manager','operator','guide']::public.app_role[]));
create policy contacts_write on public.emergency_contacts for all to authenticated using (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[])) with check (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[]));

create policy trips_read on public.trips for select to authenticated using (public.is_org_member(organization_id));
create policy trips_write on public.trips for all to authenticated using (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[])) with check (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[]));
create policy groups_read on public.trip_groups for select to authenticated using (public.is_org_member(organization_id));
create policy groups_write on public.trip_groups for all to authenticated using (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[])) with check (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[]));
create policy registrations_read on public.registrations for select to authenticated using (public.is_org_member(organization_id));
create policy registrations_write on public.registrations for all to authenticated using (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[])) with check (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[]));

create policy accommodations_read on public.accommodations for select to authenticated using (public.is_org_member(organization_id));
create policy accommodations_write on public.accommodations for all to authenticated using (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[])) with check (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[]));
create policy rooms_read on public.rooms for select to authenticated using (public.is_org_member(organization_id));
create policy rooms_write on public.rooms for all to authenticated using (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[])) with check (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[]));
create policy room_assignments_read on public.room_assignments for select to authenticated using (public.is_org_member(organization_id));
create policy room_assignments_write on public.room_assignments for all to authenticated using (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[])) with check (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[]));
create policy vehicles_read on public.vehicles for select to authenticated using (public.is_org_member(organization_id));
create policy vehicles_write on public.vehicles for all to authenticated using (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[])) with check (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[]));
create policy vehicle_seats_read on public.vehicle_seats for select to authenticated using (public.is_org_member(organization_id));
create policy vehicle_seats_write on public.vehicle_seats for all to authenticated using (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[])) with check (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[]));
create policy seat_assignments_read on public.seat_assignments for select to authenticated using (public.is_org_member(organization_id));
create policy seat_assignments_write on public.seat_assignments for all to authenticated using (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[])) with check (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[]));
create policy itinerary_read on public.itinerary_items for select to authenticated using (public.is_org_member(organization_id));
create policy itinerary_write on public.itinerary_items for all to authenticated using (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[])) with check (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[]));

create policy payments_read on public.payments for select to authenticated using (public.has_org_role(organization_id, array['admin','manager','operator','accountant']::public.app_role[]));
create policy payments_write on public.payments for all to authenticated using (public.has_org_role(organization_id, array['admin','manager','accountant']::public.app_role[])) with check (public.has_org_role(organization_id, array['admin','manager','accountant']::public.app_role[]));
create policy documents_read on public.documents for select to authenticated using (public.is_org_member(organization_id) and (not is_sensitive or public.has_org_role(organization_id, array['admin','manager','operator','guide']::public.app_role[])));
create policy documents_write on public.documents for all to authenticated using (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[])) with check (public.has_org_role(organization_id, array['admin','manager','operator']::public.app_role[]));
create policy audit_read on public.audit_logs for select to authenticated using (public.has_org_role(organization_id, array['admin']::public.app_role[]));

revoke insert, update, delete on public.audit_logs from authenticated;
revoke all on public.pilgrim_health_profiles from anon;
revoke all on public.documents from anon;
revoke all on public.audit_logs from anon;
