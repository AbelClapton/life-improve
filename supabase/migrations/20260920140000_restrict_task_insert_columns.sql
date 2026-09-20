revoke insert on table tasks from authenticated;
grant insert (
  user_id,
  title,
  description,
  notes,
  area_id,
  priority,
  due_at,
  start_at,
  duration_min,
  is_top_three,
  recurrence,
  is_reminder
) on table tasks to authenticated;
