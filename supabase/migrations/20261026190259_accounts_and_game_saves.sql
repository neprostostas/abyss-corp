begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
create table private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);
revoke all on private.admin_users from public, anon, authenticated;

create function private.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from private.admin_users where user_id = (select auth.uid())); $$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create function public.is_database_admin() returns boolean
language sql stable security invoker set search_path = ''
as $$ select private.is_admin(); $$;
revoke all on function public.is_database_admin() from public, anon;
grant execute on function public.is_database_admin() to authenticated;

create function private.sync_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, email) values(new.id, coalesce(new.email, ''))
  on conflict(id) do update set email = excluded.email;
  return new;
end; $$;
revoke all on function private.sync_profile() from public, anon, authenticated;
create trigger account_profile after insert or update of email on auth.users
for each row execute function private.sync_profile();
insert into public.profiles(id, email) select id, coalesce(email, '') from auth.users;

create table public.game_saves (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  revision bigint not null check (revision between 1 and 9007199254740991),
  updated_at timestamptz not null default now(),
  save jsonb not null check (
    save ?& array['version','savedAt','world'] and
    jsonb_typeof(save) = 'object' and
    save @> '{"version":6}'::jsonb and
    jsonb_typeof(save -> 'savedAt') = 'number' and
    jsonb_typeof(save -> 'world') = 'object' and
    (save -> 'world') ?& array['credits','selectedLayerId','layers','progression'] and
    (save #> '{world,layers}') ? 'shallows' and
    jsonb_typeof(save #> '{world,layers,shallows}') = 'object' and
    octet_length(save::text) <= 131072
  )
);
alter table public.profiles enable row level security;
alter table public.game_saves enable row level security;
revoke all on public.profiles, public.game_saves from anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update on public.game_saves to authenticated;
create policy profile_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.is_admin()));
create policy save_read on public.game_saves for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy save_insert on public.game_saves for insert to authenticated
with check (user_id = (select auth.uid()));
create policy save_update on public.game_saves for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- One atomic compare-and-swap; the account ID is also checked against the JWT.
create function public.write_game_save(account_id uuid, expected_revision bigint, payload jsonb)
returns setof public.game_saves
language plpgsql security invoker set search_path = '' as $$
declare result public.game_saves;
begin
  if auth.uid() is null or account_id is distinct from auth.uid() then
    raise exception 'Account changed. Sign in again.' using errcode = '42501';
  end if;
  if expected_revision < 0 or expected_revision >= 9007199254740991 then
    raise exception 'Invalid revision.' using errcode = '22023';
  end if;
  if expected_revision = 0 then
    insert into public.game_saves(user_id, revision, save)
    values(account_id, 1, payload) on conflict(user_id) do nothing returning * into result;
  else
    update public.game_saves set revision = expected_revision + 1, updated_at = now(), save = payload
    where user_id = account_id and revision = expected_revision returning * into result;
  end if;
  if result.user_id is null then
    raise exception 'Progress changed on another device.' using errcode = '40001';
  end if;
  return next result;
end; $$;
revoke all on function public.write_game_save(uuid, bigint, jsonb) from public, anon;
grant execute on function public.write_game_save(uuid, bigint, jsonb) to authenticated;
commit;
