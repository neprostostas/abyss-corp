begin;
create policy deny_direct_admin_access on private.admin_users for all to authenticated using (false) with check (false);
create policy deny_direct_invitation_access on private.admin_invitations for all to authenticated using (false) with check (false);
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from private.admin_users a
    join auth.users u on u.id=a.user_id
    join auth.sessions s on s.user_id=u.id
    where a.user_id=(select auth.uid())
      and s.id::text=((select auth.jwt())->>'session_id')
      and (s.not_after is null or s.not_after>now())
      and u.email_confirmed_at is not null
      and (u.banned_until is null or u.banned_until<=now())
  );
$$;
commit;
