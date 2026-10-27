begin;
-- Accept existing v6 clients during deployment and validate the new v7 envelope.
alter table public.game_saves drop constraint game_saves_save_check;
alter table public.game_saves add constraint game_saves_save_check check (
  save ?& array['version','savedAt','world'] and
  jsonb_typeof(save) = 'object' and
  (
    save @> '{"version":6}'::jsonb or
    (
      save @> '{"version":7}'::jsonb and
      jsonb_typeof(save #> '{world,progression}') = 'object' and
      (save #> '{world,progression}') ? 'expedition' and
      jsonb_typeof(save #> '{world,progression,expedition}') = 'object' and
      (save #> '{world,progression,expedition}') ?& array['completed','active','delivered']
    )
  ) and
  jsonb_typeof(save -> 'savedAt') = 'number' and
  jsonb_typeof(save -> 'world') = 'object' and
  (save -> 'world') ?& array['credits','selectedLayerId','layers','progression'] and
  (save #> '{world,layers}') ? 'shallows' and
  jsonb_typeof(save #> '{world,layers,shallows}') = 'object' and
  octet_length(save::text) <= 131072
);
commit;
