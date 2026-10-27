import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const STEAM_CLIENT_ID = 'abyss-corp-steam';
export const STEAM_ORIGIN = 'https://abysscorp.us.ci';
export const STEAM_ENDPOINT = `${STEAM_ORIGIN}/.netlify/functions/steam-auth`;
export const SUPABASE_CALLBACK =
  'https://qduhqhhhsboljuipruvy.supabase.co/auth/v1/callback';
const steamLogin = 'https://steamcommunity.com/openid/login';
const namespace = 'http://specs.openid.net/auth/2.0';
const cookieName = '__Host-abyss-steam';
const headers = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};
const flowSchema = z.object({
  state: z.string(),
  challenge: z.string(),
  proof: z.string(),
  used: z.boolean(),
});
const profileSchema = z.object({
  sub: z.string().regex(/^\d{17}$/),
  name: z.string(),
  picture: z.string().optional(),
});
const codeSchema = z.object({
  profile: profileSchema,
  challenge: z.string(),
  used: z.boolean(),
});
export interface SteamStore {
  get(key: string): Promise<{ data: unknown; etag: string } | null>;
  put(
    key: string,
    data: unknown,
    condition: { onlyIfNew: true } | { onlyIfMatch: string },
  ): Promise<{ modified: boolean }>;
}
interface Dependencies {
  store: SteamStore;
  secret: string;
  fetch?: typeof fetch;
  now?: () => number;
}
const hash = (value: string) =>
  createHash('sha256').update(value).digest('base64url');
function equal(a: string, b: string) {
  return timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
function redirect(url: string, cookie?: string) {
  return new Response(null, {
    status: 302,
    headers: {
      ...headers,
      Location: url,
      ...(cookie ? { 'Set-Cookie': cookie } : {}),
    },
  });
}
function handle(expiry: number) {
  return `${expiry.toString()}.${randomBytes(32).toString('base64url')}`;
}
function recordKey(kind: string, value: string, now: number): string | null {
  if (!/^\d{10}\.[\w-]{43}$/.test(value)) return null;
  const expiry = Number(value.split('.')[0]);
  return expiry > now && expiry <= now + 601
    ? `${kind}/${expiry.toString()}/${hash(value)}`
    : null;
}
function callbackFor(flow: string) {
  const url = new URL(STEAM_ENDPOINT);
  url.searchParams.set('step', 'callback');
  url.searchParams.set('flow', flow);
  return url.href;
}
function cookie(value: string, age: number) {
  return `${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age.toString()}`;
}
function single(params: URLSearchParams): boolean {
  return [...params.keys()].every((key) => params.getAll(key).length === 1);
}

export function createSteamHandler(deps: Dependencies) {
  const http = deps.fetch ?? fetch;
  return async (request: Request): Promise<Response> => {
    try {
      const now = Math.floor((deps.now?.() ?? Date.now()) / 1000);
      const url = new URL(request.url);
      if (url.origin !== STEAM_ORIGIN)
        return json({ error: 'invalid_origin' }, 400);
      if (deps.secret.length < 32)
        return json({ error: 'provider_not_configured' }, 503);
      if (!single(url.searchParams))
        return json({ error: 'invalid_request' }, 400);
      const step = url.searchParams.get('step');
      if (step === 'authorize' && request.method === 'GET') {
        const params = url.searchParams;
        const state = params.get('state') ?? '';
        const challenge = params.get('code_challenge') ?? '';
        if (
          params.get('client_id') !== STEAM_CLIENT_ID ||
          params.get('redirect_uri') !== SUPABASE_CALLBACK ||
          params.get('response_type') !== 'code' ||
          !state ||
          state.length > 1024 ||
          (challenge &&
            (!/^[\w-]{43}$/.test(challenge) ||
              params.get('code_challenge_method') !== 'S256'))
        )
          return json({ error: 'invalid_request' }, 400);
        const flow = handle(now + 600);
        const proof = randomBytes(32).toString('base64url');
        const key = recordKey('flow', flow, now);
        if (
          !key ||
          !(
            await deps.store.put(
              key,
              { state, challenge, proof: hash(proof), used: false },
              { onlyIfNew: true },
            )
          ).modified
        )
          return json({ error: 'temporarily_unavailable' }, 503);
        const target = new URL(steamLogin);
        const options = {
          'openid.ns': namespace,
          'openid.mode': 'checkid_setup',
          'openid.return_to': callbackFor(flow),
          'openid.realm': `${STEAM_ORIGIN}/`,
          'openid.identity': `${namespace}/identifier_select`,
          'openid.claimed_id': `${namespace}/identifier_select`,
        };
        for (const [name, value] of Object.entries(options))
          target.searchParams.set(name, value);
        return redirect(target.href, cookie(`${flow}.${proof}`, 600));
      }
      if (step === 'callback' && request.method === 'GET') {
        const params = url.searchParams;
        const flow = params.get('flow') ?? '';
        const key = recordKey('flow', flow, now);
        const stored = key ? await deps.store.get(key) : null;
        const data = flowSchema.safeParse(stored?.data);
        const browserProof =
          request.headers
            .get('cookie')
            ?.split(';')
            .map((value) => value.trim())
            .find((value) => value.startsWith(`${cookieName}=`))
            ?.slice(cookieName.length + 1) ?? '';
        const proof = browserProof.startsWith(`${flow}.`)
          ? browserProof.slice(flow.length + 1)
          : '';
        if (
          !key ||
          !stored ||
          !data.success ||
          data.data.used ||
          !proof ||
          !equal(hash(proof), data.data.proof)
        )
          return json({ error: 'invalid_login_state' }, 400);
        if (params.get('openid.mode') === 'cancel') {
          const cancelled = new URL(SUPABASE_CALLBACK);
          cancelled.searchParams.set('state', data.data.state);
          cancelled.searchParams.set('error', 'access_denied');
          return redirect(cancelled.href, cookie('', 0));
        }
        const claimed = params.get('openid.claimed_id') ?? '';
        const steamId =
          /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/.exec(
            claimed,
          )?.[1];
        const nonce = params.get('openid.response_nonce') ?? '';
        const nonceTime = Date.parse(nonce.slice(0, 20)) / 1000;
        const signed = new Set((params.get('openid.signed') ?? '').split(','));
        if (
          !steamId ||
          params.get('openid.ns') !== namespace ||
          params.get('openid.mode') !== 'id_res' ||
          params.get('openid.op_endpoint') !== steamLogin ||
          params.get('openid.identity') !== claimed ||
          params.get('openid.return_to') !== callbackFor(flow) ||
          !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ.+$/.test(nonce) ||
          !Number.isFinite(nonceTime) ||
          nonceTime < now - 600 ||
          nonceTime > now + 30 ||
          ![
            'op_endpoint',
            'claimed_id',
            'identity',
            'return_to',
            'response_nonce',
          ].every((name) => signed.has(name))
        )
          return json({ error: 'invalid_steam_assertion' }, 400);
        const verification = new URLSearchParams();
        for (const [name, value] of params)
          if (name.startsWith('openid.')) verification.set(name, value);
        verification.set('openid.mode', 'check_authentication');
        const verified = await http(steamLogin, {
          method: 'POST',
          body: verification,
          redirect: 'error',
          signal: AbortSignal.timeout(8000),
        });
        const result = await verified.text();
        if (
          !verified.ok ||
          result.length > 8192 ||
          !result.split(/\r?\n/).includes('is_valid:true')
        )
          return json({ error: 'invalid_steam_signature' }, 400);
        if (
          !(
            await deps.store.put(
              `nonce/${Math.floor(nonceTime + 600).toString()}/${hash(nonce)}`,
              true,
              { onlyIfNew: true },
            )
          ).modified ||
          !(
            await deps.store.put(
              key,
              { ...data.data, used: true },
              { onlyIfMatch: stored.etag },
            )
          ).modified
        )
          return json({ error: 'replayed_steam_assertion' }, 400);
        const profile = await steamProfile(steamId, http);
        const code = handle(now + 60);
        const codeKey = recordKey('code', code, now);
        if (
          !codeKey ||
          !(
            await deps.store.put(
              codeKey,
              { profile, challenge: data.data.challenge, used: false },
              { onlyIfNew: true },
            )
          ).modified
        )
          return json({ error: 'temporarily_unavailable' }, 503);
        const target = new URL(SUPABASE_CALLBACK);
        target.searchParams.set('code', code);
        target.searchParams.set('state', data.data.state);
        return redirect(target.href, cookie('', 0));
      }
      if (step === 'token' && request.method === 'POST') {
        if (Number(request.headers.get('content-length') ?? 0) > 8192)
          return json({ error: 'invalid_request' }, 400);
        const text = await request.text();
        if (text.length > 8192) return json({ error: 'invalid_request' }, 400);
        const params = new URLSearchParams(text);
        if (!single(params)) return json({ error: 'invalid_request' }, 400);
        let clientId = params.get('client_id') ?? '';
        let secret = params.get('client_secret') ?? '';
        const auth = request.headers.get('authorization');
        if (auth?.startsWith('Basic ')) {
          const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
          const colon = decoded.indexOf(':');
          clientId = decodeURIComponent(decoded.slice(0, colon));
          secret = decodeURIComponent(decoded.slice(colon + 1));
        }
        if (clientId !== STEAM_CLIENT_ID || !equal(secret, deps.secret))
          return json({ error: 'invalid_client' }, 401);
        if (
          params.get('grant_type') !== 'authorization_code' ||
          params.get('redirect_uri') !== SUPABASE_CALLBACK
        )
          return json({ error: 'invalid_grant' }, 400);
        const code = params.get('code') ?? '';
        const key = recordKey('code', code, now);
        const stored = key ? await deps.store.get(key) : null;
        const data = codeSchema.safeParse(stored?.data);
        if (
          !key ||
          !stored ||
          !data.success ||
          data.data.used ||
          (data.data.challenge &&
            !equal(
              hash(params.get('code_verifier') ?? ''),
              data.data.challenge,
            ))
        )
          return json({ error: 'invalid_grant' }, 400);
        if (
          !(
            await deps.store.put(
              key,
              { ...data.data, used: true },
              { onlyIfMatch: stored.etag },
            )
          ).modified
        )
          return json({ error: 'invalid_grant' }, 400);
        const token = handle(now + 120);
        const tokenKey = recordKey('token', token, now);
        if (
          !tokenKey ||
          !(
            await deps.store.put(tokenKey, data.data.profile, {
              onlyIfNew: true,
            })
          ).modified
        )
          return json({ error: 'temporarily_unavailable' }, 503);
        return json({
          access_token: token,
          token_type: 'Bearer',
          expires_in: 120,
          scope: 'profile',
        });
      }
      if (step === 'userinfo' && request.method === 'GET') {
        const auth = request.headers.get('authorization') ?? '';
        const key = recordKey(
          'token',
          auth.startsWith('Bearer ') ? auth.slice(7) : '',
          now,
        );
        const stored = key ? await deps.store.get(key) : null;
        const profile = profileSchema.safeParse(stored?.data);
        return profile.success
          ? json(profile.data)
          : json({ error: 'invalid_token' }, 401);
      }
      return json({ error: 'invalid_request' }, 400);
    } catch {
      return json({ error: 'temporarily_unavailable' }, 503);
    }
  };
}
async function steamProfile(steamId: string, http: typeof fetch) {
  const fallback = { sub: steamId, name: `Steam ${steamId.slice(-6)}` };
  try {
    const response = await http(
      `https://steamcommunity.com/profiles/${steamId}/?xml=1`,
      { redirect: 'error', signal: AbortSignal.timeout(3000) },
    );
    if (!response.ok) return fallback;
    const xml = await response.text();
    if (
      xml.length > 131072 ||
      !xml.includes(`<steamID64>${steamId}</steamID64>`)
    )
      return fallback;
    const field = (name: string) =>
      new RegExp(
        `<${name}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))<\\/${name}>`,
      ).exec(xml);
    const title = field('steamID');
    const image = field('avatarFull');
    const name = (title?.[1] ?? title?.[2] ?? '').trim().slice(0, 150);
    const picture = image?.[1] ?? image?.[2];
    const avatar = picture ? new URL(picture) : null;
    const safeAvatar =
      avatar?.protocol === 'https:' &&
      !avatar.username &&
      !avatar.password &&
      ['steamstatic.com', 'steamusercontent.com', 'akamaihd.net'].some(
        (domain) =>
          avatar.hostname === domain || avatar.hostname.endsWith(`.${domain}`),
      );
    return {
      ...fallback,
      ...(name ? { name } : {}),
      ...(safeAvatar ? { picture: avatar.href } : {}),
    };
  } catch {
    return fallback;
  }
}
