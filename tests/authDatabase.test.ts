import { completedWorld } from './fixtures';
import { prestigeWorld } from '../src/domain/world';
import { gameSave } from './fixtures';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

void test('Telegram and Steam identities provision email-less players without trusting metadata or granting admin', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      grant usage on schema auth to authenticated;
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      grant usage on schema storage to authenticated,anon;
      grant select,insert,delete on storage.objects to authenticated;
      grant select on storage.objects to anon;
      create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
      create table auth.users (
        id uuid primary key, email text, email_confirmed_at timestamptz,
        banned_until timestamptz, is_anonymous boolean default false,
        created_at timestamptz default now(), last_sign_in_at timestamptz,
        raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}'
      );
      create table auth.identities (
        id uuid primary key default gen_random_uuid(),
        user_id uuid references auth.users(id) on delete cascade, provider text not null
      );
      create table auth.sessions (
        id uuid primary key, user_id uuid references auth.users(id) on delete cascade, not_after timestamptz
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
      { length: 7 },
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
    for (const id of ids.slice(4, 6))
      await db.query(
        "insert into auth.identities(user_id,provider) values($1,'custom:telegram')",
        [id],
      );
    await db.query(
      "insert into auth.identities(user_id,provider) values($1,'custom:steam')",
      [ids[6]],
    );
    assert.deepEqual(
      (await db.query('select id from public.player_progress order by id'))
        .rows,
      [{ id: ids[2] }, { id: ids[3] }, { id: ids[6] }],
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
    const owner = ids[2];
    const other = ids[6];
    assert(owner && other);
    await db.exec('set role authenticated');
    await db.query(
      "insert into storage.objects(bucket_id,name) values('avatars',$1)",
      [`${owner}/photo.webp`],
    );
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values('avatars',$1)",
        [`${other}/photo.webp`],
      ),
      /row-level security/,
    );
    await db.query('delete from storage.objects where name=$1', [
      `${owner}/photo.webp`,
    ]);
    const payload = JSON.stringify(gameSave());
    const operation = '20000000-0000-4000-8000-000000000001';
    const reset = await db.query<{ epoch: number; revision: number }>(
      'select * from public.reset_game_save($1,$2,$3)',
      [ids[2], payload, operation],
    );
    assert.equal(reset.rows[0]?.epoch, 1);
    assert.equal(reset.rows[0].revision, 1);
    const replay = await db.query<{ epoch: number }>(
      'select * from public.reset_game_save($1,$2,$3)',
      [ids[2], payload, operation],
    );
    assert.equal(replay.rows[0]?.epoch, 1);
    await assert.rejects(
      db.query('select * from public.reset_game_save($1,$2,$3)', [
        ids[6],
        payload,
        operation,
      ]),
      /Sign in again/,
    );
    await assert.rejects(
      db.query('select * from public.write_game_save($1,1,$2,$3)', [
        ids[2],
        payload,
        '20000000-0000-4000-8000-000000000002',
      ]),
      /Progress changed/,
    );
    const write = await db.query<{ revision: number }>(
      'select * from public.write_game_save($1,1,$2,$3,1)',
      [ids[2], payload, '20000000-0000-4000-8000-000000000003'],
    );
    assert.equal(write.rows[0]?.revision, 2);
    const prestigeOperation = '20000000-0000-4000-8000-000000000004';
    const newRun = JSON.stringify({
      ...gameSave(),
      world: {
        ...gameSave().world,
        campaign: {
          rank: 1,
          infrastructure: { depot: 0, exchange: 0, sonar: 0 },
        },
      },
    });
    await assert.rejects(
      db.query('select * from public.prestige_game_save($1,$2,$3,1,2,0)', [
        owner,
        newRun,
        prestigeOperation,
      ]),
      /requirements/,
    );
    const established = { ...gameSave(30000), world: completedWorld() };
    await db.query('select * from public.write_game_save($1,2,$2,$3,1)', [
      owner,
      JSON.stringify(established),
      '20000000-0000-4000-8000-000000000005',
    ]);
    const resetPayload = JSON.stringify({
      ...established,
      world: prestigeWorld(established.world),
    });
    await db.exec('reset role');
    const secondRun = {
      ...established,
      world: {
        ...established.world,
        credits: 39999,
        campaign: { ...established.world.campaign, rank: 1 },
      },
    };
    await db.query(
      'update public.game_saves set save=$1::jsonb where user_id=$2',
      [JSON.stringify(secondRun), owner],
    );
    await db.exec('set role authenticated');
    const secondReset = JSON.stringify({
      ...established,
      world: prestigeWorld({ ...secondRun.world, credits: 40000 }),
    });
    await assert.rejects(
      db.query('select * from public.prestige_game_save($1,$2,$3,1,3,1)', [
        owner,
        secondReset,
        prestigeOperation,
      ]),
      /requirements/,
    );
    // Server rejects each incomplete category even when depth and credits qualify.
    for (const [path, value] of [
      [['world', 'layers', 'shallows', 'levels', 'mining'], '4'],
      [['world', 'layers', 'shallows', 'automation', 'level'], '2'],
      [['world', 'layers', 'shallows', 'specialists', 'broker'], '2'],
      [['world', 'progression', 'research', 'engineering'], '4'],
      [['world', 'campaign', 'infrastructure', 'sonar'], '2'],
      [['world', 'progression', 'claimedMissions'], '[]'],
      [['world', 'progression', 'expedition', 'completed'], '2'],
    ] as const) {
      await db.exec('reset role');
      await db.query(
        'update public.game_saves set save=jsonb_set($1::jsonb,$2::text[],$3::jsonb) where user_id=$4',
        [JSON.stringify(established), [...path], value, owner],
      );
      await db.exec('set role authenticated');
      await assert.rejects(
        db.query('select * from public.prestige_game_save($1,$2,$3,1,3,0)', [
          owner,
          resetPayload,
          prestigeOperation,
        ]),
        /before prestige/,
      );
    }
    await db.exec('reset role');
    await db.query(
      'update public.game_saves set save=$1::jsonb where user_id=$2',
      [JSON.stringify(established), owner],
    );
    await db.exec('set role authenticated');
    await assert.rejects(
      db.query('select * from public.prestige_game_save($1,$2,$3,1,2,0)', [
        owner,
        resetPayload,
        prestigeOperation,
      ]),
      /Progress changed/,
    );
    await assert.rejects(
      db.query('select * from public.prestige_game_save($1,$2,$3,1,3,0)', [
        other,
        resetPayload,
        prestigeOperation,
      ]),
      /Sign in again/,
    );
    const prestige = await db.query<{ epoch: number; revision: number }>(
      'select * from public.prestige_game_save($1,$2,$3,1,3,0)',
      [owner, resetPayload, prestigeOperation],
    );
    assert.equal(prestige.rows[0]?.epoch, 2);
    assert.equal(prestige.rows[0].revision, 4);
    const prestigeReplay = await db.query<{ epoch: number }>(
      'select * from public.prestige_game_save($1,$2,$3,1,3,0)',
      [owner, resetPayload, prestigeOperation],
    );
    assert.equal(prestigeReplay.rows[0]?.epoch, 2);
    const ranking = await db.query<{ prestige: number; depth_m: number }>(
      'select prestige,depth_m from public.leaderboard where id=$1',
      [owner],
    );
    assert.equal(ranking.rows[0]?.prestige, 1);
    assert.equal(ranking.rows[0].depth_m, 50);
    await assert.rejects(
      db.query('select * from public.prestige_game_save($1,$2,$3,1,3,0)', [
        owner,
        resetPayload,
        '20000000-0000-4000-8000-000000000006',
      ]),
      /Progress changed/,
    );
    await assert.rejects(
      db.query('select * from public.write_game_save($1,3,$2,$3,1)', [
        owner,
        JSON.stringify(established),
        '20000000-0000-4000-8000-000000000007',
      ]),
      /Progress changed/,
    );

    await db.exec('reset role');
    await db.query('delete from auth.sessions where id=$1', [session]);
    await db.exec('set role authenticated');
    await assert.rejects(
      db.query('select * from public.reset_game_save($1,$2,$3)', [
        ids[2],
        payload,
        '20000000-0000-4000-8000-000000000004',
      ]),
      /Sign in again/,
    );

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
    await db.exec('reset role');
    await db.query('select private.project_save($1,$2,now())', [
      ids[2],
      JSON.stringify({
        ...gameSave(),
        world: {
          ...gameSave().world,
          progression: {
            research: { trade: 5, storage: 5, engineering: 5, surveying: 5 },
          },
        },
      }),
    ]);
    assert.equal(
      (
        await db.query<{ research: number }>(
          'select research from public.player_progress where id=$1',
          [ids[2]],
        )
      ).rows[0]?.research,
      20,
    );
    await db.query('delete from auth.users where id=$1', [ids[2]]);
    for (const table of ['profiles', 'game_saves', 'player_progress']) {
      const column = table === 'game_saves' ? 'user_id' : 'id';
      assert.equal(
        (
          await db.query(`select * from public.${table} where ${column}=$1`, [
            ids[2],
          ])
        ).rows.length,
        0,
      );
    }
  } finally {
    await db.close();
  }
});
