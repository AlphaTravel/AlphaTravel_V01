-- Avoid a PostgreSQL keyword collision: CURRENT_TIME is a time-with-time-zone
-- expression, while the rate-limit timestamps are timestamptz.

create or replace function public.consume_username_login_attempt(attempt_key text)
returns boolean
language plpgsql
security definer
set search_path = private, pg_temp
as $$
declare
  current_attempt private.username_login_attempts%rowtype;
  observed_at timestamptz := clock_timestamp();
  normalized_key text := attempt_key;
begin
  if normalized_key !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  insert into private.username_login_attempts (attempt_key)
  values (normalized_key)
  on conflict do nothing;

  select * into current_attempt
  from private.username_login_attempts
  where username_login_attempts.attempt_key = normalized_key
  for update;

  if current_attempt.blocked_until is not null and current_attempt.blocked_until > observed_at then
    return false;
  end if;

  if current_attempt.window_started_at <= observed_at - interval '15 minutes' then
    update private.username_login_attempts
    set window_started_at = observed_at,
        attempts = 1,
        blocked_until = null,
        updated_at = observed_at
    where username_login_attempts.attempt_key = normalized_key;
    return true;
  end if;

  if current_attempt.attempts >= 5 then
    update private.username_login_attempts
    set blocked_until = greatest(
          coalesce(blocked_until, observed_at),
          window_started_at + interval '15 minutes'
        ),
        updated_at = observed_at
    where username_login_attempts.attempt_key = normalized_key;
    return false;
  end if;

  update private.username_login_attempts
  set attempts = attempts + 1,
      updated_at = observed_at
  where username_login_attempts.attempt_key = normalized_key;
  return true;
end;
$$;

revoke all on function public.consume_username_login_attempt(text) from public, anon, authenticated;
grant execute on function public.consume_username_login_attempt(text) to service_role;
