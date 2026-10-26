import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/database.types';
import type {
  AdminAnalyticsGateway,
  TrafficReport,
} from '../../application/analyticsPorts';
const counts = z.object({
  visitors: z.number().nonnegative(),
  pageviews: z.number().nonnegative(),
  sessions: z.number().nonnegative(),
});
const schema = z.object({
  days: z.number(),
  updatedAt: z.string(),
  totals: counts,
  daily: z.array(counts.extend({ day: z.string() })),
});
export class AdminAnalyticsClient implements AdminAnalyticsGateway {
  constructor(private readonly client: SupabaseClient<Database>) {}
  async load(days: number, signal: AbortSignal): Promise<TrafficReport> {
    const permission = await this.client.rpc('is_database_admin');
    if (permission.error || !permission.data)
      throw new Error('Administrator access required.');
    const { data } = await this.client.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Sign in again.');
    const response = await fetch(
      `/.netlify/functions/analytics?days=${String(days)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.any([signal, AbortSignal.timeout(25000)]),
      },
    );
    const body: unknown = await response.json();
    if (!response.ok)
      throw new Error(
        typeof body === 'object' &&
          body !== null &&
          'error' in body &&
          typeof body.error === 'string'
          ? body.error
          : 'Analytics unavailable.',
      );
    return schema.parse(body);
  }
}
