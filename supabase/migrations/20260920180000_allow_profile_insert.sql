create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

grant insert on table public.profiles to authenticated;