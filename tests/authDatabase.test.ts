import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

void test('Telegram identities provision email-less players without trusting metadata or granting admin', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users (
        id uuid primary key, email text, email_confirmed_at timestamptz,
        banned_until timestamptz, is_anonymous boolean default false,
        created_at timestamptz default now(), last_sign_in_at timestamptz,
        raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}'
      );
      create table auth.identities (
        id uuid primary key default gen_random_uuid(),
        user_id uuid references auth.users(id), provider text not null
      );
      create table auth.sessions (
        id uuid primary key, user_id uuid references auth.users(id), not_after timestamptz
      );
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as
        $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    `);
    const migrations = new URL('../supabase/migrations/', import.meta.url);
    for (const file of (await readdir(migrations))
      .filter((f) => f.endsWith('.sql'))
      .sort()) {
      await db.exec(await readFile(new URL(file, migrations), 'utf8'));
    }
    const ids = Array.from(
      { length: 6 },
      (_, i) => `00000000-0000-4000-8000-00000000000${String(i)}`,
    );
    for (const id of ids)
      await db.query('insert into auth.users(id) values($1)', [id]);
    await db.query(
      'update auth.users set raw_user_meta_data = \'{"provider":"custom:telegram"}\', raw_app_meta_data = \'{"providers":["custom:telegram"]}\' where id=$1',
      [ids[0]],
    );
    await db.query(
      "insert into auth.identities(user_id,provider) values($1,'github')",
      [ids[1]],
    );
    await db.query(
      "insert into auth.identities(user_id,provider) values($1,'custom:telegram')",
      [ids[2]],
    );
    await db.query(
      'update auth.users set email_confirmed_at=now() where id=$1',
      [ids[3]],
    );
    await db.query('update auth.users set is_anonymous=true where id=$1', [
      ids[4],
    ]);
    await db.query(
      "update auth.users set banned_until=now()+interval '1 day' where id=$1",
      [ids[5]],
    );
    for (const id of ids.slice(4))
      await db.query(
        "insert into auth.identities(user_id,provider) values($1,'custom:telegram')",
        [id],
      );
    assert.deepEqual(
      (await db.query('select id from public.player_progress order by id'))
        .rows,
      [{ id: ids[2] }, { id: ids[3] }],
    );
    assert.deepEqual(
      (await db.query('select * from private.admin_users')).rows,
      [],
    );
    await db.query('insert into private.admin_users(user_id) values($1)', [
      ids[2],
    ]);
    const session = '10000000-0000-4000-8000-000000000000';
    await db.query('insert into auth.sessions(id,user_id) values($1,$2)', [
      session,
      ids[2],
    ]);
    await db.query(
      "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",
      [ids[2], JSON.stringify({ session_id: session })],
    );
    assert.equal(
      (
        await db.query<{ allowed: boolean }>(
          'select private.is_admin() as allowed',
        )
      ).rows[0]?.allowed,
      false,
    );
    await db.query(
      'select private.project_save($1,\'{"world":{"credits":123}}\',now())',
      [ids[2]],
    );
    assert.equal(
      (
        await db.query<{ credits: number }>(
          'select credits from public.player_progress where id=$1',
          [ids[2]],
        )
      ).rows[0]?.credits,
      123,
    );
    await db.exec('set role authenticated');
    await assert.rejects(
      db.query(
        "insert into auth.identities(user_id,provider) values($1,'custom:telegram')",
        [ids[0]],
      ),
      /permission denied/,
    );
    await assert.rejects(
      db.query('select private.has_game_identity($1)', [ids[0]]),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
