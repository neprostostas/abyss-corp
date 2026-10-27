import { AccountPanel } from '../src/ui/account/AccountPanel';
import { AvatarPicker } from '../src/ui/account/AvatarPicker';
import { AccountDangerActions } from '../src/ui/account/AccountDangerActions';
import { deferred } from './fixtures';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '../src/infrastructure/supabase/database.types';
import { AuthScreen } from '../src/ui/auth/AuthScreen';
import { ProfileGate } from '../src/ui/account/ProfileGate';
import { SocialSignIn } from '../src/ui/auth/SocialSignIn';
import {
  SOCIAL_PROVIDERS,
  PROVIDER_LABELS,
  providerScopes,
} from '../src/infrastructure/supabase/socialProviders';
import { ProfileAvatar } from '../src/ui/account/ProfileAvatar';

const dom = new JSDOM('<!doctype html><div id="root"></div>', {
  url: 'https://abysscorp.us.ci/',
});
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLInputElement: dom.window.HTMLInputElement,
  HTMLElement: dom.window.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import('react-dom/client');
const container = document.getElementById('root');
assert(container);
const root = createRoot(container);
async function ui(action: () => void) {
  await act(async () => {
    action();
    await Promise.resolve();
  });
}
async function click(label: string) {
  const button = [...document.querySelectorAll('button')].find((item) =>
    item.textContent.includes(label),
  );
  assert(button, `Missing button: ${label}`);
  await ui(() => {
    button.click();
  });
}
async function fill(name: string, value: string) {
  const input = document.querySelector(`input[name="${name}"]`);
  assert(input instanceof HTMLInputElement);
  const descriptor = Object.getOwnPropertyDescriptor(
    dom.window.HTMLInputElement.prototype,
    'value',
  );
  await ui(() => {
    assert(typeof descriptor?.set === 'function');
    descriptor.set.call(input, value);
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
}
async function reset() {
  await ui(() => {
    root.render(null);
  });
}

void test('quick play needs no fields and never calls sign-in', async () => {
  let guest = false;
  const client = {} as SupabaseClient<Database>;
  await ui(() => {
    root.render(
      createElement(AuthScreen, {
        client,
        recovery: false,
        signedIn: false,
        onGuest: () => {
          guest = true;
        },
        onPasswordUpdated: () => {
          assert.fail('Unexpected password update');
        },
      }),
    );
  });
  await click('Quick play');
  assert.equal(guest, true);
  await reset();
});

void test('registration requires a player-chosen nickname and sends it with the primary callback', async () => {
  let submitted: unknown = null;
  const client = {
    auth: {
      signUp: (args: unknown) => {
        submitted = args;
        return Promise.resolve({ error: null });
      },
    },
  } as unknown as SupabaseClient<Database>;
  await ui(() => {
    root.render(
      createElement(AuthScreen, {
        client,
        recovery: false,
        signedIn: false,
        onGuest: () => {
          assert.fail('Unexpected guest navigation');
        },
        onPasswordUpdated: () => {
          assert.fail('Unexpected password update');
        },
      }),
    );
  });
  await click('Create account');
  await fill('email', 'captain@example.com');
  await fill('password', 'test-password-123');
  await fill('confirmation', 'test-password-123');
  await click('Create account');
  assert.equal(submitted, null);
  assert.match(document.body.textContent, /Enter your nickname/);
  await fill('nickname', '  Nemo  ');
  await click('Create account');
  assert.deepEqual(submitted, {
    email: 'captain@example.com',
    password: 'test-password-123',
    options: {
      emailRedirectTo: 'https://abysscorp.us.ci/',
      data: { captain_name: 'Nemo' },
    },
  });
  assert.match(document.body.textContent, /Check your email/);
  await reset();
});

function profileFixture(name: string, metadata: Record<string, unknown> = {}) {
  let current = name;
  const user = {
    id: 'abcd1234-0000-0000-0000-000000000000',
    user_metadata: metadata,
  } as User;
  const client = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: { captain_name: current }, error: null }),
        }),
      }),
      update: (data: { captain_name: string }) => ({
        eq: () => ({
          select: () => ({
            single: () => {
              current = data.captain_name;
              return Promise.resolve({ data: { id: user.id }, error: null });
            },
          }),
        }),
      }),
    }),
    auth: { updateUser: () => Promise.resolve({ error: null }) },
  } as unknown as SupabaseClient<Database>;
  return { client, user, current: () => current };
}
void test('legacy accounts must choose a name before gameplay; existing chosen names bypass onboarding', async () => {
  const old = profileFixture('Captain ABCD1234');
  const children = (name: string) =>
    createElement('div', { 'data-game': true }, name);
  await ui(() => {
    root.render(createElement(ProfileGate, { ...old, children }));
  });
  assert.equal(document.querySelector('[data-game]'), null);
  assert.match(document.body.textContent, /Your captain name/);
  const input = document.querySelector('input');
  assert(input);
  input.name = 'nickname';
  await fill('nickname', 'Sea captain');
  await click('Start playing');
  assert.equal(
    document.querySelector('[data-game]')?.textContent,
    'Sea captain',
  );
  assert.equal(old.current(), 'Sea captain');
  await reset();
  const existing = profileFixture('Already chosen');
  await ui(() => {
    root.render(createElement(ProfileGate, { ...existing, children }));
  });
  assert.equal(
    document.querySelector('[data-game]')?.textContent,
    'Already chosen',
  );
  await reset();
});
void test('email signup nickname is applied without asking the player twice', async () => {
  const fixture = profileFixture('Captain ABCD1234', {
    captain_name: 'Email captain',
  });
  await ui(() => {
    root.render(
      createElement(ProfileGate, {
        ...fixture,
        children: (name) => createElement('div', { 'data-game': true }, name),
      }),
    );
  });
  assert.equal(
    document.querySelector('[data-game]')?.textContent,
    'Email captain',
  );
  assert.equal(fixture.current(), 'Email captain');
  await reset();
});
void test('a broken provider image falls back to a complete nickname initial', async () => {
  await ui(() => {
    root.render(
      createElement(ProfileAvatar, {
        name: '👩‍🚀 Captain',
        url: 'https://example.com/photo',
      }),
    );
  });
  const image = document.querySelector('img');
  assert(image);
  await ui(() => {
    image.dispatchEvent(new dom.window.Event('error'));
  });
  assert.equal(document.querySelector('img'), null);
  assert.equal(document.querySelector('.account-avatar')?.textContent, '👩‍🚀');
  await reset();
});

void test('many sign-in providers start expanded in a labelled list and dispatch the correct provider', async () => {
  const selected: string[] = [];
  await ui(() => {
    root.render(
      createElement(SocialSignIn, {
        providers: SOCIAL_PROVIDERS,
        busy: false,
        onSignIn: (provider) => {
          selected.push(provider);
        },
      }),
    );
  });
  const details = document.querySelector('details');
  assert(details);
  assert.equal(details.open, true);
  assert.equal(
    document.querySelector('.provider-primary')?.textContent,
    'Continue with Google',
  );
  const summary = details.querySelector('summary');
  assert(summary);
  await ui(() => {
    summary.click();
  });
  assert.equal(details.open, false);
  await ui(() => {
    summary.click();
  });
  for (const provider of SOCIAL_PROVIDERS.slice(1)) {
    const button = document.querySelector(
      `[aria-label="Continue with ${PROVIDER_LABELS[provider]}"]`,
    );
    assert(button instanceof dom.window.HTMLButtonElement);
    assert(button.querySelector('path')?.getAttribute('d'));
    await ui(() => {
      button.click();
    });
  }
  assert.deepEqual(selected, SOCIAL_PROVIDERS.slice(1));
  await ui(() => {
    root.render(
      createElement(SocialSignIn, {
        providers: SOCIAL_PROVIDERS,
        busy: true,
        onSignIn: (provider) => {
          selected.push(provider);
        },
      }),
    );
  });
  for (const button of document.querySelectorAll('button'))
    assert.equal(button.disabled, true);
  await reset();
});
void test('a single active provider does not expose an empty extra-options control', async () => {
  await ui(() => {
    root.render(
      createElement(SocialSignIn, {
        providers: ['google'],
        busy: false,
        onSignIn: () => {
          assert.fail('Unexpected sign-in');
        },
      }),
    );
  });
  assert.equal(document.querySelector('details'), null);
  assert.equal(document.querySelectorAll('button').length, 1);
  assert.equal(providerScopes('azure'), 'email');
  assert.equal(providerScopes('github'), 'user:email');
  assert.equal(providerScopes('custom:telegram'), 'openid profile');
  await reset();
});

void test('linked providers remain visible when disabled for new sign-ins, with the current session clearly marked', async () => {
  const { ConnectedAccounts } =
    await import('../src/ui/account/ConnectedAccounts');
  const user = {
    id: 'player',
    identities: [{ provider: 'custom:telegram', identity_id: 'tg' }],
    user_metadata: {},
    app_metadata: {},
  } as unknown as User;
  const client = {
    auth: {
      getUserIdentities: () =>
        Promise.resolve({ data: { identities: user.identities }, error: null }),
    },
  } as unknown as SupabaseClient<Database>;
  await ui(() => {
    root.render(
      createElement(ConnectedAccounts, {
        client,
        user,
        current: 'custom:telegram',
        onSave: () => Promise.resolve(),
      }),
    );
  });
  assert(document.querySelector('.provider-telegram svg'));
  assert(document.querySelector('[aria-label="Telegram connected"]'));
  assert.equal(document.querySelector('[aria-label="Connect Telegram"]'), null);
  assert.match(
    document.querySelector('.connection-list')?.textContent ?? '',
    /TelegramCurrent session/,
  );
  assert(document.querySelector('[aria-label="Connect Email"]'));
  await reset();
});

void test('destructive controls require exact confirmation and block duplicate submissions', async () => {
  let resets = 0,
    deletions = 0;
  const gate = deferred();
  await ui(() => {
    root.render(
      createElement(AccountDangerActions, {
        onReset: async () => {
          resets++;
          await gate.promise;
        },
        onDelete: () => {
          deletions++;
          return Promise.resolve();
        },
      }),
    );
  });
  await click('Start a new game');
  await fill('confirmation', 'reset');
  assert.equal(resets, 0);
  assert(document.querySelector<HTMLButtonElement>('.danger-button')?.disabled);
  await fill('confirmation', 'RESET');
  await click('Start new game');
  assert.equal(resets, 1);
  assert(document.querySelector<HTMLButtonElement>('.danger-button')?.disabled);
  await ui(() => {
    document
      .querySelector('form')
      ?.dispatchEvent(
        new dom.window.Event('submit', { bubbles: true, cancelable: true }),
      );
  });
  assert.equal(resets, 1);
  await ui(() => {
    gate.resolve();
  });
  await click('Delete account');
  await fill('confirmation', 'DELETE');
  await click('Cancel');
  assert.equal(deletions, 0);
  await click('Delete account');
  await fill('confirmation', 'DELETE');
  await click('Delete permanently');
  assert.equal(deletions, 1);
  await reset();
});

void test('all 20 avatars can be selected without changing provider data', async () => {
  let update: unknown = null;
  const client = {
    auth: {
      updateUser: (value: unknown) => {
        update = value;
        return Promise.resolve({ error: null });
      },
    },
  } as unknown as SupabaseClient<Database>;
  const user = {
    id: 'captain',
    user_metadata: {},
    identities: [],
  } as unknown as User;
  await ui(() => {
    root.render(createElement(AvatarPicker, { client, user }));
  });
  await click('Change photo');
  assert.equal(document.querySelectorAll('.avatar-grid button').length, 20);
  await ui(() => {
    document
      .querySelector<HTMLButtonElement>('button[aria-label="Jellyfish"]')
      ?.click();
  });
  assert.deepEqual(update, {
    data: { abyss_avatar: 'jellyfish', abyss_avatar_url: null },
  });
  assert.equal(document.querySelector('.avatar-grid'), null);
  await click('Change photo');
  await click('Use social photo');
  assert.deepEqual(update, {
    data: { abyss_avatar: 'social', abyss_avatar_url: null },
  });
  await reset();
});

void test('email sign-in sends entered credentials and explains an unconfirmed email', async () => {
  let request: unknown = null;
  const client = {
    auth: {
      signInWithPassword: (value: unknown) => {
        request = value;
        return Promise.resolve({ error: { code: 'email_not_confirmed' } });
      },
    },
  } as unknown as SupabaseClient<Database>;
  await ui(() => {
    root.render(
      createElement(AuthScreen, {
        client,
        recovery: false,
        signedIn: false,
        onGuest: () => {
          assert.fail('Unexpected guest navigation');
        },
        onPasswordUpdated: () => {
          assert.fail('Unexpected password update');
        },
      }),
    );
  });
  await fill('email', 'captain@example.com');
  await fill('password', 'test-password-123');
  await ui(() => {
    document
      .querySelector('form')
      ?.dispatchEvent(
        new dom.window.Event('submit', { bubbles: true, cancelable: true }),
      );
  });
  assert.deepEqual(request, {
    email: 'captain@example.com',
    password: 'test-password-123',
  });
  assert.match(
    document.querySelector('[role="alert"]')?.textContent ?? '',
    /Confirm your email/,
  );
  await reset();
});
void test('password recovery sends only the primary domain callback', async () => {
  let request: unknown = null;
  const client = {
    auth: {
      resetPasswordForEmail: (...args: unknown[]) => {
        request = args;
        return Promise.resolve({ error: null });
      },
    },
  } as unknown as SupabaseClient<Database>;
  await ui(() => {
    root.render(
      createElement(AuthScreen, {
        client,
        recovery: false,
        signedIn: false,
        onGuest: () => {
          assert.fail('Unexpected guest navigation');
        },
        onPasswordUpdated: () => {
          assert.fail('Unexpected password update');
        },
      }),
    );
  });
  await click('Forgot password?');
  await fill('email', 'captain@example.com');
  await click('Send reset link');
  assert.deepEqual(request, [
    'captain@example.com',
    { redirectTo: 'https://abysscorp.us.ci/reset-password' },
  ]);
  assert.match(
    document.querySelector('[role="status"]')?.textContent ?? '',
    /receive a reset link/,
  );
  await reset();
});
void test('password recovery requires matching passwords and updates the authenticated user', async () => {
  let request: unknown = null,
    done = false;
  const client = {
    auth: {
      updateUser: (args: unknown) => {
        request = args;
        return Promise.resolve({ error: null });
      },
    },
  } as unknown as SupabaseClient<Database>;
  await ui(() => {
    root.render(
      createElement(AuthScreen, {
        client,
        recovery: true,
        signedIn: true,
        onGuest: () => {
          assert.fail('Unexpected guest navigation');
        },
        onPasswordUpdated: () => {
          done = true;
        },
      }),
    );
  });
  await fill('password', 'test-password-123');
  await fill('confirmation', 'other-password-123');
  await click('Save password');
  assert.equal(request, null);
  assert.match(
    document.querySelector('[role="alert"]')?.textContent ?? '',
    /Passwords do not match/,
  );
  await fill('confirmation', 'test-password-123');
  await click('Save password');
  assert.deepEqual(request, { password: 'test-password-123' });
  assert.equal(done, true);
  await reset();
});

void test('profile sections keep photo, sign-in and destructive account controls separate', async () => {
  const user = {
    id: 'captain',
    email: 'captain@example.com',
    user_metadata: {},
    identities: [],
  } as unknown as User;
  const client = {
    auth: {
      getUserIdentities: () =>
        Promise.resolve({ data: { identities: [] }, error: null }),
    },
  } as unknown as SupabaseClient<Database>;
  const cloud = { status: 'saved' as const, error: null, syncedAt: null };
  const repository = {
    getSnapshot: () => cloud,
    subscribe: () => () => undefined,
    flush: () => Promise.resolve(),
    takeRemoteUpdate: () => null,
    load: () => Promise.resolve(null),
    save: () => Promise.resolve(),
  };
  const unexpected = () =>
    Promise.reject(new Error('Unexpected account mutation'));
  await ui(() => {
    root.render(
      createElement(AccountPanel, {
        user,
        client,
        currentProvider: 'google',
        captainName: 'Captain',
        onRename: unexpected,
        repository,
        onSave: unexpected,
        onSignOut: unexpected,
        onReset: unexpected,
        onDelete: unexpected,
        isAdmin: false,
      }),
    );
  });
  assert.match(container.textContent, /Change photo/);
  assert(!container.textContent.includes('Delete account'));
  await click('Sign-in');
  assert(document.querySelector('[aria-label="Sign-in methods"]'));
  assert(!container.textContent.includes('Change photo'));
  await click('Account');
  assert.match(container.textContent, /Start a new game/);
  assert.match(container.textContent, /Delete account/);
  await click('Start a new game');
  assert(document.querySelector('.danger-confirm'));
  await click('Profile');
  assert(!document.querySelector('.danger-confirm'));
  assert.match(container.textContent, /Change photo/);
  await reset();
});
