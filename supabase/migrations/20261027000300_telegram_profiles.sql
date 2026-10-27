begin;
-- Trust only identities written by Supabase Auth, never editable user metadata.
-- Administrator access still requires a confirmed email and is unchanged.
create function private.has_game_identity(account_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u
    where u.id = account_id and not coalesce(u.is_anonymous, false)
      and (u.banned_until is null or u.banned_until <= now())
      and (
        u.email_confirmed_at is not null or exists (
          select 1 from auth.identities i
          where i.user_id = u.id and i.provider = 'custom:telegram'
        )
      )
  );
$$;
revoke all on function private.has_game_identity(uuid) from public, anon, authenticated;

-- Identity insertion follows auth.users insertion, so a user-only trigger cannot
-- provision an email-less account reliably. Use the server-owned identity row.
create function private.on_game_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.provider = 'custom:telegram' and private.has_game_identity(new.user_id) then
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
create trigger game_identity_profile after insert on auth.identities
for each row execute function private.on_game_identity();

create or replace function private.project_save(account_id uuid, payload jsonb, saved_time timestamptz) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  layer_id text;
  system_id text;
  layers jsonb := payload #> '{world,layers}';
  layer jsonb;
  depth integer := 0;
  outposts integer := 0;
  upgrades integer := 0;
  automation integer := 0;
begin
  foreach layer_id in array array['shallows','golden-trench','pearl-caverns'] loop
    layer := layers -> layer_id;
    if jsonb_typeof(layer) = 'object' then
      outposts := outposts + 1;
      depth := case layer_id when 'shallows' then 50 when 'golden-trench' then 180 else 420 end;
      foreach system_id in array array['mining','transport','processing','storage'] loop
        upgrades := upgrades + greatest(0,private.progress_number(layer #> array['levels',system_id],5)::integer - 1);
      end loop;
      automation := automation + private.progress_number(layer #> '{automation,level}',3)::integer;
    end if;
  end loop;
  insert into public.player_progress(id,captain_name,depth_m,outposts,upgrades,research,automation,credits,updated_at)
  select account_id,'Captain ' || upper(left(replace(account_id::text,'-',''),8)),depth,outposts,upgrades,
    private.progress_number(payload #> '{world,progression,research,trade}',3)::integer + private.progress_number(payload #> '{world,progression,research,storage}',3)::integer,
    automation,private.progress_number(payload #> '{world,credits}',9007199254740991),saved_time
  where private.has_game_identity(account_id)
  on conflict(id) do update set depth_m=excluded.depth_m,outposts=excluded.outposts,upgrades=excluded.upgrades,
    research=excluded.research,automation=excluded.automation,credits=excluded.credits,updated_at=excluded.updated_at;
end; $$;
revoke all on function private.project_save(uuid,jsonb,timestamptz) from public, anon, authenticated;

-- Repair accounts created between provider setup and this migration.
insert into public.player_progress(id,captain_name)
select u.id,'Captain ' || upper(left(replace(u.id::text,'-',''),8))
from auth.users u where private.has_game_identity(u.id)
on conflict(id) do nothing;
select private.project_save(user_id,save,updated_at) from public.game_saves;
commit;
