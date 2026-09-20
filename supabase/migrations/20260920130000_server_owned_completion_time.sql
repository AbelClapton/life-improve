create or replace function complete_task(
  target_task_id uuid,
  should_complete boolean,
  completion_timestamp timestamptz,
  completion_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  user_timezone text;
  server_completion_timestamp timestamptz;
  server_completion_date date;
  inserted_event boolean := false;
begin
  select user_id into target_user_id
  from public.tasks
  where id = target_task_id
    and user_id = auth.uid()
  for update;

  if target_user_id is null then
    raise exception 'Task not found.';
  end if;

  if should_complete then
    select timezone into user_timezone
    from public.profiles
    where id = auth.uid();

    server_completion_timestamp := now();
    server_completion_date := (server_completion_timestamp at time zone coalesce(user_timezone, 'Europe/Madrid'))::date;
  end if;

  update public.tasks
  set completed_at = case when should_complete then server_completion_timestamp else null end,
      status = case when should_complete then 'completed' else 'pending' end
  where id = target_task_id
    and user_id = auth.uid();

  if should_complete then
    insert into public.task_completion_events (task_id, user_id, completed_on)
    values (target_task_id, auth.uid(), server_completion_date)
    on conflict (task_id, completed_on) do nothing;

    inserted_event := found;

    if inserted_event then
      insert into public.user_points (user_id, points, last_active_date, updated_at)
      values (auth.uid(), 10, server_completion_date, now())
      on conflict (user_id) do update
      set points = public.user_points.points + 10,
          last_active_date = greatest(coalesce(public.user_points.last_active_date, excluded.last_active_date), excluded.last_active_date),
          updated_at = now();
    end if;
  end if;
end;
$$;

revoke all on function complete_task(uuid, boolean, timestamptz, date) from public;
grant execute on function complete_task(uuid, boolean, timestamptz, date) to authenticated;