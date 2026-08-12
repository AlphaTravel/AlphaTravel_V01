create or replace function public.enforce_document_same_organization()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  related_organization uuid;
begin
  if new.pilgrim_id is not null then
    select organization_id into related_organization from public.pilgrims where id = new.pilgrim_id;
    if related_organization is null or related_organization is distinct from new.organization_id then
      raise exception 'Document and pilgrim must belong to the same organization';
    end if;
  end if;
  if new.trip_id is not null then
    select organization_id into related_organization from public.trips where id = new.trip_id;
    if related_organization is null or related_organization is distinct from new.organization_id then
      raise exception 'Document and trip must belong to the same organization';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists documents_same_org on public.documents;
create trigger documents_same_org
before insert or update of organization_id, pilgrim_id, trip_id on public.documents
for each row execute function public.enforce_document_same_organization();

create or replace function public.enforce_itinerary_within_trip()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  trip_start date;
  trip_end date;
  organization_timezone text;
begin
  select trip.starts_on, trip.ends_on, organization.timezone
  into trip_start, trip_end, organization_timezone
  from public.trips trip
  join public.organizations organization on organization.id = trip.organization_id
  where trip.id = new.trip_id;

  if trip_start is null
    or (new.starts_at at time zone organization_timezone)::date < trip_start
    or (coalesce(new.ends_at, new.starts_at) at time zone organization_timezone)::date > trip_end then
    raise exception 'Itinerary item must be within trip dates';
  end if;
  return new;
end;
$$;

drop trigger if exists itinerary_within_trip on public.itinerary_items;
create trigger itinerary_within_trip
before insert or update of trip_id, starts_at, ends_at on public.itinerary_items
for each row execute function public.enforce_itinerary_within_trip();

create or replace function public.enforce_registration_window()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  trip_state public.trip_status;
  deadline date;
  organization_timezone text;
  local_today date;
begin
  if new.status = 'cancelled' then return new; end if;
  if tg_op = 'UPDATE' and new.trip_id = old.trip_id and old.status <> 'cancelled' then return new; end if;
  select trip.status, trip.registration_deadline, organization.timezone
  into trip_state, deadline, organization_timezone
  from public.trips trip
  join public.organizations organization on organization.id = trip.organization_id
  where trip.id = new.trip_id;
  local_today := (now() at time zone organization_timezone)::date;

  if trip_state in ('full', 'completed', 'cancelled') then
    raise exception 'Trip registrations are closed';
  end if;
  if deadline is not null and deadline < local_today then
    raise exception 'Trip registration deadline has passed';
  end if;
  return new;
end;
$$;

drop trigger if exists registrations_window on public.registrations;
create trigger registrations_window
before insert or update of trip_id, status on public.registrations
for each row execute function public.enforce_registration_window();

revoke all on function public.enforce_document_same_organization() from public;
revoke all on function public.enforce_itinerary_within_trip() from public;
revoke all on function public.enforce_registration_window() from public;
