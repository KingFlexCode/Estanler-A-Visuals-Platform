-- EST-151 Supabase keep-alive health check
--
-- This RPC intentionally performs no reads or writes against application tables.
-- It exists only to provide a lightweight, authenticated-by-publishable-key
-- database request for scheduled backend health checks.

create or replace function public.keep_alive_healthcheck()
returns jsonb
language sql
volatile
security invoker
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'ok', true,
    'checked_at', clock_timestamp()
  );
$$;

revoke all on function public.keep_alive_healthcheck() from public;
grant execute on function public.keep_alive_healthcheck() to anon, authenticated;

comment on function public.keep_alive_healthcheck() is
  'Lightweight EST-151 backend health check. Reads/writes no application data.';
