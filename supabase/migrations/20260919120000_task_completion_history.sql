create table if not exists task_completion_events (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  completed_on date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(task_id, completed_on)
);

alter table task_completion_events enable row level security;

create policy "Users can manage own completion events" on task_completion_events
  for all using (auth.uid() = user_id);

create index if not exists task_completion_events_user_date_idx
  on task_completion_events(user_id, completed_on);
