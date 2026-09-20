create or replace function update_user_streak()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  latest_completion_date date;
  streak_cursor date;
  calculated_streak integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  select max(completed_on)
  into latest_completion_date
  from public.task_completion_events
  where user_id = new.user_id;

  if latest_completion_date is null then
    return new;
  end if;

  calculated_streak := 1;
  streak_cursor := latest_completion_date - 1;

  while exists (
    select 1
    from public.task_completion_events
    where user_id = new.user_id
      and completed_on = streak_cursor
  ) loop
    calculated_streak := calculated_streak + 1;
    streak_cursor := streak_cursor - 1;
  end loop;

  insert into public.user_points (user_id, points, streak_days, last_active_date, updated_at)
  values (new.user_id, 0, calculated_streak, latest_completion_date, now())
  on conflict (user_id) do update
  set streak_days = calculated_streak,
      last_active_date = latest_completion_date,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists task_completion_streak on public.task_completion_events;
create trigger task_completion_streak
  after insert on public.task_completion_events
  for each row execute function public.update_user_streak();