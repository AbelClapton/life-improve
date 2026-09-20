create or replace function update_user_streak()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_points (user_id, points, streak_days, last_active_date, updated_at)
  values (new.user_id, 0, 1, new.completed_on, now())
  on conflict (user_id) do update
  set streak_days = case
    when public.user_points.last_active_date = excluded.last_active_date then public.user_points.streak_days
    when public.user_points.last_active_date = excluded.last_active_date - 1 then public.user_points.streak_days + 1
    else 1
  end,
  last_active_date = greatest(coalesce(public.user_points.last_active_date, excluded.last_active_date), excluded.last_active_date),
  updated_at = now();

  return new;
end;
$$;

drop trigger if exists task_completion_streak on public.task_completion_events;
create trigger task_completion_streak
  after insert on public.task_completion_events
  for each row execute function public.update_user_streak();