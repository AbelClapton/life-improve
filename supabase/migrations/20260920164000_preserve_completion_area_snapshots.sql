alter table public.task_completion_events
  add column if not exists area_id_snapshot uuid,
  add column if not exists area_name_snapshot text,
  add column if not exists area_color_snapshot text;

update public.task_completion_events as events
set area_id_snapshot = tasks.area_id,
    area_name_snapshot = areas.name,
    area_color_snapshot = areas.color
from public.tasks
left join public.areas on areas.id = tasks.area_id
where events.task_id = tasks.id
  and events.area_name_snapshot is null;

alter table public.task_completion_events
  alter column task_id drop not null;

alter table public.task_completion_events
  drop constraint if exists task_completion_events_task_id_fkey;

alter table public.task_completion_events
  add constraint task_completion_events_task_id_fkey
  foreign key (task_id) references public.tasks(id) on delete set null;

create or replace function public.snapshot_task_completion_area()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select tasks.area_id, areas.name, areas.color
    into new.area_id_snapshot, new.area_name_snapshot, new.area_color_snapshot
  from public.tasks
  left join public.areas on areas.id = tasks.area_id
  where tasks.id = new.task_id;
  return new;
end;
$$;

drop trigger if exists task_completion_area_snapshot on public.task_completion_events;
create trigger task_completion_area_snapshot
before insert on public.task_completion_events
for each row execute function public.snapshot_task_completion_area();

revoke all on function public.snapshot_task_completion_area() from public, anon, authenticated;