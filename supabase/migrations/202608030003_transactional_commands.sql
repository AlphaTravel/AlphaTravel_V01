-- Transactional commands used by the application forms.
-- Functions run with the caller's privileges: existing RLS policies remain authoritative.

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.organization_id
  from public.organization_members m
  where m.user_id = auth.uid() and m.is_active
  order by m.created_at
  limit 1;
$$;

revoke all on function public.current_organization_id() from public;
grant execute on function public.current_organization_id() to authenticated;

create or replace function public.create_pilgrim_with_details(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  org_id uuid;
  new_pilgrim_id uuid;
  selected_trip_id uuid;
  trip_price numeric(12,2);
begin
  org_id := public.current_organization_id();
  if org_id is null or not public.has_org_role(org_id, array['admin','manager','operator']::public.app_role[]) then
    raise exception 'Not authorized';
  end if;
  if coalesce((payload->>'privacyDelivered')::boolean, false) is not true then
    raise exception 'Privacy notice delivery must be recorded';
  end if;

  insert into public.pilgrims (
    organization_id, first_name, last_name, birth_date, birth_place, nationality,
    fiscal_code, email, phone, address, city, privacy_notice_version,
    privacy_notice_delivered_at, operational_messages_allowed
  ) values (
    org_id,
    nullif(trim(payload->>'firstName'), ''),
    nullif(trim(payload->>'lastName'), ''),
    nullif(payload->>'birthDate', '')::date,
    nullif(trim(payload->>'birthPlace'), ''),
    nullif(trim(payload->>'nationality'), ''),
    nullif(upper(trim(payload->>'fiscalCode')), ''),
    nullif(lower(trim(payload->>'email')), ''),
    nullif(trim(payload->>'phone'), ''),
    nullif(trim(payload->>'address'), ''),
    nullif(trim(payload->>'city'), ''),
    coalesce(nullif(payload->>'privacyNoticeVersion', ''), 'v1'),
    now(),
    coalesce((payload->>'operationalMessagesAllowed')::boolean, false)
  ) returning id into new_pilgrim_id;

  insert into public.emergency_contacts (
    organization_id, pilgrim_id, name, phone, is_primary
  ) values (
    org_id, new_pilgrim_id,
    nullif(trim(payload->>'emergencyName'), ''),
    nullif(trim(payload->>'emergencyPhone'), ''),
    true
  );

  insert into public.pilgrim_health_profiles (
    pilgrim_id, organization_id, mobility, indicative_walking_km,
    dietary_requirements, allergies, assistance_notes, health_data_consent,
    consent_recorded_at, consent_recorded_by
  ) values (
    new_pilgrim_id,
    org_id,
    coalesce(nullif(payload->>'mobility', '')::public.mobility_level, 'independent'),
    coalesce(nullif(payload->>'walkingKm', '')::numeric, 0),
    nullif(trim(payload->>'dietary'), ''),
    nullif(trim(payload->>'allergies'), ''),
    nullif(trim(payload->>'healthNotes'), ''),
    coalesce((payload->>'healthConsent')::boolean, false),
    case when coalesce((payload->>'healthConsent')::boolean, false) then now() else null end,
    case when coalesce((payload->>'healthConsent')::boolean, false) then auth.uid() else null end
  );

  selected_trip_id := nullif(payload->>'tripId', '')::uuid;
  if selected_trip_id is not null then
    select base_price into trip_price
    from public.trips
    where id = selected_trip_id and organization_id = org_id;
    if trip_price is null then raise exception 'Invalid trip'; end if;
    insert into public.registrations (
      organization_id, trip_id, pilgrim_id, status, room_preference,
      preferred_roommate, agreed_price, notes
    ) values (
      org_id, selected_trip_id, new_pilgrim_id, 'incomplete',
      nullif(payload->>'roomPreference', ''),
      nullif(trim(payload->>'roommate'), ''),
      trip_price,
      nullif(trim(payload->>'groupName'), '')
    );
  end if;

  return new_pilgrim_id;
end;
$$;

create or replace function public.create_trip(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare org_id uuid; new_trip_id uuid;
begin
  org_id := public.current_organization_id();
  if org_id is null or not public.has_org_role(org_id, array['admin','manager','operator']::public.app_role[]) then
    raise exception 'Not authorized';
  end if;

  insert into public.trips (
    organization_id, code, title, destination, description, starts_on, ends_on,
    registration_deadline, minimum_participants, capacity, status, base_price,
    deposit_amount, single_room_supplement, balance_due_on
  ) values (
    org_id,
    upper(trim(payload->>'code')),
    trim(payload->>'title'),
    trim(payload->>'destination'),
    nullif(trim(payload->>'description'), ''),
    (payload->>'startDate')::date,
    (payload->>'endDate')::date,
    nullif(payload->>'registrationDeadline', '')::date,
    (payload->>'minimum')::integer,
    (payload->>'capacity')::integer,
    'draft',
    (payload->>'price')::numeric,
    coalesce(nullif(payload->>'deposit', '')::numeric, 0),
    coalesce(nullif(payload->>'singleSupplement', '')::numeric, 0),
    nullif(payload->>'balanceDeadline', '')::date
  ) returning id into new_trip_id;

  return new_trip_id;
end;
$$;

revoke all on function public.create_pilgrim_with_details(jsonb) from public;
revoke all on function public.create_trip(jsonb) from public;
grant execute on function public.create_pilgrim_with_details(jsonb) to authenticated;
grant execute on function public.create_trip(jsonb) to authenticated;
