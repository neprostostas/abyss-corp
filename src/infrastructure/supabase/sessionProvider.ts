import type { Session } from '@supabase/supabase-js';
import { SOCIAL_PROVIDERS } from './socialProviders';
import type { SocialProvider } from './socialProviders';
export type LoginProvider = SocialProvider | 'email';
const pendingKey = 'abyss-corp.pending-provider';
const sessionKey = 'abyss-corp.session-provider';
function provider(value: unknown): value is LoginProvider {
  return value === 'email' || SOCIAL_PROVIDERS.some((item) => item === value);
}
export function beginProviderSignIn(value: SocialProvider) {
  try {
    window.sessionStorage.setItem(
      pendingKey,
      JSON.stringify({ provider: value, time: Date.now() }),
    );
  } catch {
    /* Display metadata is optional. */
  }
}
export function clearPendingProvider() {
  try {
    window.sessionStorage.removeItem(pendingKey);
  } catch {
    /* Optional. */
  }
}
/** Cosmetic session label only. Never use this value to authorize anything. */
export function sessionProvider(session: Session): LoginProvider | null {
  try {
    const claims: unknown = JSON.parse(
      atob(
        (session.access_token.split('.')[1] ?? '')
          .replaceAll('-', '+')
          .replaceAll('_', '/'),
      ),
    );
    if (
      !claims ||
      typeof claims !== 'object' ||
      !('session_id' in claims) ||
      typeof claims.session_id !== 'string'
    )
      return fallback(session);
    const saved: unknown = JSON.parse(
      window.localStorage.getItem(sessionKey) ?? 'null',
    );
    if (
      saved &&
      typeof saved === 'object' &&
      'id' in saved &&
      saved.id === claims.session_id &&
      'provider' in saved &&
      provider(saved.provider)
    )
      return saved.provider;
    const methods =
      'amr' in claims && Array.isArray(claims.amr) ? claims.amr : [];
    const latest: unknown = methods.at(-1);
    const method =
      latest && typeof latest === 'object' && 'method' in latest
        ? latest.method
        : null;
    let chosen: LoginProvider | null = null;
    if (
      ['password', 'otp', 'recovery', 'email/signup', 'email_change'].includes(
        String(method),
      )
    )
      chosen = 'email';
    const pending: unknown = JSON.parse(
      window.sessionStorage.getItem(pendingKey) ?? 'null',
    );
    if (
      !chosen &&
      pending &&
      typeof pending === 'object' &&
      'provider' in pending &&
      provider(pending.provider) &&
      'time' in pending &&
      typeof pending.time === 'number' &&
      Date.now() - pending.time < 600000 &&
      Date.now() >= pending.time &&
      'iat' in claims &&
      typeof claims.iat === 'number' &&
      claims.iat * 1000 >= pending.time - 5000
    )
      chosen = pending.provider;
    chosen ??= fallback(session);
    if (chosen) {
      window.localStorage.setItem(
        sessionKey,
        JSON.stringify({ id: claims.session_id, provider: chosen }),
      );
      clearPendingProvider();
    }
    return chosen;
  } catch {
    return fallback(session);
  }
}
function fallback(session: Session): LoginProvider | null {
  const identities = session.user.identities ?? [];
  const latest = [...identities].sort(
    (a, b) =>
      Date.parse(b.last_sign_in_at ?? '') - Date.parse(a.last_sign_in_at ?? ''),
  )[0];
  return latest && provider(latest.provider)
    ? latest.provider
    : provider(session.user.app_metadata.provider)
      ? session.user.app_metadata.provider
      : null;
}
