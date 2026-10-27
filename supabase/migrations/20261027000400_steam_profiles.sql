begin;
-- Steam identities are written by Supabase only after the server-side OpenID bridge verifies Steam.
-- This does not change confirmed-email requirements for administrator access.
create or replace function private.has_game_identity(account_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u
    where u.id = account_id and not coalesce(u.is_anonymous, false)
      and (u.banned_until is null or u.banned_until <= now())
      and (
        u.email_confirmed_at is not null or exists (
          select 1 from auth.identities i
          where i.user_id = u.id and i.provider in ('custom:telegram','custom:steam')
        )
      )
  );
$$;
revoke all on function private.has_game_identity(uuid) from public, anon, authenticated;

create or replace function private.on_game_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.provider in ('custom:telegram','custom:steam') and private.has_game_identity(new.user_id) then
    insert into public.profiles(id,email)
    select id,coalesce(email,'') from auth.users where id = new.user_id
    on conflict(id) do nothing;
    insert into public.player_progress(id,captain_name)
    values(new.user_id,'Captain ' || upper(left(replace(new.user_id::text,'-',''),8)))
    on conflict(id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.on_game_identity() from public, anon, authenticated;
commit;
