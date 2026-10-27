import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import {
  createSteamHandler,
  STEAM_CLIENT_ID,
  STEAM_ENDPOINT,
  SUPABASE_CALLBACK,
} from '../netlify/lib/steamOAuth';
import type { SteamStore } from '../netlify/lib/steamOAuth';
const secret = 'test-only-client-secret-with-32-characters';
const steamId = '76561198000000000';
class MemoryStore implements SteamStore {
  rows = new Map<string, { data: unknown; etag: string }>();
  counter = 0;
  get(key: string) {
    return Promise.resolve(this.rows.get(key) ?? null);
  }
  put(
    key: string,
    data: unknown,
    condition: { onlyIfNew: true } | { onlyIfMatch: string },
  ) {
    const old = this.rows.get(key);
    if (
      ('onlyIfNew' in condition && old) ||
      ('onlyIfMatch' in condition && old?.etag !== condition.onlyIfMatch)
    )
      return Promise.resolve({ modified: false });
    this.rows.set(key, { data, etag: (++this.counter).toString() });
    return Promise.resolve({ modified: true });
  }
}
function fixture(valid = true) {
  let time = Date.parse('2026-10-27T19:00:00Z');
  const store = new MemoryStore();
  const requests: string[] = [];
  const http: typeof fetch = (input) => {
    const url = input instanceof Request ? input.url : input.toString();
    requests.push(url);
    return Promise.resolve(
      url.endsWith('/openid/login')
        ? new Response(
            `ns:http://specs.openid.net/auth/2.0\nis_valid:${valid ? 'true' : 'false'}\n`,
          )
        : new Response(
            `<profile><steamID64>${steamId}</steamID64><steamID><![CDATA[Steam captain]]></steamID><avatarFull><![CDATA[https://avatars.steamstatic.com/profile.jpg]]></avatarFull></profile>`,
          ),
    );
  };
  return {
    store,
    requests,
    handler: createSteamHandler({
      store,
      secret,
      fetch: http,
      now: () => time,
    }),
    advance: (ms: number) => {
      time += ms;
    },
  };
}
async function start(f: ReturnType<typeof fixture>) {
  const url = new URL(STEAM_ENDPOINT);
  url.search = new URLSearchParams({
    step: 'authorize',
    client_id: STEAM_CLIENT_ID,
    redirect_uri: SUPABASE_CALLBACK,
    response_type: 'code',
    state: 'supabase-state',
    code_challenge: createHash('sha256').update('verifier').digest('base64url'),
    code_challenge_method: 'S256',
  }).toString();
  const response = await f.handler(new Request(url));
  assert.equal(response.status, 302);
  const steam = new URL(response.headers.get('location') ?? '');
  assert.equal(steam.origin, 'https://steamcommunity.com');
  const callback = new URL(steam.searchParams.get('openid.return_to') ?? '');
  const assertion = {
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'id_res',
    'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
    'openid.claimed_id': `https://steamcommunity.com/openid/id/${steamId}`,
    'openid.identity': `https://steamcommunity.com/openid/id/${steamId}`,
    'openid.return_to': callback.href,
    'openid.response_nonce': '2026-10-27T19:00:00Zunique',
    'openid.signed': 'op_endpoint,claimed_id,identity,return_to,response_nonce',
    'openid.sig': 'test-signature',
  };
  for (const [key, value] of Object.entries(assertion))
    callback.searchParams.set(key, value);
  return {
    callback,
    cookie: response.headers.get('set-cookie')?.split(';')[0] ?? '',
  };
}
async function exchange(
  f: ReturnType<typeof fixture>,
  code: string,
  verifier = 'verifier',
) {
  return f.handler(
    new Request(`${STEAM_ENDPOINT}?step=token`, {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${STEAM_CLIENT_ID}:${secret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        redirect_uri: SUPABASE_CALLBACK,
        code,
        code_verifier: verifier,
      }),
    }),
  );
}
void test('Steam server proof produces a one-time PKCE code and short-lived userinfo token without inventing email', async () => {
  const f = fixture();
  const flow = await start(f);
  const result = await f.handler(
    new Request(flow.callback, { headers: { cookie: flow.cookie } }),
  );
  assert.equal(result.status, 302);
  const redirect = new URL(result.headers.get('location') ?? '');
  assert.equal(redirect.origin, 'https://qduhqhhhsboljuipruvy.supabase.co');
  assert.equal(redirect.searchParams.get('state'), 'supabase-state');
  const code = redirect.searchParams.get('code') ?? '';
  assert.equal((await exchange(f, code, 'wrong')).status, 400);
  const attempts = await Promise.all([exchange(f, code), exchange(f, code)]);
  assert.deepEqual(attempts.map((r) => r.status).sort(), [200, 400]);
  const issued = attempts.find((r) => r.status === 200);
  assert(issued);
  const token = (await issued.json()) as { access_token: string };
  const info = await f.handler(
    new Request(`${STEAM_ENDPOINT}?step=userinfo`, {
      headers: { authorization: `Bearer ${token.access_token}` },
    }),
  );
  assert.deepEqual(await info.json(), {
    sub: steamId,
    name: 'Steam captain',
    picture: 'https://avatars.steamstatic.com/profile.jpg',
  });
  assert.equal(
    (
      await f.handler(
        new Request(flow.callback, { headers: { cookie: flow.cookie } }),
      )
    ).status,
    400,
  );
  f.advance(121000);
  assert.equal(
    (
      await f.handler(
        new Request(`${STEAM_ENDPOINT}?step=userinfo`, {
          headers: { authorization: `Bearer ${token.access_token}` },
        }),
      )
    ).status,
    401,
  );
});
void test('forged endpoints, missing browser proof, tampered return URLs and invalid Steam signatures never issue codes', async () => {
  const f = fixture();
  const flow = await start(f);
  assert.equal((await f.handler(new Request(flow.callback))).status, 400);
  assert.equal(f.requests.length, 0);
  flow.callback.searchParams.set(
    'openid.op_endpoint',
    'https://attacker.example/verify',
  );
  assert.equal(
    (
      await f.handler(
        new Request(flow.callback, { headers: { cookie: flow.cookie } }),
      )
    ).status,
    400,
  );
  assert.equal(f.requests.length, 0);
  const invalid = fixture(false);
  const invalidFlow = await start(invalid);
  assert.equal(
    (
      await invalid.handler(
        new Request(invalidFlow.callback, {
          headers: { cookie: invalidFlow.cookie },
        }),
      )
    ).status,
    400,
  );
  assert.equal(invalid.requests.length, 1);
  const tampered = fixture();
  const altered = await start(tampered);
  altered.callback.searchParams.set(
    'openid.return_to',
    'https://attacker.example/',
  );
  assert.equal(
    (
      await tampered.handler(
        new Request(altered.callback, { headers: { cookie: altered.cookie } }),
      )
    ).status,
    400,
  );
});
void test('unconfigured bridge, arbitrary redirects, stale flows and unauthenticated token calls fail closed', async () => {
  const f = fixture();
  assert.equal(
    (
      await createSteamHandler({ store: f.store, secret: '' })(
        new Request(`${STEAM_ENDPOINT}?step=authorize`),
      )
    ).status,
    503,
  );
  const url = new URL(STEAM_ENDPOINT);
  url.search = new URLSearchParams({
    step: 'authorize',
    client_id: STEAM_CLIENT_ID,
    redirect_uri: 'https://attacker.example/',
    response_type: 'code',
    state: 'state',
  }).toString();
  assert.equal((await f.handler(new Request(url))).status, 400);
  const flow = await start(f);
  f.advance(601000);
  assert.equal(
    (
      await f.handler(
        new Request(flow.callback, { headers: { cookie: flow.cookie } }),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await f.handler(
        new Request(`${STEAM_ENDPOINT}?step=token`, {
          method: 'POST',
          body: new URLSearchParams({ grant_type: 'authorization_code' }),
        }),
      )
    ).status,
    401,
  );
});
