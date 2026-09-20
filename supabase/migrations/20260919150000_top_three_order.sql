alter table tasks
  add column if not exists top_three_position integer;

create or replace function enforce_top_three_limit()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  active_top_three_count integer;
  next_top_three_position integer;
begin
  if new.is_top_three and new.status <> 'completed' then
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

    select count(*)
    into active_top_three_count
    from tasks
    where user_id = new.user_id
      and is_top_three
      and status <> 'completed'
      and id <> new.id;

    if active_top_three_count >= 3 then
      raise exception 'TOP_THREE_LIMIT';
    end if;

    if new.top_three_position is null then
      select coalesce(max(top_three_position), 0) + 1
      into next_top_three_position
      from tasks
      where user_id = new.user_id
        and is_top_three
        and status <> 'completed';
      new.top_three_position := next_top_three_position;
    end if;
  else
    new.top_three_position := null;
  end if;

  return new;
end;
$$;

create or replace function set_task_top_three(target_task_id uuid, should_select boolean)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));

  select user_id into target_user_id
  from tasks
  where id = target_task_id
    and user_id = auth.uid()
  for update;

  if target_user_id is null then
    raise exception 'Task not found.';
  end if;

  update tasks
  set is_top_three = should_select,
      top_three_position = case when should_select then top_three_position else null end
  where id = target_task_id
    and user_id = auth.uid()
    and (should_select is false or status <> 'completed');

  if should_select and not found then
    raise exception 'Completed tasks cannot be selected as a top priority.';
  end if;
end;
$$;

create or replace function move_task_top_three(target_task_id uuid, move_direction text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_user_id uuid;
  current_position integer;
  adjacent_id uuid;
  adjacent_position integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));

  select user_id, top_three_position into target_user_id, current_position
  from tasks
  where id = target_task_id
    and user_id = auth.uid()
    and is_top_three
    and status <> 'completed'
  for update;

  if target_user_id is null or current_position is null then
    raise exception 'Top priority not found.';
  end if;

  if move_direction = 'up' then
    select id, top_three_position into adjacent_id, adjacent_position
    from tasks
    where user_id = target_user_id
      and is_top_three
      and status <> 'completed'
      and top_three_position < current_position
    order by top_three_position desc
    limit 1;
  elsif move_direction = 'down' then
    select id, top_three_position into adjacent_id, adjacent_position
    from tasks
    where user_id = target_user_id
      and is_top_three
      and status <> 'completed'
      and top_three_position > current_position
    order by top_three_position
    limit 1;
  else
    raise exception 'Invalid move direction.';
  end if;

  if adjacent_id is not null then
    update tasks set top_three_position = adjacent_position where id = target_task_id;
    update tasks set top_three_position = current_position where id = adjacent_id;
  end if;
end;
$$;

revoke all on function set_task_top_three(uuid, boolean) from public;
grant execute on function set_task_top_three(uuid, boolean) to authenticated;
revoke all on function move_task_top_three(uuid, text) from public;
grant execute on function move_task_top_three(uuid, text) to authenticated;