begin;
-- Administrator reads also require a currently active provider session.
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from private.admin_users a
    join auth.users u on u.id = a.user_id
    join auth.sessions s on s.user_id = u.id
    where a.user_id = (select auth.uid())
      and s.id::text = ((select auth.jwt()) ->> 'session_id')
      and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until <= now())
  );
$$;

create table public.player_progress (
  id uuid primary key references public.profiles(id) on delete cascade,
  captain_name text not null check (char_length(captain_name) between 3 and 24 and captain_name = btrim(captain_name) and captain_name !~ '[[:cntrl:]]'),
  depth_m integer not null default 0 check (depth_m in (0,50,180,420)),
  outposts integer not null default 0 check (outposts between 0 and 3),
  upgrades integer not null default 0 check (upgrades between 0 and 48),
  research integer not null default 0 check (research between 0 and 6),
  automation integer not null default 0 check (automation between 0 and 9),
  credits bigint not null default 0 check (credits between 0 and 9007199254740991),
  updated_at timestamptz not null default now()
);
alter table public.player_progress enable row level security;
revoke all on public.player_progress from public, anon, authenticated;
grant select on public.player_progress to authenticated;
grant update(captain_name) on public.player_progress to authenticated;
create policy progress_read on public.player_progress for select to authenticated using (true);
create policy captain_rename on public.player_progress for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
create index player_progress_ranking on public.player_progress(depth_m desc, upgrades desc, research desc, automation desc, credits desc, id);
alter table private.admin_users enable row level security;
alter table private.admin_invitations enable row level security;

-- These internal helpers project only a fixed, bounded subset of the save.
create function private.progress_number(value jsonb, maximum bigint) returns bigint
language sql immutable security invoker set search_path = '' as $$
  select case when jsonb_typeof(value) = 'number'
    then least(maximum::numeric, greatest(0::numeric, trunc(value::text::numeric)))::bigint else 0 end;
$$;
revoke all on function private.progress_number(jsonb,bigint) from public, anon, authenticated;

create function private.project_save(account_id uuid, payload jsonb, saved_time timestamptz) returns void
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
  where exists(select 1 from auth.users where id = account_id and email_confirmed_at is not null)
  on conflict(id) do update set depth_m=excluded.depth_m,outposts=excluded.outposts,upgrades=excluded.upgrades,
    research=excluded.research,automation=excluded.automation,credits=excluded.credits,updated_at=excluded.updated_at;
end; $$;
revoke all on function private.project_save(uuid,jsonb,timestamptz) from public, anon, authenticated;

create function private.on_progress_save() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and auth.uid() <> new.user_id then
    raise exception 'Save owner mismatch.' using errcode='42501';
  end if;
  perform private.project_save(new.user_id,new.save,new.updated_at);
  return new;
end; $$;
revoke all on function private.on_progress_save() from public, anon, authenticated;
create trigger project_progress after insert or update of save on public.game_saves
for each row execute function private.on_progress_save();

create or replace function private.sync_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,email) values(new.id,coalesce(new.email,''))
  on conflict(id) do update set email=excluded.email;
  if new.email_confirmed_at is not null then
    insert into public.player_progress(id,captain_name)
    values(new.id,'Captain ' || upper(left(replace(new.id::text,'-',''),8))) on conflict(id) do nothing;
    if exists(select 1 from private.admin_invitations where email=lower(new.email)) then
      insert into private.admin_users(user_id) values(new.id) on conflict do nothing;
      delete from private.admin_invitations where email=lower(new.email);
    end if;
  end if;
  return new;
end; $$;
insert into public.player_progress(id,captain_name)
select id,'Captain ' || upper(left(replace(id::text,'-',''),8)) from auth.users where email_confirmed_at is not null;
select private.project_save(user_id,save,updated_at) from public.game_saves;

create view public.leaderboard with(security_invoker=true) as
select row_number() over(order by depth_m desc,upgrades desc,research desc,automation desc,credits desc,id) as position,
  count(*) over() as total_players,id,captain_name,depth_m,outposts,upgrades,research,automation,credits,updated_at
from public.player_progress;
revoke all on public.leaderboard from public,anon,authenticated;
grant select on public.leaderboard to authenticated;

-- Fixed allowlist: no arbitrary SQL or credential-bearing auth/session columns.
create function private.read_admin_database(table_name text,page_index integer,filter_text text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare source text; rows jsonb; total bigint; tables jsonb;
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'Administrator access required.' using errcode='42501';
  end if;
  if page_index < 0 or page_index > 100000 or char_length(filter_text) > 80 then
    raise exception 'Invalid page or search.' using errcode='22023';
  end if;
  source := case table_name
    when 'profiles' then 'select id,email,created_at from public.profiles'
    when 'game_saves' then 'select user_id,revision,updated_at,write_id,save from public.game_saves'
    when 'player_progress' then 'select * from public.player_progress'
    when 'admin_users' then 'select a.user_id,p.email from private.admin_users a join public.profiles p on p.id=a.user_id'
    when 'admin_invitations' then 'select email from private.admin_invitations'
    when 'auth_users' then 'select id,email,created_at,email_confirmed_at,last_sign_in_at,banned_until,raw_app_meta_data -> ''providers'' as providers from auth.users'
    else null end;
  if source is null then raise exception 'Unknown table.' using errcode='22023'; end if;
  execute format('select count(*) from (%s) s where position(lower($1) in lower(to_jsonb(s)::text)) > 0',source) into total using filter_text;
  execute format('select coalesce(jsonb_agg(data),''[]''::jsonb) from (select to_jsonb(s) as data from (%s) s where position(lower($1) in lower(to_jsonb(s)::text)) > 0 order by to_jsonb(s)->>''id'',to_jsonb(s)->>''user_id'',to_jsonb(s)->>''email'' limit 25 offset $2) page',source)
    into rows using filter_text,page_index * 25;
  tables := jsonb_build_object(
    'profiles',(select count(*) from public.profiles),
    'game_saves',(select count(*) from public.game_saves),
    'player_progress',(select count(*) from public.player_progress),
    'admin_users',(select count(*) from private.admin_users),
    'admin_invitations',(select count(*) from private.admin_invitations),
    'auth_users',(select count(*) from auth.users));
  return jsonb_build_object('rows',rows,'total',total,'tables',tables,'page_size',25);
end; $$;
revoke all on function private.read_admin_database(text,integer,text) from public,anon;
grant execute on function private.read_admin_database(text,integer,text) to authenticated;
create function public.admin_database(table_name text default 'profiles',page_index integer default 0,filter_text text default '') returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.read_admin_database(table_name,page_index,filter_text);
$$;
revoke all on function public.admin_database(text,integer,text) from public,anon;
grant execute on function public.admin_database(text,integer,text) to authenticated;
commit;
