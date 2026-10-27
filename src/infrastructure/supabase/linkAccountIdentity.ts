import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { providerScopes } from './socialProviders';
import type { SocialProvider } from './socialProviders';
import { authReturnUrl } from './authRedirect';

export async function linkAccountIdentity(
  client: SupabaseClient<Database>,
  provider: SocialProvider,
  save: () => Promise<void>,
) {
  await save();
  const scopes = providerScopes(provider);
  try {
    window.sessionStorage.setItem('abyss-corp.show-connections', '1');
  } catch {
    /* Linking still works without return navigation. */
  }
  try {
    const { error } = await client.auth.linkIdentity({
      provider,
      options: {
        redirectTo: authReturnUrl('/'),
        ...(scopes ? { scopes } : {}),
      },
    });
    if (error) throw error;
  } catch (failure) {
    try {
      window.sessionStorage.removeItem('abyss-corp.show-connections');
    } catch {
      /* Optional. */
    }
    throw failure;
  }
}
