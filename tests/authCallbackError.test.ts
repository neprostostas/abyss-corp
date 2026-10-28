import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  authCallbackError,
  clearAuthCallbackError,
} from '../src/infrastructure/supabase/authCallbackError';
const origin = 'https://abysscorp.us.ci/';
void test('identity conflicts explain the separate account instead of an expired link', () => {
  for (const suffix of [
    '#error=server_error&error_code=identity_already_exists&error_description=Identity+is+already+linked+to+another+user',
    '?error=server_error&error_code=identity_already_exists',
    '#error=server_error&error_description=Identity+is+already+linked+to+another+user',
  ]) {
    const message = authCallbackError(origin + suffix);
    assert.match(message ?? '', /another Abyss Corp account/);
    assert.doesNotMatch(message ?? '', /expired/);
  }
});
void test('callback errors distinguish expiration, cancellation and unknown failures', () => {
  assert.match(
    authCallbackError(origin + '#error=access_denied&error_code=otp_expired') ??
      '',
    /expired/,
  );
  assert.match(
    authCallbackError(origin + '#error=access_denied') ?? '',
    /cancelled or denied/,
  );
  assert.equal(authCallbackError(origin), null);
  assert.equal(authCallbackError(origin + '?campaign=one#game'), null);
  const raw = '<script>untrusted</script>';
  assert.equal(
    authCallbackError(origin + '#error_description=' + encodeURIComponent(raw)),
    'Could not complete sign-in or connect this account. Please try again.',
  );
});
void test('OAuth cleanup preserves navigation and removes error details from query and hash', () => {
  assert.equal(
    clearAuthCallbackError(
      origin +
        '?campaign=one&error=server_error&error_code=identity_already_exists#game',
    ),
    '/?campaign=one#game',
  );
  assert.equal(
    clearAuthCallbackError(
      origin +
        '?campaign=one#error=server_error&error_description=private&tab=connections',
    ),
    '/?campaign=one#tab=connections',
  );
});
