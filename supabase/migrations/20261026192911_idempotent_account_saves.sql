begin;
alter table public.game_saves add column write_id uuid not null default gen_random_uuid();
drop function public.write_game_save(uuid, bigint, jsonb);
create function public.write_game_save(account_id uuid, expected_revision bigint, payload jsonb, operation_id uuid)
returns setof public.game_saves
language plpgsql security invoker set search_path = '' as $$
declare result public.game_saves;
begin
  if auth.uid() is null or account_id is distinct from auth.uid() then
    raise exception 'Account changed. Sign in again.' using errcode = '42501';
  end if;
  if expected_revision < 0 or expected_revision >= 9007199254740991 or operation_id is null then
    raise exception 'Invalid save operation.' using errcode = '22023';
  end if;
  -- A retry after a lost response acknowledges the same write without replaying it.
  select * into result from public.game_saves where user_id = account_id and write_id = operation_id;
  if result.user_id is not null then
    return next result;
    return;
  end if;
  if expected_revision = 0 then
    insert into public.game_saves(user_id, revision, save, write_id)
    values(account_id, 1, payload, operation_id) on conflict(user_id) do nothing returning * into result;
  else
    update public.game_saves set revision = expected_revision + 1, updated_at = now(), save = payload, write_id = operation_id
    where user_id = account_id and revision = expected_revision returning * into result;
  end if;
  if result.user_id is null then
    raise exception 'Progress changed on another device.' using errcode = '40001';
  end if;
  return next result;
end; $$;
revoke all on function public.write_game_save(uuid, bigint, jsonb, uuid) from public, anon;
grant execute on function public.write_game_save(uuid, bigint, jsonb, uuid) to authenticated;
commit;
