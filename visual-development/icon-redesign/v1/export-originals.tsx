import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import type { IconName } from '../../../src/ui/components/GameIcon';
import type { SocialProvider } from '../../../src/infrastructure/supabase/socialProviders';
import type { ResourceDefinition } from '../../../src/data/resources';
import { GameIcon } from '../../../src/ui/components/GameIcon';
import { ProviderIcon } from '../../../src/ui/auth/ProviderIcon';
import { ResourceGlyph } from '../../../src/ui/world/ResourceGlyph';
import { RESOURCES } from '../../../src/data/resources';
const root = new URL('./', import.meta.url);
const catalog = JSON.parse(readFileSync(new URL('catalog.json', root), 'utf8'));
const providers: Record<string, SocialProvider> = {
  google: 'google',
  facebook: 'facebook',
  discord: 'discord',
  github: 'github',
  twitch: 'twitch',
  x: 'x',
  telegram: 'custom:telegram',
  steam: 'custom:steam',
  linkedin: 'linkedin_oidc',
  microsoft: 'azure',
};
for (const { id, family } of catalog) {
  let svg = '';
  if (family === 'game-ui')
    svg = renderToStaticMarkup(<GameIcon name={id as IconName} />);
  else if (id.startsWith('provider-'))
    svg = renderToStaticMarkup(
      <ProviderIcon provider={providers[id.replace('provider-', '')]!} />,
    );
  else if (id.startsWith('resource-')) {
    const resources: Record<string, ResourceDefinition> = {
      'resource-gold': RESOURCES.gold,
      'resource-pearl': RESOURCES.pearls,
      'resource-alloy': RESOURCES.titanium,
      'resource-core': RESOURCES.lumens,
    };
    svg = renderToStaticMarkup(
      <svg viewBox="-24 -24 48 48">
        <ResourceGlyph resource={resources[id]!} x={0} y={0} />
      </svg>,
    );
  } else if (id === 'email')
    svg =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>';
  else if (id === 'brand-abyss') {
    copyFileSync(
      new URL('../../../public/brand/abyss-mark.svg', root),
      new URL('originals/' + id + '.svg', root),
    );
    continue;
  }
  svg = svg
    .replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
    .replaceAll('currentColor', '#b4e6d1');
  writeFileSync(new URL('originals/' + id + '.svg', root), svg);
}
