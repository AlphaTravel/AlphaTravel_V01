-- Explicit Data API privileges for projects created with
-- "Automatically expose new tables" disabled.
-- RLS policies remain the authoritative row-level boundary.

grant usage on schema public to authenticated;

revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;

grant select, update on table public.organizations to authenticated;
grant select, insert, update, delete on table public.organization_members to authenticated;
grant select, insert, update, delete on table public.pilgrims to authenticated;
grant select, insert, update, delete on table public.pilgrim_health_profiles to authenticated;
grant select, insert, update, delete on table public.emergency_contacts to authenticated;
grant select, insert, update, delete on table public.trips to authenticated;
grant select, insert, update, delete on table public.trip_groups to authenticated;
grant select, insert, update, delete on table public.registrations to authenticated;
grant select, insert, update, delete on table public.accommodations to authenticated;
grant select, insert, update, delete on table public.rooms to authenticated;
grant select, insert, update, delete on table public.room_assignments to authenticated;
grant select, insert, update, delete on table public.vehicles to authenticated;
grant select, insert, update, delete on table public.vehicle_seats to authenticated;
grant select, insert, update, delete on table public.seat_assignments to authenticated;
grant select, insert, update, delete on table public.itinerary_items to authenticated;
grant select, insert, update, delete on table public.payments to authenticated;
grant select, insert, update, delete on table public.documents to authenticated;
grant select on table public.audit_logs to authenticated;

-- The identity sequence is never written directly by authenticated users,
-- but SELECT is required for authorized audit-log reads through PostgREST.
grant select on sequence public.audit_logs_id_seq to authenticated;

