-- Reading portfolio images must not exhaust the separate research allowance.
-- Keep existing records, locks, ownership checks and paid-call caps intact.
do $migration$
declare definition text; old_rule text; new_rule text;
begin
  definition := pg_get_functiondef('public.terminal_action(uuid,text,jsonb)'::regprocedure);
  old_rule := $old$if (select count(*) from terminal_runs where owner_id=who and started_at>date_trunc('day',now()) and kind<>'refresh')>=12 and args->>'kind'<>'refresh' then raise exception 'Daily research limit reached (12 runs).'; end if;$old$;
  new_rule := $new$if args->>'kind'='screenshot' and (select count(*) from terminal_runs where owner_id=who and started_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC' and kind='screenshot')>=20 then raise exception 'Daily screenshot limit reached (20 images). Resets at 00:00 UTC / 04:00 Dubai. Saved holdings and price updates remain available.'; end if;
    if args->>'kind' not in ('refresh','screenshot') and (select count(*) from terminal_runs where owner_id=who and started_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC' and kind not in ('refresh','screenshot'))>=12 then raise exception 'Daily research limit reached (12 reviews). Resets at 00:00 UTC / 04:00 Dubai. Saved holdings and price updates remain available.'; end if;$new$;
  if position(old_rule in definition)>0 then execute replace(definition,old_rule,new_rule);
  elsif position(new_rule in definition)=0 then raise exception 'Unexpected terminal quota definition; review before applying'; end if;
end $migration$;

create or replace function public.terminal_usage() returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare day_start timestamptz := date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
begin
  if not public.terminal_allowed() then raise exception 'Portfolio access required'; end if;
  return (select jsonb_build_object(
    'screenshots',count(*) filter(where kind='screenshot'), 'screenshotLimit',20,
    'research',count(*) filter(where kind not in ('refresh','screenshot')), 'researchLimit',12,
    'resetsAt',day_start+interval '1 day') from terminal_runs where owner_id=auth.uid() and started_at>=day_start);
end $$;
revoke all on function public.terminal_usage() from public,anon;
grant execute on function public.terminal_usage() to authenticated;
