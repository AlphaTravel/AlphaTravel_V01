-- Update core, emergency and special-category data in one transaction.

create or replace function public.update_pilgrim_with_details(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  org_id uuid;
  target_id uuid;
  affected integer;
begin
  org_id := public.current_organization_id();
  target_id := nullif(payload->>'pilgrimId', '')::uuid;
  if org_id is null or target_id is null
     or not public.has_org_role(org_id, array['admin','manager','operator']::public.app_role[]) then
    raise exception 'Not authorized';
  end if;

  update public.pilgrims
  set first_name = trim(payload->>'firstName'),
      last_name = trim(payload->>'lastName'),
      birth_date = nullif(payload->>'birthDate', '')::date,
      birth_place = nullif(trim(payload->>'birthPlace'), ''),
      nationality = nullif(trim(payload->>'nationality'), ''),
      fiscal_code = nullif(upper(trim(payload->>'fiscalCode')), ''),
      email = nullif(lower(trim(payload->>'email')), ''),
      phone = nullif(trim(payload->>'phone'), ''),
      address = nullif(trim(payload->>'address'), ''),
      city = nullif(trim(payload->>'city'), ''),
      operational_messages_allowed = coalesce((payload->>'operationalMessagesAllowed')::boolean, false)
  where id = target_id and organization_id = org_id;

  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Pilgrim not found'; end if;

  insert into public.pilgrim_health_profiles (
    pilgrim_id, organization_id, mobility, indicative_walking_km,
    dietary_requirements, allergies, assistance_notes, health_data_consent,
    consent_recorded_at, consent_recorded_by
  ) values (
    target_id,
    org_id,
    coalesce(nullif(payload->>'mobility', '')::public.mobility_level, 'independent'),
    coalesce(nullif(payload->>'walkingKm', '')::numeric, 0),
    nullif(trim(payload->>'dietary'), ''),
    nullif(trim(payload->>'allergies'), ''),
    nullif(trim(payload->>'healthNotes'), ''),
    coalesce((payload->>'healthConsent')::boolean, false),
    case when coalesce((payload->>'healthConsent')::boolean, false) then now() else null end,
    case when coalesce((payload->>'healthConsent')::boolean, false) then auth.uid() else null end
  )
  on conflict (pilgrim_id) do update set
    mobility = excluded.mobility,
    indicative_walking_km = excluded.indicative_walking_km,
    dietary_requirements = excluded.dietary_requirements,
    allergies = excluded.allergies,
    assistance_notes = excluded.assistance_notes,
    health_data_consent = excluded.health_data_consent,
    consent_recorded_at = case
      when excluded.health_data_consent and not pilgrim_health_profiles.health_data_consent then now()
      when excluded.health_data_consent then pilgrim_health_profiles.consent_recorded_at
      else null
    end,
    consent_recorded_by = case
      when excluded.health_data_consent and not pilgrim_health_profiles.health_data_consent then auth.uid()
      when excluded.health_data_consent then pilgrim_health_profiles.consent_recorded_by
      else null
    end;

  update public.emergency_contacts
  set name = trim(payload->>'emergencyName'),
      phone = trim(payload->>'emergencyPhone')
  where pilgrim_id = target_id and organization_id = org_id and is_primary;

  get diagnostics affected = row_count;
  if affected = 0 then
    insert into public.emergency_contacts (organization_id, pilgrim_id, name, phone, is_primary)
    values (org_id, target_id, trim(payload->>'emergencyName'), trim(payload->>'emergencyPhone'), true);
  end if;
end;
$$;

revoke all on function public.update_pilgrim_with_details(jsonb) from public;
grant execute on function public.update_pilgrim_with_details(jsonb) to authenticated;
