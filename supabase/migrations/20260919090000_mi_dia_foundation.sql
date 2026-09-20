-- Mi Dia domain foundation. Keep the existing columns during the transition
-- so the current task forms continue to work while the new UI is introduced.

alter table profiles
  add column if not exists display_name text,
  add column if not exists timezone text not null default 'Europe/Madrid',
  add column if not exists theme text not null default 'system'
    check (theme in ('light', 'dark', 'system')),
  add column if not exists notifications_enabled boolean not null default true;

create table if not exists areas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  color text not null default '#6366f1',
  icon text not null default 'circle',
  goal text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, name)
);

alter table tasks
  add column if not exists notes text,
  add column if not exists area_id uuid references areas on delete set null,
  add column if not exists priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'completed', 'postponed')),
  add column if not exists start_at timestamp with time zone,
  add column if not exists duration_min integer
    check (duration_min is null or duration_min > 0),
  add column if not exists is_top_three boolean not null default false,
  add column if not exists recurrence text not null default 'none'
    check (recurrence in ('none', 'daily', 'weekly', 'monthly'));

update tasks
set notes = description
where notes is null and description is not null;

update tasks
set status = case when completed_at is null then 'pending' else 'completed' end;

create table if not exists daily_reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  review_date date not null,
  intention text,
  mood integer check (mood is null or mood between 1 and 5),
  energy integer check (energy is null or energy between 1 and 5),
  wins text,
  blockers text,
  tomorrow_top_three text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, review_date)
);

create table if not exists user_points (
  user_id uuid references auth.users on delete cascade primary key,
  points integer not null default 0 check (points >= 0),
  streak_days integer not null default 0 check (streak_days >= 0),
  last_active_date date,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists achievements (
  id uuid default gen_random_uuid() primary key,
  key text unique not null,
  name text not null,
  description text not null,
  points integer not null default 0 check (points >= 0)
);

create table if not exists user_achievements (
  user_id uuid references auth.users on delete cascade not null,
  achievement_id uuid references achievements on delete cascade not null,
  earned_at timestamp with time zone default timezone('utc'::text, now()),
  primary key(user_id, achievement_id)
);

alter table areas enable row level security;
alter table daily_reviews enable row level security;
alter table user_points enable row level security;
alter table achievements enable row level security;
alter table user_achievements enable row level security;

create policy "Users can manage own areas" on areas for all using (auth.uid() = user_id);
create policy "Users can manage own daily reviews" on daily_reviews for all using (auth.uid() = user_id);
create policy "Users can manage own points" on user_points for all using (auth.uid() = user_id);
create policy "Anyone can view achievements" on achievements for select using (true);
create policy "Users can view own achievements" on user_achievements for select using (auth.uid() = user_id);

create index if not exists tasks_user_due_at_idx on tasks(user_id, due_at);
create index if not exists tasks_user_status_idx on tasks(user_id, status);
create index if not exists daily_reviews_user_date_idx on daily_reviews(user_id, review_date);

insert into achievements (key, name, description, points)
values
  ('first_task', 'Primera tarea completada', 'Completa tu primera tarea.', 10),
  ('three_day_streak', 'Racha de 3 días', 'Completa al menos una tarea durante tres días seguidos.', 25),
  ('perfect_week', 'Semana perfecta', 'Completa tus tres prioridades durante siete días.', 100),
  ('ten_tasks_day', 'Diez tareas en un día', 'Completa diez tareas en un solo día.', 50)
on conflict (key) do nothing;