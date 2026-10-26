import { createClient } from '@supabase/supabase-js';
const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
};
const reply = (statusCode, body) => ({
  statusCode,
  headers,
  body: JSON.stringify(body),
});
const cache = new Map();
export const handler = async (event) => {
  if (event.httpMethod !== 'GET')
    return reply(405, { error: 'Method not allowed.' });
  const authorization = event.headers.authorization;
  if (!authorization?.startsWith('Bearer '))
    return reply(401, { error: 'Sign in required.' });
  const url = process.env.SUPABASE_URL;
  const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publicKey)
    return reply(503, { error: 'Analytics authorization is not configured.' });
  try {
    const client = createClient(url, publicKey, {
      global: {
        headers: { Authorization: authorization },
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(8000) }),
      },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: user, error: authError } = await client.auth.getUser(
      authorization.slice(7),
    );
    if (authError || !user.user) return reply(401, { error: 'Sign in again.' });
    const permission = await client.rpc('is_database_admin');
    if (permission.error || !permission.data)
      return reply(403, { error: 'Administrator access required.' });
    const days = Number(event.queryStringParameters?.days ?? 30);
    if (![7, 30, 90].includes(days))
      return reply(400, { error: 'Invalid date range.' });
    const key = process.env.POSTHOG_READ_KEY;
    const project = process.env.POSTHOG_PROJECT_ID;
    if (!key || !project)
      return reply(503, { error: 'Analytics provider is not connected.' });
    const cached = cache.get(days);
    if (cached && cached.expires > Date.now()) return reply(200, cached.data);
    const query = `SELECT toString(toDate(timestamp)) AS day, uniqExact(distinct_id) AS visitors, count() AS pageviews, uniqExact(properties.$session_id) AS sessions FROM events WHERE event = '$pageview' AND properties.app = 'abyss-corp' AND properties.environment = 'production' AND timestamp >= today() - INTERVAL ${String(days - 1)} DAY GROUP BY day ORDER BY day`;
    const totalsQuery = `SELECT uniqExact(distinct_id), count(), uniqExact(properties.$session_id) FROM events WHERE event = '$pageview' AND properties.app = 'abyss-corp' AND properties.environment = 'production' AND timestamp >= today() - INTERVAL ${String(days - 1)} DAY`;
    const execute = async (query) => {
      const response = await fetch(
        `https://eu.posthog.com/api/projects/${encodeURIComponent(project)}/query/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
          signal: AbortSignal.timeout(18000),
        },
      );
      if (!response.ok)
        throw new Error('Analytics provider is temporarily unavailable.');
      const data = await response.json();
      if (!Array.isArray(data.results))
        throw new Error('Invalid analytics report.');
      return data.results;
    };
    const [daily, totals] = await Promise.all([
      execute(query),
      execute(totalsQuery),
    ]);
    const data = {
      days,
      updatedAt: new Date().toISOString(),
      totals: {
        visitors: Number(totals[0]?.[0] ?? 0),
        pageviews: Number(totals[0]?.[1] ?? 0),
        sessions: Number(totals[0]?.[2] ?? 0),
      },
      daily: daily.map((row) => ({
        day: String(row[0]),
        visitors: Number(row[1]),
        pageviews: Number(row[2]),
        sessions: Number(row[3]),
      })),
    };
    cache.set(days, { expires: Date.now() + 60000, data });
    return reply(200, data);
  } catch {
    return reply(503, { error: 'Analytics unavailable. Try again shortly.' });
  }
};
