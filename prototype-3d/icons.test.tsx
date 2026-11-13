import React from 'react';
void React;
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { IconAssetsContext } from '../src/ui/components/iconAssets';
import { GameIcon, type IconName } from '../src/ui/components/GameIcon';
import { ProviderBadge } from '../src/ui/account/ProviderBadge';
import { Brand } from '../src/ui/components/Brand';
import type { LoginProvider } from '../src/infrastructure/supabase/sessionProvider';

const catalog = JSON.parse(
  readFileSync(
    new URL(
      '../visual-development/icon-redesign/v1/catalog.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as { id: string; family: string }[];
test('every approved icon has all three valid WebP sizes', () => {
  for (const { id } of catalog)
    for (const size of [64, 128, 256]) {
      const data = readFileSync(
        new URL(
          `./public/icons/generated-v1/${id}-${size}.webp`,
          import.meta.url,
        ),
      );
      assert.equal(data.toString('ascii', 0, 4), 'RIFF', id);
      assert.equal(data.toString('ascii', 8, 12), 'WEBP', id);
    }
});
test('prototype UI and provider icons resolve to generated files', () => {
  const providers: LoginProvider[] = [
    'email',
    'google',
    'facebook',
    'discord',
    'github',
    'twitch',
    'x',
    'azure',
    'linkedin_oidc',
    'custom:telegram',
    'custom:steam',
  ];
  const html = renderToStaticMarkup(
    <IconAssetsContext.Provider value="/icons/generated-v1">
      <Brand />
      {catalog
        .filter((icon) => icon.family === 'game-ui')
        .map((icon) => (
          <GameIcon key={icon.id} name={icon.id as IconName} />
        ))}
      {providers.map((provider) => (
        <ProviderBadge key={provider} provider={provider} />
      ))}
    </IconAssetsContext.Provider>,
  );
  assert.doesNotMatch(html, /<svg|\.svg/);
  for (const [, path] of html.matchAll(/src="([^"]+)"/g)) {
    assert.ok(existsSync(new URL(`./public${path}`, import.meta.url)), path);
  }
});
test('the normal 2D UI still uses its original SVGs without the prototype provider', () => {
  const html = renderToStaticMarkup(
    <>
      <GameIcon name="coin" />
      <Brand />
      <ProviderBadge provider="email" />
    </>,
  );
  assert.match(html, /<svg/);
  assert.match(html, /abyss-mark\.svg/);
  assert.doesNotMatch(html, /\.webp/);
});
