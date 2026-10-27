const productionOrigin = 'https://abysscorp.us.ci';
const allowedOrigins = new Set([
  'https://abysscorp.us.ci',
  'https://abyss-corp.netlify.app',
]);
/** Email links always return to an operator-controlled HTTPS origin. */
export function authReturnUrl(path: '/' | '/reset-password'): string {
  const origin = allowedOrigins.has(window.location.origin)
    ? window.location.origin
    : productionOrigin;
  return new URL(path, origin).href;
}
