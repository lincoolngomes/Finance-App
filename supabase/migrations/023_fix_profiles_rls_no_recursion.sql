drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Admins can manage all profiles" on public.profiles;
drop policy if exists "profile_access_policy" on public.profiles;
drop policy if exists "admin_full_access" on public.profiles;
drop policy if exists "service_role_access" on public.profiles;
drop policy if exists "admin_access" on public.profiles;
drop policy if exists "own_profile_access" on public.profiles;
drop policy if exists "service_role_full_access" on public.profiles;

alter table public.profiles disable row level security;
alter table public.profiles enable row level security;

create policy "own_profile_access"
  on public.profiles for all
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "service_role_full_access"
  on public.profiles for all
  to service_role
  using (true)
  with check (true);
