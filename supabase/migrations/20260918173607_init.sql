-- 1. Profiles table (extends Supabase Auth)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Tasks table
create table tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text,
  due_at timestamp with time zone,
  completed_at timestamp with time zone,
  is_reminder boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Habits table
create table habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  frequency text check (frequency in ('daily', 'weekly')) default 'daily',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Habit Logs table (Track completions by date)
create table habit_logs (
  id uuid default gen_random_uuid() primary key,
  habit_id uuid references habits on delete cascade not null,
  completed_at date default current_date,
  unique(habit_id, completed_at) -- Prevent double-logging same day
);

-- ENABLE RLS
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;

-- RLS POLICIES (Simple User-Owned Access)
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Users can manage own tasks" on tasks for all using (auth.uid() = user_id);
create policy "Users can manage own habits" on habits for all using (auth.uid() = user_id);
create policy "Users can manage own habit logs" on habit_logs for all using (
  exists (select 1 from habits where id = habit_id and user_id = auth.uid())
);

-- TRIGGER: Create profile on signup
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
