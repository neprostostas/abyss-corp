import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '../src/infrastructure/supabase/database.types';
import { AuthScreen } from '../src/ui/auth/AuthScreen';
import { ProfileGate } from '../src/ui/account/ProfileGate';
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
