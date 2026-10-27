import { getStore } from '@netlify/blobs';
import { createSteamHandler } from '../lib/steamOAuth';
export default async (request: Request) => {
  try {
    const store = getStore({ name: 'steam-oauth', consistency: 'strong' });
    return await createSteamHandler({
      secret: process.env.STEAM_OAUTH_CLIENT_SECRET ?? '',
      store: {
        get: async (key) => {
          const entry = await store.getWithMetadata(key, { type: 'json' });
          const data: unknown = entry?.data;
          return entry && typeof entry.etag === 'string'
            ? { data, etag: entry.etag }
            : null;
        },
        put: (key, data, condition) => store.setJSON(key, data, condition),
      },
    })(request);
  } catch {
    return new Response(JSON.stringify({ error: 'provider_not_configured' }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
};
