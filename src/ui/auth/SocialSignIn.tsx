import { PROVIDER_LABELS } from '../../infrastructure/supabase/socialProviders';
import type { SocialProvider } from '../../infrastructure/supabase/socialProviders';
import { ProviderIcon } from './ProviderIcon';
import { GameIcon } from '../components/GameIcon';

export function SocialSignIn({
  providers,
  busy,
  onSignIn,
}: {
  providers: readonly SocialProvider[];
  busy: boolean;
  onSignIn: (provider: SocialProvider) => void;
}) {
  const [primary, ...others] = providers;
  if (!primary) return null;
  const button = (provider: SocialProvider, prominent = false) => (
    <button
      key={provider}
      type="button"
      disabled={busy}
      className={prominent ? 'provider-primary' : undefined}
      onClick={() => {
        onSignIn(provider);
      }}
      aria-label={`Continue with ${PROVIDER_LABELS[provider]}`}
    >
      <ProviderIcon provider={provider} />
      <span>
        {prominent
          ? `Continue with ${PROVIDER_LABELS[provider]}`
          : PROVIDER_LABELS[provider]}
      </span>
    </button>
  );
  return (
    <div className="social-signin" aria-label="Continue with">
      {button(primary, true)}
      {others.length > 0 && (
        <details className="provider-options">
          <summary>
            More sign-in options
            <GameIcon name="arrow" />
          </summary>
          <div className="provider-grid">
            {others.map((provider) => button(provider))}
          </div>
        </details>
      )}
    </div>
  );
}
