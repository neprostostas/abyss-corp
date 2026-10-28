begin;
-- Rolling deployment: previous clients remain readable until they encounter a new-format save.
alter table public.game_saves drop constraint game_saves_save_check;
alter table public.game_saves add constraint game_saves_save_check check (coalesce((
  save ?& array['version','savedAt','world'] and
  jsonb_typeof(save) = 'object' and
  (
    save @> '{"version":6}'::jsonb or
    (
      (save @> '{"version":7}'::jsonb or save @> '{"version":8}'::jsonb) and
      jsonb_typeof(save #> '{world,progression}') = 'object' and
      (save #> '{world,progression}') ? 'expedition' and
      jsonb_typeof(save #> '{world,progression,expedition}') = 'object' and
      (save #> '{world,progression,expedition}') ?& array['completed','active','delivered']
    )
  ) and
  (save ->> 'version' <> '8' or (
    jsonb_typeof(save #> '{world,campaign}') = 'object' and
    (save #> '{world,campaign}') ?& array['rank','infrastructure']
  )) and
  jsonb_typeof(save -> 'savedAt') = 'number' and
  jsonb_typeof(save -> 'world') = 'object' and
  (save -> 'world') ?& array['credits','selectedLayerId','layers','progression'] and
  (save #> '{world,layers}') ? 'shallows' and
  jsonb_typeof(save #> '{world,layers,shallows}') = 'object' and
  octet_length(save::text) <= 131072
),false));

alter table public.player_progress drop constraint player_progress_depth_m_check;
alter table public.player_progress add constraint player_progress_depth_m_check check(depth_m in (0,50,180,420,900,1900));
alter table public.player_progress drop constraint player_progress_outposts_check;
alter table public.player_progress add constraint player_progress_outposts_check check(outposts between 0 and 5);
alter table public.player_progress drop constraint player_progress_upgrades_check;
alter table public.player_progress add constraint player_progress_upgrades_check check(upgrades between 0 and 80);
alter table public.player_progress drop constraint player_progress_automation_check;
alter table public.player_progress add constraint player_progress_automation_check check(automation between 0 and 15);
alter table public.player_progress add column prestige integer not null default 0 check(prestige between 0 and 25);
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
  foreach layer_id in array array['shallows','golden-trench','pearl-caverns','thermal-vents','midnight-rift'] loop
    layer := layers -> layer_id;
    if jsonb_typeof(layer) = 'object' then
      outposts := outposts + 1;
      depth := case layer_id when 'shallows' then 50 when 'golden-trench' then 180 when 'pearl-caverns' then 420 when 'thermal-vents' then 900 else 1900 end;
      foreach system_id in array array['mining','transport','processing','storage'] loop
        upgrades := upgrades + greatest(0,private.progress_number(layer #> array['levels',system_id],5)::integer - 1);
      end loop;
      automation := automation + private.progress_number(layer #> '{automation,level}',3)::integer;
    end if;
  end loop;
  insert into public.player_progress(id,captain_name,depth_m,outposts,upgrades,research,automation,credits,updated_at,prestige)
  select account_id,'Captain ' || upper(left(replace(account_id::text,'-',''),8)),depth,outposts,upgrades,
    private.progress_number(payload #> '{world,progression,research,trade}',3)::integer + private.progress_number(payload #> '{world,progression,research,storage}',3)::integer,
    automation,private.progress_number(payload #> '{world,credits}',9007199254740991),saved_time,private.progress_number(payload #> '{world,campaign,rank}',25)::integer
  where private.has_game_identity(account_id)
  on conflict(id) do update set depth_m=excluded.depth_m,outposts=excluded.outposts,upgrades=excluded.upgrades,
    research=excluded.research,automation=excluded.automation,credits=excluded.credits,updated_at=excluded.updated_at,prestige=excluded.prestige;
end; $$;
revoke all on function private.project_save(uuid,jsonb,timestamptz) from public, anon, authenticated;


create or replace view public.leaderboard with(security_invoker=true) as
select row_number() over(order by prestige desc,depth_m desc,upgrades desc,research desc,automation desc,credits desc,id) as position,
  count(*) over() as total_players,id,captain_name,depth_m,outposts,upgrades,research,automation,credits,updated_at,prestige
from public.player_progress;
drop index public.player_progress_ranking;
create index player_progress_ranking on public.player_progress(prestige desc,depth_m desc,upgrades desc,research desc,automation desc,credits desc,id);

-- Optimistic revision checks and row locking stop simultaneous devices from prestiging a stale run.
create function public.prestige_game_save(account_id uuid,payload jsonb,operation_id uuid,expected_epoch integer,expected_revision bigint,expected_rank integer)
returns setof public.game_saves language plpgsql security invoker set search_path='' as $$
declare current_save public.game_saves;
begin
  if account_id is distinct from auth.uid() or not private.active_game_session() then
    raise exception 'Sign in again before starting a new run.' using errcode='42501';
  end if;
  if operation_id is null or expected_rank is null or expected_rank < 0 or expected_rank >= 25 then
    raise exception 'Invalid prestige operation.' using errcode='22023';
  end if;
  select * into current_save from public.game_saves where user_id=account_id for update;
  if current_save.write_id = operation_id then return next current_save; return; end if;
  if current_save.user_id is null or current_save.epoch is distinct from expected_epoch or current_save.revision is distinct from expected_revision
    or coalesce((current_save.save #>> '{world,campaign,rank}')::integer,0) <> expected_rank then
    raise exception 'Progress changed on another device. Sync and review the new run.' using errcode='PT409';
  end if;
  if jsonb_typeof(current_save.save #> '{world,layers,midnight-rift}') is distinct from 'object'
    or coalesce((current_save.save #>> '{world,credits}')::numeric,0) < 25000
    or (payload #>> '{world,campaign,rank}')::integer is distinct from expected_rank + 1
    or payload ->> 'version' is distinct from '8' then
    raise exception 'Prestige requirements are not met.' using errcode='22023';
  end if;
  return query select * from public.reset_game_save(account_id,payload,operation_id);
end; $$;
revoke all on function public.prestige_game_save(uuid,jsonb,uuid,integer,bigint,integer) from public,anon;
grant execute on function public.prestige_game_save(uuid,jsonb,uuid,integer,bigint,integer) to authenticated;
commit;
