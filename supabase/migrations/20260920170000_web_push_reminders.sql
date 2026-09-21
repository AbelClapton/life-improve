create table if not exists public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, endpoint)
);

create table if not exists public.notification_deliveries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  task_id uuid references public.tasks on delete cascade not null,
  due_at timestamp with time zone not null,
  delivered_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, task_id, due_at)
);

alter table public.push_subscriptions enable row level security;
alter table public.notification_deliveries enable row level security;

create policy "Users can manage own push subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can view own notification deliveries" on public.notification_deliveries
  for select using (auth.uid() = user_id);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
create index if not exists notification_deliveries_due_idx on public.notification_deliveries(due_at);

grant select, insert, update, delete on table public.push_subscriptions to authenticated;
grant select on table public.notification_deliveries to authenticated;
revoke insert, update, delete on table public.notification_deliveries from authenticated;
