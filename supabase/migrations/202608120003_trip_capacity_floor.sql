create or replace function public.enforce_trip_capacity_floor()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  active_registrations integer;
begin
  select count(*) into active_registrations
  from public.registrations
  where trip_id = new.id
    and status <> 'cancelled';

  if new.capacity < active_registrations then
    raise exception 'Trip capacity cannot be lower than active registrations';
  end if;
  return new;
end;
$$;

drop trigger if exists trips_capacity_floor on public.trips;
create trigger trips_capacity_floor
before update of capacity on public.trips
for each row execute function public.enforce_trip_capacity_floor();

revoke all on function public.enforce_trip_capacity_floor() from public;
