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
  const [providers, setProviders] = useState<SocialProvider[]>([]);
  const [busy, setBusy] = useState<LoginProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');
  useEffect(() => {
    let active = true;
    void loadSocialProviders()
      .then((list) => {
        if (active) setProviders(list);
      })
      .catch(() => {
        if (active)
          setError(
            'Could not load sign-in options. Reopen your profile to retry.',
          );
      });
    void client.auth
      .getUserIdentities()
      .then(({ data, error: failure }) => {
        if (active) {
          if (failure) setError('Could not refresh connected accounts.');
          else setIdentities(data.identities);
        }
      })
      .catch(() => {
        if (active) setError('Could not refresh connected accounts.');
      });
    return () => {
      active = false;
    };
  }, [client, user]);
  const connected = new Set(identities.map((identity) => identity.provider));
  const methods: LoginProvider[] = [
    ...new Set<LoginProvider>([
      ...providers,
      ...identities
        .map((i) => i.provider)
        .filter((p): p is SocialProvider =>
          SOCIAL_PROVIDERS.includes(p as SocialProvider),
        ),
      'email',
    ]),
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
          {(active || linked || value === 'email') && (
            <small>
              {active
                ? 'Current session'
                : linked
                  ? 'Connected'
                  : value === 'email'
                    ? 'Email & password'
                    : ''}
            </small>
          )}
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
  return (
    <section className="connected-accounts" aria-label="Sign-in methods">
      <div className="connections-heading">
        <h3>Sign-in methods</h3>
      </div>
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
              Connect another account <GameIcon name="arrow" />
            </summary>
            {methods.filter((value) => !isLinked(value)).map(row)}
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
