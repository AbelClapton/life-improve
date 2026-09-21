alter table public.notification_deliveries
  alter column delivered_at drop default;

update public.notification_deliveries
set delivered_at = null
where status <> 'sent';
