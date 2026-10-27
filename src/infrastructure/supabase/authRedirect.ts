const productionOrigin = 'https://abysscorp.us.ci';

/** Authentication emails always return to the primary production domain. */
export function authReturnUrl(path: '/' | '/reset-password'): string {
  return new URL(path, productionOrigin).href;
}
