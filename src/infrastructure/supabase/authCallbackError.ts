/** Interpret known OAuth failures without displaying untrusted callback text. */
export function authCallbackError(url: string): string | null {
  const callback = new URL(url);
  const hash = new URLSearchParams(callback.hash.slice(1));
  const query = callback.searchParams;
  const params =
    hash.has('error') || hash.has('error_description') || hash.has('error_code')
      ? hash
      : query;
  if (
    !params.has('error') &&
    !params.has('error_description') &&
    !params.has('error_code')
  )
    return null;
  const code = params.get('error_code');
  const description = params.get('error_description') ?? '';
  if (
    code === 'identity_already_exists' ||
    description === 'Identity is already linked to another user' ||
    description === '422: Identity is already linked to another user'
  )
    return 'This sign-in method already belongs to another Abyss Corp account. It cannot be connected here until the separate accounts are resolved. Your current account and progress are unchanged.';
  if (params.get('error') === 'access_denied' && !code)
    return 'Authorization was cancelled or denied. Your account and progress are unchanged.';
  if (
    code === 'otp_expired' ||
    code === 'flow_state_expired' ||
    code === 'flow_state_not_found'
  )
    return 'The sign-in link expired or was already used. Please start again.';
  return 'Could not complete sign-in or connect this account. Please try again.';
}

/** Remove only OAuth error parameters; leave unrelated navigation intact. */
export function clearAuthCallbackError(url: string): string {
  const callback = new URL(url);
  const hash = new URLSearchParams(callback.hash.slice(1));
  const errorKeys = ['error', 'error_code', 'error_description'];
  const hashError = errorKeys.some((key) => hash.has(key));
  for (const key of errorKeys) {
    callback.searchParams.delete(key);
    if (hashError) hash.delete(key);
  }
  if (hashError) callback.hash = hash.toString();
  return `${callback.pathname}${callback.search}${callback.hash}`;
}
