alter table public.push_subscriptions
  add column if not exists locale text not null default 'es'
    check (locale in ('en', 'es'));