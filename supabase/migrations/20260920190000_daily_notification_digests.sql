create table if not exists public.notification_digest_deliveries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  kind text not null check (kind in ('morning_summary', 'night_closure')),
  local_date date not null,
  status text not null default 'processing' check (status in ('processing', 'sent', 'failed')),
  attempts integer not null default 1 check (attempts > 0),
  claimed_at timestamp with time zone default timezone('utc'::text, now()),
  delivered_at timestamp with time zone,
  claim_token uuid,
  last_error text,
  unique(user_id, kind, local_date)
);

alter table public.notification_digest_deliveries enable row level security;

create policy "Users can view own notification digest deliveries"
  on public.notification_digest_deliveries for select using (auth.uid() = user_id);

create index if not exists notification_digest_deliveries_user_date_idx
  on public.notification_digest_deliveries(user_id, local_date);

create or replace function public.claim_notification_digest(
  target_user_id uuid,
  target_kind text,
  target_local_date date
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_token uuid := gen_random_uuid();
begin
  insert into public.notification_digest_deliveries (
    user_id, kind, local_date, status, attempts, claimed_at, claim_token
  ) values (
    target_user_id, target_kind, target_local_date, 'processing', 1, timezone('utc'::text, now()), next_token
  )
  on conflict (user_id, kind, local_date) do nothing;
  if found then return next_token; end if;

  update public.notification_digest_deliveries
  set status = 'processing',
      attempts = attempts + 1,
      claimed_at = timezone('utc'::text, now()),
      claim_token = next_token,
      last_error = null
  where user_id = target_user_id
    and kind = target_kind
    and local_date = target_local_date
    and (status = 'failed' or (status = 'processing' and claimed_at < timezone('utc'::text, now()) - interval '10 minutes'));
  return case when found then next_token else null end;
end;
$$;

revoke all on function public.claim_notification_digest(uuid, text, date) from public, anon, authenticated;
grant execute on function public.claim_notification_digest(uuid, text, date) to service_role;
grant select, update on table public.notification_digest_deliveries to service_role;