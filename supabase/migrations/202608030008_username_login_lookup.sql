-- Resolve the internal Auth identity without granting the Edge Function direct
-- SELECT access to organization membership data.

create or replace function public.resolve_username_login(target_username text)
returns table (
  user_id uuid,
  email text,
  is_active boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select member.user_id, member.email, member.is_active
  from public.organization_members member
  where member.username = lower(trim(target_username))
  limit 1;
$$;

revoke all on function public.resolve_username_login(text) from public, anon, authenticated;
grant execute on function public.resolve_username_login(text) to service_role;
