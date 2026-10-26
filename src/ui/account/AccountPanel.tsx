import { visitorAnalytics } from '../../infrastructure/analytics/VisitorAnalytics';
import { useState, useSyncExternalStore } from 'react';
import type { AccountSaveRepository } from '../../application/accountPorts';
import { GameIcon } from '../components/GameIcon';

export function AccountPanel({
  email,
  repository,
  onSave,
  onSignOut,
  isAdmin,
}: {
  email: string;
  isAdmin: boolean;
  repository: AccountSaveRepository;
  onSave: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const cloud = useSyncExternalStore(
    repository.subscribe,
    repository.getSnapshot,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const syncing =
    busy || cloud.status === 'syncing' || cloud.status === 'loading';
  const failed = error ?? cloud.error;
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="account-settings" aria-label="Account settings">
      <div className="account-summary" aria-busy={syncing}>
        <span className="account-avatar">
          <GameIcon name="profile" />
        </span>
        <strong>{email}</strong>
        <button
          className={`account-sync${failed ? ' sync-failed' : ''}`}
          aria-label={failed ? 'Retry sync' : 'Sync progress'}
          disabled={syncing}
          onClick={() => {
            void run(onSave);
          }}
        >
          {syncing ? (
            <span className="mini-loader" aria-hidden="true" />
          ) : (
            <GameIcon name={failed ? 'refresh' : 'cloud'} />
          )}
        </button>
      </div>
      {failed && (
        <p className="form-error" role="alert">
          {failed}
        </p>
      )}
      <nav className="settings-actions" aria-label="Account">
        <a href="/reset-password">
          <GameIcon name="lock" />
          <span>Change password</span>
          <GameIcon name="arrow" />
        </a>
        <button onClick={visitorAnalytics.openPreferences}>
          <GameIcon name="cookie" />
          <span>Cookies</span>
          <GameIcon name="arrow" />
        </button>
      </nav>
      {isAdmin && (
        <nav className="settings-actions admin-actions" aria-label="Admin">
          <a href="/database">
            <GameIcon name="database" />
            <span>Database</span>
            <GameIcon name="arrow" />
          </a>
          <a href="/analytics">
            <GameIcon name="analytics" />
            <span>Analytics</span>
            <GameIcon name="arrow" />
          </a>
        </nav>
      )}
      <button
        className="settings-signout"
        disabled={busy}
        onClick={() => {
          void run(onSignOut);
        }}
      >
        <GameIcon name="logout" />
        <span>Sign out</span>
      </button>
    </section>
  );
}
