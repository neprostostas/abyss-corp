import { visitorAnalytics } from '../../infrastructure/analytics/VisitorAnalytics';
import { useState, useSyncExternalStore } from 'react';
import type { AccountSaveRepository } from '../../application/accountPorts';
export function AccountPanel({
  email,
  repository,
  onSave,
  onSignOut,
  onImport,
  isAdmin,
}: {
  email: string;
  isAdmin: boolean;
  repository: AccountSaveRepository;
  onSave: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onImport: (() => Promise<void>) | null;
}) {
  const cloud = useSyncExternalStore(
    repository.subscribe,
    repository.getSnapshot,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const labels = {
    loading: 'Loading…',
    saved: 'Saved to account',
    pending: 'Saved on device · syncing soon',
    syncing: 'Syncing…',
    error: 'Sync paused',
  };
  return (
    <section className="account-settings">
      <div className="account-identity">
        <small>Signed in as</small>
        <strong>{email}</strong>
      </div>
      <p className={`sync-status sync-${cloud.status}`} role="status">
        {labels[cloud.status]}
      </p>
      {(error ?? cloud.error) && (
        <p className="form-error" role="alert">
          {error ?? cloud.error}
        </p>
      )}
      <button
        className="wide-button"
        disabled={busy || cloud.status === 'syncing'}
        onClick={() => {
          void run(onSave);
        }}
      >
        Save now
      </button>
      {onImport && (
        <button
          className="text-button"
          disabled={busy}
          onClick={() => {
            void run(onImport);
          }}
        >
          Import previous device progress
        </button>
      )}
      <div className="account-links">
        <a href="/reset-password">Change password</a>
        <button
          className="text-button"
          onClick={visitorAnalytics.openPreferences}
        >
          Cookies
        </button>
        {isAdmin && (
          <>
            <a href="/database">Database</a>
            <a href="/analytics">Analytics</a>
          </>
        )}
        <button
          className="text-button"
          disabled={busy}
          onClick={() => {
            void run(onSignOut);
          }}
        >
          Sign out
        </button>
      </div>
    </section>
  );
}
