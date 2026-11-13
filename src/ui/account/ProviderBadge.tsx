import type { LoginProvider } from '../../infrastructure/supabase/sessionProvider';
import { providerLabel } from '../../infrastructure/supabase/socialProviders';
import { ProviderIcon } from '../auth/ProviderIcon';
import { useIconAssets } from '../components/iconAssets';
import { RasterIcon } from '../components/RasterIcon';
export function ProviderBadge({ provider }: { provider: LoginProvider }) {
  const base = useIconAssets();
  return (
    <span
      className={`provider-badge provider-${provider.replace('custom:', '')}`}
      title={providerLabel(provider)}
      aria-hidden="true"
    >
      {provider === 'email' && base ? (
        <RasterIcon base={base} name="email" size={20} />
      ) : provider === 'email' ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      ) : (
        <ProviderIcon provider={provider} />
      )}
    </span>
  );
}
