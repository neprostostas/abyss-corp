import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deleteOwnAccount } from '../netlify/lib/deleteAccount';
import type { AccountDeletionServices } from '../netlify/lib/deleteAccount';
import { customAvatar, AVATARS } from '../src/data/avatars';
import { accountProfileDetails } from '../src/domain/profile';
import { prepareAvatar } from '../src/infrastructure/images/prepareAvatar';

function deletionFixture() {
  const calls: string[] = [];
  let files = ['a.webp', 'b.webp'];
  const services: AccountDeletionServices = {
    verifiedUser: () =>
      Promise.resolve({ id: 'verified-user', anonymous: false }),
    activeSession: () => Promise.resolve(true),
    revokeSessions: () => {
      calls.push('revoke');
      return Promise.resolve();
    },
    listPhotos: (id) => {
      calls.push(`list:${id}`);
      return Promise.resolve(files);
    },
    removePhotos: (paths) => {
      calls.push(`remove:${paths.join(',')}`);
      files = [];
      return Promise.resolve();
    },
    deleteUser: (id) => {
      calls.push(`delete:${id}`);
      return Promise.resolve();
    },
  };
  return { services, calls };
}
void test('deletion derives the target from verified identity, revokes sessions and removes files before Auth', async () => {
  const h = deletionFixture();
  assert.equal(await deleteOwnAccount(h.services), true);
  assert.deepEqual(h.calls, [
    'revoke',
    'list:verified-user',
    'remove:verified-user/a.webp,verified-user/b.webp',
    'list:verified-user',
    'delete:verified-user',
  ]);
});
void test('invalid, anonymous and revoked sessions cannot delete accounts or files', async () => {
  for (const variant of ['invalid', 'anonymous', 'revoked']) {
    const h = deletionFixture();
    if (variant === 'invalid')
      h.services.verifiedUser = () => Promise.resolve(null);
    if (variant === 'anonymous')
      h.services.verifiedUser = () =>
        Promise.resolve({ id: 'guest', anonymous: true });
    if (variant === 'revoked')
      h.services.activeSession = () => Promise.resolve(false);
    assert.equal(await deleteOwnAccount(h.services), false);
    assert.deepEqual(h.calls, []);
  }
});
void test('a failed storage removal never proceeds to Auth deletion', async () => {
  const h = deletionFixture();
  h.services.removePhotos = () =>
    Promise.reject(new Error('Storage unavailable'));
  await assert.rejects(deleteOwnAccount(h.services), /Storage unavailable/);
  assert(!h.calls.some((call) => call.startsWith('delete:')));
});
void test('chosen avatars override the current provider photo and social restores it', () => {
  assert.equal(AVATARS.length, 20);
  assert.equal(new Set(AVATARS.map((avatar) => avatar.id)).size, 20);
  const user = {
    user_metadata: { abyss_avatar: 'jellyfish' },
    identities: [
      {
        provider: 'google',
        identity_data: { picture: 'https://example.com/photo.png' },
      },
    ],
  };
  assert.equal(
    accountProfileDetails(user, 'google').avatar,
    '/avatars/jellyfish.webp',
  );
  user.user_metadata.abyss_avatar = 'social';
  assert.equal(
    accountProfileDetails(user, 'google').avatar,
    'https://example.com/photo.png',
  );
  assert.equal(
    customAvatar({
      abyss_avatar: 'upload',
      abyss_avatar_url: 'javascript:alert(1)',
    }),
    null,
  );
  assert.equal(customAvatar({ abyss_avatar: '../../x' }), null);
});
void test('avatar uploads reject SVG, empty and oversized files before decoding', async () => {
  await assert.rejects(
    prepareAvatar(new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' })),
    /JPG/,
  );
  await assert.rejects(
    prepareAvatar(new File([], 'x.png', { type: 'image/png' })),
    /5 MB/,
  );
  await assert.rejects(
    prepareAvatar(
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'x.png', {
        type: 'image/png',
      }),
    ),
    /5 MB/,
  );
});
