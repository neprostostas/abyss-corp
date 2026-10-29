begin;
create or replace function public.prestige_game_save(account_id uuid,payload jsonb,operation_id uuid,expected_epoch integer,expected_revision bigint,expected_rank integer)
returns setof public.game_saves language plpgsql security invoker set search_path='' as $$
declare current_save public.game_saves; layer_id text; item_id text;
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
  foreach layer_id in array array['shallows','golden-trench','pearl-caverns','thermal-vents','midnight-rift'] loop
    foreach item_id in array array['mining','transport','processing','storage'] loop
      if coalesce(current_save.save #>> array['world','layers',layer_id,'levels',item_id], '') <> '5' then
        raise exception 'Max all production upgrades before prestige.' using errcode='22023';
      end if;
    end loop;
    if coalesce(current_save.save #>> array['world','layers',layer_id,'automation','level'], '') <> '3' then
      raise exception 'Max all cargo pilots before prestige.' using errcode='22023';
    end if;
    foreach item_id in array array['quartermaster','broker'] loop
      if coalesce(current_save.save #>> array['world','layers',layer_id,'specialists',item_id], '') <> '3' then
        raise exception 'Max all specialists before prestige.' using errcode='22023';
      end if;
    end loop;
  end loop;
  foreach item_id in array array['trade','storage','engineering','surveying'] loop
    if coalesce(current_save.save #>> array['world','progression','research',item_id], '') <> '5' then
      raise exception 'Complete all research before prestige.' using errcode='22023';
    end if;
  end loop;
  foreach item_id in array array['depot','exchange','sonar'] loop
    if coalesce(current_save.save #>> array['world','campaign','infrastructure',item_id], '') <> '3' then
      raise exception 'Complete the network before prestige.' using errcode='22023';
    end if;
  end loop;
  if not coalesce((current_save.save #> '{world,progression,claimedMissions}') @> '["improve","automate","expand","discover","explore","network","research"]'::jsonb, false)
    or coalesce(current_save.save #>> '{world,progression,expedition,completed}', '') <> '3' then
    raise exception 'Claim all missions and expeditions before prestige.' using errcode='22023';
  end if;
  return query select * from public.reset_game_save(account_id,payload,operation_id);
end; $$;
revoke all on function public.prestige_game_save(uuid,jsonb,uuid,integer,bigint,integer) from public,anon;
grant execute on function public.prestige_game_save(uuid,jsonb,uuid,integer,bigint,integer) to authenticated;
commit;
