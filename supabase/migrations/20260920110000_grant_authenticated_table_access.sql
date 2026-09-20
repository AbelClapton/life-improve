grant usage on schema public to authenticated;

grant select, update on table profiles to authenticated;
grant select, insert, update, delete on table tasks to authenticated;
grant select, insert, update, delete on table habits to authenticated;
grant select, insert, update, delete on table habit_logs to authenticated;
grant select, insert, update, delete on table areas to authenticated;
grant select, insert, update, delete on table daily_reviews to authenticated;
grant select on table user_points to authenticated;
grant select on table achievements to authenticated;
grant select on table user_achievements to authenticated;
grant select, insert on table task_completion_events to authenticated;
