import { deleteOwnAccount } from '../../../netlify/lib/deleteAccount.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const origins = new Set([
  'https://abysscorp.us.ci',
  'https://abyss-corp.netlify.app',
  'http://localhost:5173',
]);
Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin') ?? '';
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origins.has(origin) ? origin : '',
    'Access-Control-Allow-Headers':
      'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
    'Cache-Control': 'no-store',
  };
  const respond = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });
  if (!origins.has(origin))
    return respond({ error: 'Origin is not allowed.' }, 403);
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers });
  if (request.method !== 'POST')
    return respond({ error: 'Method not allowed.' }, 405);
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer '))
    return respond({ error: 'Sign in again.' }, 401);
  try {
    const body: unknown = await request.json();
    if (
      !body ||
      typeof body !== 'object' ||
      !('confirmation' in body) ||
      body.confirmation !== 'DELETE'
    )
      return respond({ error: 'Confirm account deletion.' }, 400);
    const url = Deno.env.get('SUPABASE_URL')!;
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const admin = createClient(
      url,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const bucket = admin.storage.from('avatars');
    const deleted = await deleteOwnAccount({
      verifiedUser: async () => {
        const {
          data: { user },
          error,
        } = await caller.auth.getUser();
        return error || !user
          ? null
          : { id: user.id, anonymous: !!user.is_anonymous };
      },
      activeSession: async () => {
        const { data, error } = await caller.rpc('has_active_game_session');
        return !error && data === true;
      },
      revokeSessions: async () => {
        const { error } = await admin.auth.admin.signOut(
          authorization.slice(7),
          'global',
        );
        if (error) throw error;
      },
      listPhotos: async (userId) => {
        const { data, error } = await bucket.list(userId, { limit: 100 });
        if (error) throw error;
        return (data ?? []).map((file) => file.name);
      },
      removePhotos: async (paths) => {
        const { error } = await bucket.remove(paths);
        if (error) throw error;
      },
      deleteUser: async (userId) => {
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw error;
      },
    });
    if (!deleted)
      return respond({ error: 'Your session expired. Sign in again.' }, 401);
    return respond({ deleted: true });
  } catch {
    return respond(
      { error: 'Account deletion could not finish. Sign in again and retry.' },
      500,
    );
  }
});
