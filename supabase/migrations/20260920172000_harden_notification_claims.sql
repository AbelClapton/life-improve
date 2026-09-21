alter table public.notification_deliveries
  add column if not exists claim_token uuid;

drop function if exists public.claim_notification_delivery(uuid, uuid, timestamp with time zone);

create or replace function public.claim_notification_delivery(
  target_user_id uuid,
  target_task_id uuid,
  target_due_at timestamp with time zone
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_token uuid := gen_random_uuid();
begin
  insert into public.notification_deliveries (user_id, task_id, due_at, status, attempts, claimed_at, claim_token)
  values (target_user_id, target_task_id, target_due_at, 'processing', 1, timezone('utc'::text, now()), next_token)
  on conflict (user_id, task_id, due_at) do nothing;
  if found then return next_token; end if;

  update public.notification_deliveries
  set status = 'processing', attempts = attempts + 1, claimed_at = timezone('utc'::text, now()), last_error = null, claim_token = next_token
  where user_id = target_user_id and task_id = target_task_id and due_at = target_due_at
    and (status = 'failed' or (status = 'processing' and claimed_at < timezone('utc'::text, now()) - interval '10 minutes'));
  return case when found then next_token else null end;
end;
$$;

grant execute on function public.claim_notification_delivery(uuid, uuid, timestamp with time zone) to service_role;
revoke execute on function public.claim_notification_delivery(uuid, uuid, timestamp with time zone) from public, anon, authenticated;

grant update on table public.notification_deliveries to service_role;
