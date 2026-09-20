create or replace function enforce_top_three_limit()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  active_top_three_count integer;
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
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_top_three_limit on tasks;

create trigger enforce_top_three_limit
before insert or update of is_top_three, status on tasks
for each row execute function enforce_top_three_limit();