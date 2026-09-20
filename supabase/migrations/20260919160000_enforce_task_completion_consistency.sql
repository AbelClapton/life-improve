update tasks
set status = case when completed_at is null then 'pending' else 'completed' end;

alter table tasks
  add constraint tasks_completion_consistency
  check ((status = 'completed') = (completed_at is not null));

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
  if new.status = 'completed' or new.completed_at is not null then
    new.is_top_three := false;
    new.top_three_position := null;
    return new;
  end if;

  if new.is_top_three then
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

    select count(*)
    into active_top_three_count
    from tasks
    where user_id = new.user_id
      and is_top_three
      and status <> 'completed'
      and completed_at is null
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
        and status <> 'completed'
        and completed_at is null;
      new.top_three_position := next_top_three_position;
    end if;
  else
    new.top_three_position := null;
  end if;

  return new;
end;
$$;
