with ranked_top_three as (
  select
    id,
    row_number() over (
      partition by user_id
      order by due_at nulls last, created_at, id
    )::integer as position
  from tasks
  where is_top_three
    and status <> 'completed'
)
update tasks
set top_three_position = ranked_top_three.position
from ranked_top_three
where tasks.id = ranked_top_three.id
  and tasks.top_three_position is null;