create or replace function award_achievement(target_user_id uuid, target_key text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_achievement_id uuid;
  target_points integer;
  awarded_achievement_id uuid;
begin
  select id, points
  into target_achievement_id, target_points
  from public.achievements
  where key = target_key;

  if target_achievement_id is null then
    return;
  end if;

  insert into public.user_achievements (user_id, achievement_id)
  values (target_user_id, target_achievement_id)
  on conflict (user_id, achievement_id) do nothing
  returning achievement_id into awarded_achievement_id;

  if awarded_achievement_id is not null then
    insert into public.user_points (user_id, points, updated_at)
    values (target_user_id, target_points, now())
    on conflict (user_id) do update
    set points = public.user_points.points + target_points,
        updated_at = now();
  end if;
end;
$$;

revoke all on function public.award_achievement(uuid, text) from public;
revoke all on function public.award_achievement(uuid, text) from anon;
revoke all on function public.award_achievement(uuid, text) from authenticated;

create or replace function award_task_achievements()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  latest_completion_date date;
  streak_cursor date;
  calculated_streak integer := 0;
  completed_today integer := 0;
  perfect_week_days integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  select max(completed_on)
  into latest_completion_date
  from public.task_completion_events
  where user_id = new.user_id;

  select count(*)
  into completed_today
  from public.task_completion_events
  where user_id = new.user_id
    and completed_on = new.completed_on;

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

  select count(*)
  into perfect_week_days
  from generate_series(0, 6) as day_offset
  where (
    select count(*)
    from public.task_completion_events
    where user_id = new.user_id
      and completed_on = latest_completion_date - day_offset
  ) >= 3;

  perform public.award_achievement(new.user_id, 'first_task');
  if calculated_streak >= 3 then
    perform public.award_achievement(new.user_id, 'three_day_streak');
  end if;
  if completed_today >= 10 then
    perform public.award_achievement(new.user_id, 'ten_tasks_day');
  end if;
  if perfect_week_days = 7 then
    perform public.award_achievement(new.user_id, 'perfect_week');
  end if;

  return new;
end;
$$;

revoke all on function public.award_task_achievements() from public;
revoke all on function public.award_task_achievements() from anon;
revoke all on function public.award_task_achievements() from authenticated;