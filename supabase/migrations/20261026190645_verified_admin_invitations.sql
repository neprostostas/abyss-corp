begin;
create table private.admin_invitations (
  email text primary key check (email = lower(email))
);
revoke all on private.admin_invitations from public, anon, authenticated;
create or replace function private.sync_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, email) values(new.id, coalesce(new.email, ''))
  on conflict(id) do update set email = excluded.email;
  if new.email_confirmed_at is not null and exists (
    select 1 from private.admin_invitations where email = lower(new.email)
  ) then
    insert into private.admin_users(user_id) values(new.id) on conflict do nothing;
    delete from private.admin_invitations where email = lower(new.email);
  end if;
  return new;
end; $$;
drop trigger account_profile on auth.users;
create trigger account_profile after insert or update of email, email_confirmed_at on auth.users
for each row execute function private.sync_profile();
commit;
