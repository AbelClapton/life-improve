drop policy if exists "Users can manage own points" on user_points;
create policy "Users can view own points" on user_points
  for select using (auth.uid() = user_id);

drop policy if exists "Anyone can view achievements" on achievements;
create policy "Authenticated users can view achievements" on achievements
  for select to authenticated using (true);

drop policy if exists "Users can manage own completion events" on task_completion_events;
create policy "Users can view own completion events" on task_completion_events
  for select using (auth.uid() = user_id);
create policy "Users can insert own completion events" on task_completion_events
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.tasks
      where tasks.id = task_id
        and tasks.user_id = auth.uid()
    )
  );

create index if not exists areas_user_id_idx on areas(user_id);
create index if not exists user_achievements_user_id_idx on user_achievements(user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.email);
  return new;
end;
$$;

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

  update public.tasks
  set completed_at = case when should_complete then completion_timestamp else null end,
      status = case when should_complete then 'completed' else 'pending' end
  where id = target_task_id
    and user_id = auth.uid();

  if should_complete then
    insert into public.task_completion_events (task_id, user_id, completed_on)
    values (target_task_id, auth.uid(), completion_date)
    on conflict (task_id, completed_on) do nothing;

    inserted_event := found;

    if inserted_event then
      insert into public.user_points (user_id, points, last_active_date, updated_at)
      values (auth.uid(), 10, completion_date, now())
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
