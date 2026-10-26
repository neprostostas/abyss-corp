import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url: unknown = import.meta.env.VITE_SUPABASE_URL;
const key: unknown = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase =
  typeof url === 'string' &&
  url.startsWith('https://') &&
  typeof key === 'string' &&
  key.length > 0
    ? createClient<Database>(url, key, {
        global: {
          fetch: (input, init) =>
            fetch(input, {
              ...init,
              signal: init?.signal
                ? AbortSignal.any([init.signal, AbortSignal.timeout(10000)])
                : AbortSignal.timeout(10000),
            }),
        },
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
