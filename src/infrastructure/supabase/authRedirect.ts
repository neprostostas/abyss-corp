const previewOrigin = 'https://account-preview--abyss-corp.netlify.app';
const allowedOrigins = new Set([
  'https://abyss-corp.netlify.app',
  previewOrigin,
]);
/** Email links always return to an operator-controlled HTTPS origin. */
export function authReturnUrl(path: '/' | '/reset-password'): string {
  const origin = allowedOrigins.has(window.location.origin)
    ? window.location.origin
    : previewOrigin;
  return new URL(path, origin).href;
}
