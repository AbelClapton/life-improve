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
  target_title text;
  target_description text;
  target_notes text;
  target_area_id uuid;
  target_priority text;
  target_due_at timestamptz;
  target_start_at timestamptz;
  target_duration_min integer;
  target_recurrence text;
  target_recurrence_day integer;
  target_is_reminder boolean;
  user_timezone text;
  server_completion_timestamp timestamptz;
  server_completion_date date;
  inserted_event boolean := false;
  next_local_due_at timestamp;
  next_local_start_at timestamp;
  next_recurrence_day integer;
begin
  select user_id, title, description, notes, area_id, priority, due_at, start_at,
    duration_min, recurrence, recurrence_day, is_reminder
  into target_user_id, target_title, target_description, target_notes, target_area_id,
    target_priority, target_due_at, target_start_at, target_duration_min,
    target_recurrence, target_recurrence_day, target_is_reminder
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

    user_timezone := coalesce(user_timezone, 'Europe/Madrid');
    server_completion_timestamp := now();
    server_completion_date := (server_completion_timestamp at time zone user_timezone)::date;
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

      if target_recurrence <> 'none' then
        next_local_due_at := coalesce(target_due_at at time zone user_timezone, server_completion_timestamp at time zone user_timezone);
        next_local_start_at := target_start_at at time zone user_timezone;
        next_recurrence_day := null;

        if target_recurrence = 'daily' then
          next_local_due_at := next_local_due_at + interval '1 day';
          if next_local_start_at is not null then next_local_start_at := next_local_start_at + interval '1 day'; end if;
        elsif target_recurrence = 'weekly' then
          next_local_due_at := next_local_due_at + interval '7 days';
          if next_local_start_at is not null then next_local_start_at := next_local_start_at + interval '7 days'; end if;
        elsif target_recurrence = 'monthly' then
          next_recurrence_day := coalesce(target_recurrence_day, extract(day from next_local_due_at)::integer);
          next_local_due_at := date_trunc('month', next_local_due_at + interval '1 month')
            + (least(
              next_recurrence_day,
              extract(day from date_trunc('month', next_local_due_at + interval '2 months') - interval '1 day')::integer
            ) - 1) * interval '1 day'
            + next_local_due_at::time;
          if next_local_start_at is not null then next_local_start_at := next_local_start_at + interval '1 month'; end if;
        end if;

        insert into public.tasks (
          user_id, title, description, notes, area_id, priority, due_at, start_at,
          duration_min, is_top_three, recurrence, recurrence_day, is_reminder
        ) values (
          auth.uid(), target_title, target_description, target_notes, target_area_id,
          target_priority, next_local_due_at at time zone user_timezone,
          next_local_start_at at time zone user_timezone, target_duration_min, false,
          target_recurrence, next_recurrence_day, target_is_reminder
        );
      end if;
    end if;
  end if;
end;
$$;

revoke all on function complete_task(uuid, boolean, timestamptz, date) from public;
grant execute on function complete_task(uuid, boolean, timestamptz, date) to authenticated;