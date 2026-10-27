export const SOCIAL_PROVIDERS = ['google', 'apple', 'facebook'] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];
export const PROVIDER_LABELS = {
  google: 'Google',
  apple: 'Apple',
  facebook: 'Facebook',
};
export function enabledProviders(settings: unknown): SocialProvider[] {
  if (!settings || typeof settings !== 'object' || !('external' in settings))
    return [];
  const external = settings.external;
  if (!external || typeof external !== 'object') return [];
  return SOCIAL_PROVIDERS.filter(
    (provider) =>
      provider in external && Reflect.get(external, provider) === true,
  );
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
  return enabledProviders(await response.json());
}
