import { AvatarPicker } from './AvatarPicker';
import { AccountDangerActions } from './AccountDangerActions';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../infrastructure/supabase/database.types';
import type { LoginProvider } from '../../infrastructure/supabase/sessionProvider';
import { ConnectedAccounts } from './ConnectedAccounts';
import type { User } from '@supabase/supabase-js';
import { accountProfileDetails } from '../../domain/profile';
import { ProfileAvatar } from './ProfileAvatar';
import { visitorAnalytics } from '../../infrastructure/analytics/VisitorAnalytics';
import { useState, useSyncExternalStore } from 'react';
import type { AccountSaveRepository } from '../../application/accountPorts';
import { GameIcon } from '../components/GameIcon';

export function AccountPanel({
  user,
  client,
  currentProvider,
  captainName,
  onRename,
  repository,
  onSave,
  onSignOut,
  onReset,
  onDelete,
  isAdmin,
}: {
  user: User;
  client: SupabaseClient<Database>;
  currentProvider: LoginProvider | null;
  captainName: string;
  onRename: (name: string) => Promise<void>;
  isAdmin: boolean;
  repository: AccountSaveRepository;
  onSave: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onReset: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const details = accountProfileDetails(user, currentProvider);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(captainName);
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
        <ProfileAvatar name={captainName} url={details.avatar} />
        <div className="profile-identity">
          <strong>{captainName}</strong>
          {details.fullName && <span>{details.fullName}</span>}
          {user.email && <small>{user.email}</small>}
        </div>
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
      <AvatarPicker user={user} client={client} />
      {editing ? (
        <form
          className="profile-edit"
          onSubmit={(event) => {
            event.preventDefault();
            if (busy) return;
            void run(async () => {
              await onRename(draft);
              setEditing(false);
            });
          }}
        >
          <label htmlFor="profile-nickname">Nickname</label>
          <input
            id="profile-nickname"
            autoComplete="nickname"
            required
            maxLength={48}
            value={draft}
            disabled={busy}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
          />
          <small>3–24 characters</small>
          <div>
            <button disabled={busy}>Save</button>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => {
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          className="profile-rename"
          onClick={() => {
            setDraft(captainName);
            setEditing(true);
          }}
        >
          <GameIcon name="profile" />
          Edit nickname
          <GameIcon name="arrow" />
        </button>
      )}
      {failed && (
        <p className="form-error" role="alert">
          {failed}
        </p>
      )}
      <ConnectedAccounts
        client={client}
        user={user}
        current={currentProvider}
        onSave={onSave}
      />
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
      <AccountDangerActions onReset={onReset} onDelete={onDelete} />
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
