begin;
-- Four research paths, five levels each. Missing optional paths count as zero.
alter table public.player_progress drop constraint player_progress_research_check;
alter table public.player_progress add constraint player_progress_research_check check (research between 0 and 20);

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
    private.progress_number(payload #> '{world,progression,research,trade}',5)::integer + private.progress_number(payload #> '{world,progression,research,storage}',5)::integer +
    private.progress_number(payload #> '{world,progression,research,engineering}',5)::integer + private.progress_number(payload #> '{world,progression,research,surveying}',5)::integer,
    automation,private.progress_number(payload #> '{world,credits}',9007199254740991),saved_time,private.progress_number(payload #> '{world,campaign,rank}',25)::integer
  where private.has_game_identity(account_id)
  on conflict(id) do update set depth_m=excluded.depth_m,outposts=excluded.outposts,upgrades=excluded.upgrades,
    research=excluded.research,automation=excluded.automation,credits=excluded.credits,updated_at=excluded.updated_at,prestige=excluded.prestige;
end; $$;
revoke all on function private.project_save(uuid,jsonb,timestamptz) from public, anon, authenticated;

select private.project_save(user_id, save, updated_at) from public.game_saves;
commit;
