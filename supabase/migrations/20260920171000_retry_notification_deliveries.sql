alter table public.notification_deliveries
  add column if not exists status text not null default 'processing'
    check (status in ('processing', 'sent', 'failed')),
  add column if not exists attempts integer not null default 1 check (attempts > 0),
  add column if not exists claimed_at timestamp with time zone default timezone('utc'::text, now()),
  add column if not exists last_error text;

create or replace function public.claim_notification_delivery(
  target_user_id uuid,
  target_task_id uuid,
  target_due_at timestamp with time zone
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_count integer;
begin
  insert into public.notification_deliveries (user_id, task_id, due_at, status, attempts, claimed_at)
  values (target_user_id, target_task_id, target_due_at, 'processing', 1, timezone('utc'::text, now()))
  on conflict (user_id, task_id, due_at) do nothing;
  if found then return true; end if;

  update public.notification_deliveries
  set status = 'processing', attempts = attempts + 1, claimed_at = timezone('utc'::text, now()), last_error = null
  where user_id = target_user_id and task_id = target_task_id and due_at = target_due_at
    and (status = 'failed' or (status = 'processing' and claimed_at < timezone('utc'::text, now()) - interval '10 minutes'));
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

revoke all on function public.claim_notification_delivery(uuid, uuid, timestamp with time zone) from public, anon, authenticated;