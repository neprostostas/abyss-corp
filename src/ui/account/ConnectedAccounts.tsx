import { linkAccountIdentity } from '../../infrastructure/supabase/linkAccountIdentity';
import { useEffect, useState } from 'react';
import type { SupabaseClient, User, UserIdentity } from '@supabase/supabase-js';
import type { Database } from '../../infrastructure/supabase/database.types';
import {
  loadSocialProviders,
  SOCIAL_PROVIDERS,
} from '../../infrastructure/supabase/socialProviders';
import type { SocialProvider } from '../../infrastructure/supabase/socialProviders';
import type { LoginProvider } from '../../infrastructure/supabase/sessionProvider';
import { authReturnUrl } from '../../infrastructure/supabase/authRedirect';
import { ProviderBadge } from './ProviderBadge';
import { providerLabel } from '../../infrastructure/supabase/socialProviders';
import { GameIcon } from '../components/GameIcon';

export function ConnectedAccounts({
  client,
  user,
  current,
  onSave,
}: {
  client: SupabaseClient<Database>;
  user: User;
  current: LoginProvider | null;
  onSave: () => Promise<void>;
}) {
  const [identities, setIdentities] = useState<UserIdentity[]>(
    user.identities ?? [],
  );
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<SocialProvider[]>([]);
  const [busy, setBusy] = useState<LoginProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');
  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      loadSocialProviders(),
      client.auth.getUserIdentities(),
    ]).then(([available, accounts]) => {
      if (!active) return;
      if (available.status === 'fulfilled') setProviders(available.value);
      if (accounts.status === 'fulfilled' && !accounts.value.error) {
        setIdentities(accounts.value.data.identities);
      }
      if (
        available.status === 'rejected' ||
        accounts.status === 'rejected' ||
        accounts.value.error
      ) {
        setError(
          'Could not refresh sign-in methods. Reopen this section to retry.',
        );
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [client]);
  const connected = new Set(identities.map((identity) => identity.provider));
  const methods: LoginProvider[] = [
    ...SOCIAL_PROVIDERS.filter(
      (value) => providers.includes(value) || connected.has(value),
    ),
    'email',
  ];
  const emailConnected = connected.has('email') && !!user.email_confirmed_at;
  const link = async (value: SocialProvider) => {
    if (busy) return;
    setBusy(value);
    setError(null);
    setNotice(null);
    try {
      await linkAccountIdentity(client, value, onSave);
    } catch (failure) {
      setError(
        failure instanceof Error && failure.name !== 'AuthApiError'
          ? failure.message
          : 'Could not connect this account. It may already belong to another player.',
      );
    } finally {
      setBusy(null);
    }
  };
  const row = (value: LoginProvider) => {
    const linked = value === 'email' ? emailConnected : connected.has(value);
    const active = value === current;
    return (
      <div
        className={`connection-row${linked ? ' is-connected' : ''}`}
        key={value}
      >
        <ProviderBadge provider={value} />
        <div className="connection-name">
          <strong>{providerLabel(value)}</strong>
          {active && <small>Current</small>}
        </div>
        {linked ? (
          <span
            className="connection-check"
            aria-label={`${providerLabel(value)} connected`}
          >
            <GameIcon name="check" />
          </span>
        ) : (
          <button
            className="connection-connect"
            disabled={busy !== null}
            onClick={() => {
              if (value === 'email') setEmailOpen(!emailOpen);
              else void link(value);
            }}
            aria-label={`Connect ${providerLabel(value)}`}
          >
            {busy === value ? 'Connecting…' : 'Connect'}
          </button>
        )}
      </div>
    );
  };
  const isLinked = (value: LoginProvider) =>
    value === 'email' ? emailConnected : connected.has(value);
  if (loading)
    return (
      <section
        className="connected-accounts connection-loading"
        aria-label="Sign-in methods"
        aria-busy="true"
      >
        <span className="sr-only" role="status">
          Loading sign-in methods…
        </span>
        <div aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </section>
    );
  return (
    <section className="connected-accounts" aria-label="Sign-in methods">
      <div className="connection-list">
        {methods.filter(isLinked).map(row)}
        {methods.some((value) => !isLinked(value)) && (
          <details
            className="connection-options"
            onToggle={(event) => {
              if (!event.currentTarget.open) setEmailOpen(false);
            }}
          >
            <summary>
              Add sign-in method <GameIcon name="arrow" />
            </summary>
            <div className="connection-available">
              {methods.filter((value) => !isLinked(value)).map(row)}
            </div>
          </details>
        )}
      </div>
      {emailOpen && !emailConnected && (
        <form
          className="connection-email"
          onSubmit={(event) => {
            event.preventDefault();
            if (busy) return;
            setBusy('email');
            setError(null);
            void client.auth
              .updateUser(
                { email: email.trim() },
                { emailRedirectTo: authReturnUrl('/') },
              )
              .then(({ error: failure }) => {
                if (failure) throw failure;
                setNotice(
                  'Confirm the link in your email. Then use Change password to set your password.',
                );
                setEmailOpen(false);
              })
              .catch(() => {
                setError(
                  'Could not add this email. It may already belong to another account.',
                );
              })
              .finally(() => {
                setBusy(null);
              });
          }}
        >
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              disabled={busy !== null}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
            />
          </label>
          <button disabled={busy !== null}>
            {busy === 'email' ? 'Sending…' : 'Send confirmation'}
          </button>
        </form>
      )}
      {notice && (
        <p className="connection-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
