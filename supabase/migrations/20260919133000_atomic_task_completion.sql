create or replace function complete_task(
  target_task_id uuid,
  should_complete boolean,
  completion_timestamp timestamptz,
  completion_date date
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_user_id uuid;
  inserted_event boolean := false;
begin
  select user_id into target_user_id
  from tasks
  where id = target_task_id
    and user_id = auth.uid()
  for update;

  if target_user_id is null then
    raise exception 'Task not found.';
  end if;

  update tasks
  set completed_at = case when should_complete then completion_timestamp else null end,
      status = case when should_complete then 'completed' else 'pending' end
  where id = target_task_id
    and user_id = auth.uid();

  if should_complete then
    insert into task_completion_events (task_id, user_id, completed_on)
    values (target_task_id, auth.uid(), completion_date)
    on conflict (task_id, completed_on) do nothing;

    inserted_event := found;

    if inserted_event then
      insert into user_points (user_id, points, last_active_date, updated_at)
      values (auth.uid(), 10, completion_date, now())
      on conflict (user_id) do update
      set points = user_points.points + 10,
          last_active_date = greatest(coalesce(user_points.last_active_date, excluded.last_active_date), excluded.last_active_date),
          updated_at = now();
    end if;
  end if;
end;
$$;

revoke all on function complete_task(uuid, boolean, timestamptz, date) from public;
grant execute on function complete_task(uuid, boolean, timestamptz, date) to authenticated;
