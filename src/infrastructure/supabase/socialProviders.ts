export const SOCIAL_PROVIDERS = [
  'google',
  'discord',
  'github',
  'azure',
  'x',
  'twitch',
  'linkedin_oidc',
  'custom:telegram',
  'custom:steam',
  'facebook',
] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];
export const PROVIDER_LABELS = {
  google: 'Google',
  discord: 'Discord',
  github: 'GitHub',
  azure: 'Microsoft',
  x: 'X / Twitter',
  twitch: 'Twitch',
  linkedin_oidc: 'LinkedIn',
  'custom:telegram': 'Telegram',
  'custom:steam': 'Steam',
  facebook: 'Facebook',
};
/** Only deployment-reviewed providers can supplement Supabase's built-in flags. */
export function enabledProviders(
  settings: unknown,
  additional: unknown = [],
): SocialProvider[] {
  const external =
    settings && typeof settings === 'object' && 'external' in settings
      ? settings.external
      : null;
  const extra = Array.isArray(additional)
    ? additional.filter((value: unknown) => typeof value === 'string')
    : [];
  return SOCIAL_PROVIDERS.filter(
    (provider) =>
      (external !== null &&
        typeof external === 'object' &&
        Reflect.get(external, provider) === true) ||
      ((provider.startsWith('custom:') || provider === 'x') &&
        extra.includes(provider)),
  );
}
export function providerScopes(provider: SocialProvider): string | undefined {
  switch (provider) {
    case 'azure':
      return 'email';
    case 'github':
      return 'user:email';
    case 'discord':
      return 'identify email';
    case 'twitch':
      return 'user:read:email';
    case 'linkedin_oidc':
      return 'openid profile email';
    case 'custom:telegram':
      return 'openid profile';
    default:
      return undefined;
  }
}
export async function loadSocialProviders(): Promise<SocialProvider[]> {
  const url: unknown = import.meta.env.VITE_SUPABASE_URL;
  const key: unknown = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (typeof url !== 'string' || typeof key !== 'string') return [];
  const response = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: key },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new Error(
      'Sign-in options unavailable. Email and quick play are still available.',
    );
  const settings: unknown = await response.json();
  let additional: unknown = [];
  // GoTrue's public settings omit custom providers and some newer built-ins.
  try {
    const manifest = await fetch('/auth-providers.json', {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (manifest.ok) {
      const data: unknown = await manifest.json();
      if (data && typeof data === 'object' && 'providers' in data)
        additional = data.providers;
    }
  } catch {
    /* Native sign-in options remain available if the optional manifest fails. */
  }
  return enabledProviders(settings, additional);
}

export function providerLabel(provider: SocialProvider | 'email') {
  return provider === 'email' ? 'Email' : PROVIDER_LABELS[provider];
}
