import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  needsCaptainName,
  profileDetails,
  requestedCaptainName,
} from '../src/domain/profile';
import { enabledProviders } from '../src/infrastructure/supabase/socialProviders';

void test('legacy generated names need onboarding while chosen names are retained', () => {
  const id = 'abcd1234-0000-0000-0000-000000000000';
  assert.equal(needsCaptainName('Captain ABCD1234', id), true);
  assert.equal(needsCaptainName(null, id), true);
  assert.equal(needsCaptainName('Captain ABCD1234', id, true), false);
  assert.equal(needsCaptainName('Ocean explorer', id), false);
  assert.equal(requestedCaptainName({ captain_name: '  Nemo  ' }), 'Nemo');
  assert.equal(requestedCaptainName({ captain_name: 'x' }), null);
  assert.equal(requestedCaptainName({ full_name: 'Social identity' }), null);
});
void test('provider profiles support missing or unsafe photos without inventing an email avatar', () => {
  assert.deepEqual(profileDetails({}), { avatar: null, fullName: null });
  assert.deepEqual(
    profileDetails({
      picture: 'https://images.example/avatar',
      name: 'Captain',
    }),
    { avatar: 'https://images.example/avatar', fullName: 'Captain' },
  );
  for (const avatar_url of [
    'javascript:alert(1)',
    'data:image/svg+xml,test',
    'http://example.com/photo',
    'https://user:pass@example.com/photo',
    'broken',
  ])
    assert.equal(profileDetails({ avatar_url }).avatar, null);
});
void test('only explicitly enabled supported OAuth providers appear', () => {
  assert.deepEqual(
    enabledProviders({
      external: { google: true, apple: false, facebook: true, github: true },
    }),
    ['google', 'facebook'],
  );
  for (const settings of [
    null,
    {},
    { external: null },
    { external: { google: 'true' } },
  ])
    assert.deepEqual(enabledProviders(settings), []);
});
