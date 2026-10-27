import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/infrastructure/supabase/database.types';
import {
  beginProviderSignIn,
  sessionProvider,
} from '../src/infrastructure/supabase/sessionProvider';
import { linkAccountIdentity } from '../src/infrastructure/supabase/linkAccountIdentity';
const dom = new JSDOM('', { url: 'https://abysscorp.us.ci/' });
Object.assign(globalThis, { window: dom.window });
function session(id: string, method = 'oauth') {
  return {
    access_token: `x.${Buffer.from(JSON.stringify({ session_id: id, iat: Math.floor(Date.now() / 1000), amr: [{ method }] })).toString('base64url')}.x`,
    user: {
      id: 'captain',
      app_metadata: { provider: 'google' },
      identities: [
        { provider: 'google', last_sign_in_at: '2026-10-26' },
        { provider: 'github', last_sign_in_at: '2026-10-27' },
      ],
    },
  } as unknown as Session;
}
void test('current login survives identity linking and token refresh; another email session has its own badge', () => {
  dom.window.localStorage.clear();
  dom.window.sessionStorage.clear();
  beginProviderSignIn('custom:telegram');
  const current = session('first');
  assert.equal(sessionProvider(current), 'custom:telegram');
  assert.equal(
    sessionProvider({
      ...current,
      user: {
        ...current.user,
        identities: [
          { provider: 'discord', last_sign_in_at: '2026-10-28' },
        ] as NonNullable<Session['user']['identities']>,
      },
    }),
    'custom:telegram',
  );
  assert.equal(sessionProvider(session('second', 'password')), 'email');
  assert.equal(
    dom.window.sessionStorage.getItem('abyss-corp.pending-provider'),
    null,
  );
});
void test('stale pending login and corrupt storage do not mislabel a new session', () => {
  dom.window.localStorage.clear();
  dom.window.sessionStorage.clear();
  dom.window.sessionStorage.setItem(
    'abyss-corp.pending-provider',
    JSON.stringify({ provider: 'twitch', time: Date.now() - 700000 }),
  );
  assert.equal(sessionProvider(session('third')), 'github');
  dom.window.localStorage.setItem('abyss-corp.session-provider', 'broken');
  assert.equal(sessionProvider(session('fourth')), 'github');
});
void test('linking saves first, uses linkIdentity with the primary callback, and never starts another sign-in', async () => {
  const calls: unknown[] = [];
  const client = {
    auth: {
      linkIdentity: (options: unknown) => {
        calls.push(options);
        return Promise.resolve({ error: null });
      },
      signInWithOAuth: () => assert.fail('Must link, not sign in'),
    },
  } as unknown as SupabaseClient<Database>;
  await linkAccountIdentity(client, 'discord', () => {
    calls.push('saved');
    return Promise.resolve();
  });
  assert.deepEqual(calls, [
    'saved',
    {
      provider: 'discord',
      options: {
        redirectTo: 'https://abysscorp.us.ci/',
        scopes: 'identify email',
      },
    },
  ]);
  calls.length = 0;
  await assert.rejects(
    linkAccountIdentity(client, 'google', () =>
      Promise.reject(new Error('Cloud unavailable')),
    ),
    /Cloud unavailable/,
  );
  assert.equal(calls.length, 0);
});
