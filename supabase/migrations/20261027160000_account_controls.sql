begin;
alter table public.game_saves add column epoch integer not null default 0 check(epoch >= 0);

-- A reset advances the epoch. Old clients default to epoch zero and cannot
-- restore pre-reset expeditions, even after fetching a newer revision.
drop function public.write_game_save(uuid,bigint,jsonb,uuid);
create function public.write_game_save(account_id uuid, expected_revision bigint, payload jsonb, operation_id uuid, expected_epoch integer default 0)
returns setof public.game_saves language plpgsql security invoker set search_path = '' as $$
declare result public.game_saves;
begin
  if auth.uid() is null or account_id is distinct from auth.uid() then
    raise exception 'Account changed. Sign in again.' using errcode='42501';
  end if;
  if expected_revision is null or expected_revision < 0 or expected_revision >= 9007199254740991 or operation_id is null or expected_epoch is null or expected_epoch < 0 then
    raise exception 'Invalid save operation.' using errcode='22023';
  end if;
  select * into result from public.game_saves where user_id=account_id and write_id=operation_id and epoch=expected_epoch;
  if result.user_id is not null then return next result; return; end if;
  if expected_revision=0 and expected_epoch=0 then
    insert into public.game_saves(user_id,revision,save,write_id)
    values(account_id,1,payload,operation_id) on conflict(user_id) do nothing returning * into result;
  else
    update public.game_saves set revision=expected_revision+1, updated_at=now(), save=payload, write_id=operation_id
    where user_id=account_id and revision=expected_revision and epoch=expected_epoch returning * into result;
  end if;
  if result.user_id is null then raise exception 'Progress changed on another device.' using errcode='PT409'; end if;
  return next result;
end; $$;
revoke all on function public.write_game_save(uuid,bigint,jsonb,uuid,integer) from public,anon;
grant execute on function public.write_game_save(uuid,bigint,jsonb,uuid,integer) to authenticated;

create function private.active_game_session() returns boolean language sql stable security definer set search_path='' as $$
  select private.has_game_identity(auth.uid()) and exists(
    select 1 from auth.sessions s where s.user_id=auth.uid()
    and s.id::text=auth.jwt()->>'session_id' and (s.not_after is null or s.not_after>now())
  );
$$;
revoke all on function private.active_game_session() from public,anon;
grant execute on function private.active_game_session() to authenticated;
create function public.has_active_game_session() returns boolean language sql stable security invoker set search_path='' as $$
  select private.active_game_session();
$$;
revoke all on function public.has_active_game_session() from public,anon;
grant execute on function public.has_active_game_session() to authenticated;

create function public.reset_game_save(account_id uuid,payload jsonb,operation_id uuid)
returns setof public.game_saves language plpgsql security invoker set search_path='' as $$
declare result public.game_saves;
begin
  if account_id is distinct from auth.uid() or not private.active_game_session() then
    raise exception 'Sign in again before resetting progress.' using errcode='42501';
  end if;
  if operation_id is null then raise exception 'Missing reset operation.' using errcode='22023'; end if;
  select * into result from public.game_saves where user_id=account_id and write_id=operation_id;
  if result.user_id is not null then return next result; return; end if;
  insert into public.game_saves(user_id,revision,epoch,save,write_id)
  values(account_id,1,1,payload,operation_id)
  on conflict(user_id) do update set revision=public.game_saves.revision+1,epoch=public.game_saves.epoch+1,
    save=excluded.save,write_id=excluded.write_id,updated_at=now()
  where public.game_saves.write_id is distinct from excluded.write_id
  returning * into result;
  if result.user_id is null then
    select * into result from public.game_saves where user_id=account_id and write_id=operation_id;
  end if;
  return next result;
end; $$;
revoke all on function public.reset_game_save(uuid,jsonb,uuid) from public,anon;
grant execute on function public.reset_game_save(uuid,jsonb,uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',true,2097152,array['image/webp','image/jpeg','image/png']);
create policy avatar_public_read on storage.objects for select to anon,authenticated using(bucket_id='avatars');
create policy avatar_owner_insert on storage.objects for insert to authenticated with check(
  bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text and (select private.active_game_session())
);
create policy avatar_owner_delete on storage.objects for delete to authenticated using(
  bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text and (select private.active_game_session())
);
commit;
