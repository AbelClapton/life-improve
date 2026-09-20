revoke update on table tasks from authenticated;
grant update (
  title,
  description,
  notes,
  due_at,
  area_id,
  priority,
  status,
  start_at,
  duration_min,
  is_top_three,
  top_three_position,
  recurrence,
  is_reminder
) on table tasks to authenticated;

revoke insert on table task_completion_events from authenticated;