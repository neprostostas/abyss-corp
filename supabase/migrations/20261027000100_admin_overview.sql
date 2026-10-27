begin;
create or replace function private.read_admin_database(table_name text,page_index integer,filter_text text) returns jsonb
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
    when 'game_saves' then 'select s.user_id,p.email,s.revision,s.updated_at,s.write_id,s.save from public.game_saves s join public.profiles p on p.id=s.user_id'
    when 'player_progress' then 'select s.*,p.email from public.player_progress s join public.profiles p on p.id=s.id'
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

create or replace function private.read_admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'Administrator access required.' using errcode='42501';
  end if;
  return jsonb_build_object(
    'updatedAt', now(),
    'totals', jsonb_build_object(
      'accounts', (select count(*) from public.profiles),
      'verified', (select count(*) from auth.users where email_confirmed_at is not null),
      'withProgress', (select count(*) from public.game_saves),
      'saved7Days', (select count(*) from public.game_saves where updated_at >= now() - interval '7 days')
    ),
    'depths', (select jsonb_agg(jsonb_build_object('depth',d.depth,'count',
      (select count(*) from public.profiles p left join public.player_progress s on s.id=p.id where coalesce(s.depth_m,0)=d.depth)) order by d.depth)
      from (values (0),(50),(180),(420)) d(depth)),
    'registrations', (select jsonb_agg(jsonb_build_object('day',to_char(d.day,'YYYY-MM-DD'),'value',
      (select count(*) from auth.users u where (u.created_at at time zone 'UTC')::date=d.day::date)) order by d.day)
      from generate_series((now() at time zone 'UTC')::date - 29,(now() at time zone 'UTC')::date,interval '1 day') d(day))
  );
end; $$;
revoke all on function private.read_admin_overview() from public,anon;
grant execute on function private.read_admin_overview() to authenticated;
create or replace function public.admin_overview() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.read_admin_overview();
$$;
revoke all on function public.admin_overview() from public,anon;
grant execute on function public.admin_overview() to authenticated;
commit;
