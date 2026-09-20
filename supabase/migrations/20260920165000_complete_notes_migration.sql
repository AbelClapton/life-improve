update public.tasks
set notes = description
where notes is null
  and description is not null;