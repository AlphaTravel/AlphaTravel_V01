-- Cross-entity and accounting invariants that must remain true even when
-- requests arrive concurrently or bypass the application UI.

create or replace function public.enforce_registration_capacity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  trip_capacity integer;
  active_registrations integer;
begin
  if new.status = 'cancelled' then return new; end if;

  select capacity into trip_capacity
  from public.trips
  where id = new.trip_id
  for update;

  select count(*) into active_registrations
  from public.registrations
  where trip_id = new.trip_id
    and status <> 'cancelled'
    and id <> new.id;

  if active_registrations >= trip_capacity then
    raise exception 'Trip capacity exceeded';
  end if;
  return new;
end;
$$;

drop trigger if exists registrations_capacity on public.registrations;
create trigger registrations_capacity
before insert or update of trip_id, status on public.registrations
for each row execute function public.enforce_registration_capacity();

create or replace function public.enforce_registration_group_same_trip()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare group_trip uuid;
begin
  if new.group_id is null then return new; end if;
  select trip_id into group_trip from public.trip_groups where id = new.group_id;
  if group_trip is null or group_trip is distinct from new.trip_id then
    raise exception 'Group and registration must belong to the same trip';
  end if;
  return new;
end;
$$;

drop trigger if exists registrations_group_same_trip on public.registrations;
create trigger registrations_group_same_trip
before insert or update of trip_id, group_id on public.registrations
for each row execute function public.enforce_registration_group_same_trip();

create or replace function public.enforce_room_same_trip()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare room_trip uuid; registration_trip uuid;
begin
  select a.trip_id into room_trip
  from public.rooms r
  join public.accommodations a on a.id = r.accommodation_id
  where r.id = new.room_id;

  select trip_id into registration_trip
  from public.registrations
  where id = new.registration_id;

  if room_trip is null or registration_trip is null or room_trip is distinct from registration_trip then
    raise exception 'Room and registration must belong to the same trip';
  end if;
  return new;
end;
$$;

drop trigger if exists room_assignments_same_trip on public.room_assignments;
create trigger room_assignments_same_trip
before insert or update of room_id, registration_id on public.room_assignments
for each row execute function public.enforce_room_same_trip();

create or replace function public.enforce_seat_same_trip()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare seat_trip uuid; registration_trip uuid;
begin
  select v.trip_id into seat_trip
  from public.vehicle_seats s
  join public.vehicles v on v.id = s.vehicle_id
  where s.id = new.vehicle_seat_id;

  select trip_id into registration_trip
  from public.registrations
  where id = new.registration_id;

  if seat_trip is null or registration_trip is null or seat_trip is distinct from registration_trip then
    raise exception 'Seat and registration must belong to the same trip';
  end if;
  return new;
end;
$$;

drop trigger if exists seat_assignments_same_trip on public.seat_assignments;
create trigger seat_assignments_same_trip
before insert or update of vehicle_seat_id, registration_id on public.seat_assignments
for each row execute function public.enforce_seat_same_trip();

create or replace function public.enforce_payment_balance()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare agreed numeric(12,2); current_net numeric(12,2); next_net numeric(12,2);
begin
  select agreed_price into agreed
  from public.registrations
  where id = new.registration_id
  for update;

  select coalesce(sum(
    case
      when status in ('paid', 'partial') then amount
      when status = 'refunded' then -amount
      else 0
    end
  ), 0) into current_net
  from public.payments
  where registration_id = new.registration_id
    and id <> new.id;

  next_net := current_net + case
    when new.status in ('paid', 'partial') then new.amount
    when new.status = 'refunded' then -new.amount
    else 0
  end;

  if agreed is null or next_net < 0 or next_net > agreed then
    raise exception 'Payment balance outside the agreed amount';
  end if;
  return new;
end;
$$;

drop trigger if exists payments_balance_guard on public.payments;
create trigger payments_balance_guard
before insert or update of registration_id, amount, status on public.payments
for each row execute function public.enforce_payment_balance();
