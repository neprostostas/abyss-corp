import { useSyncExternalStore } from 'react';
import type { SaveSync } from '../../application/SaveSync';
import { GameIcon } from '../components/GameIcon';
const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'short',
  timeStyle: 'short',
});
export function ServerSavePanel({ sync }: { sync: SaveSync }) {
  const state = useSyncExternalStore(sync.subscribe, sync.getSnapshot);
  return (
    <section className="settings-section">
      <div className="setting-row">
        <span>
          <GameIcon name="cloud" />
          Server backup
        </span>
        <button
          disabled={state.status === 'syncing'}
          onClick={() => {
            void sync.sync();
          }}
        >
          {state.status === 'syncing' ? 'Syncing…' : 'Sync'}
        </button>
      </div>
      {state.lastSyncedAt && (
        <small>Last synced {dateFormat.format(state.lastSyncedAt)}</small>
      )}
      {state.error && (
        <p role="alert" className="compact-error">
          {state.error}
        </p>
      )}
      {state.status === 'conflict' && state.remote && (
        <div className="sync-conflict">
          <strong>Choose a save</strong>
          <p>
            Server: {state.remote.save.world.credits.toLocaleString()} CR ·{' '}
            {dateFormat.format(state.remote.updatedAt)}
          </p>
          <p>Restoring keeps a recovery copy of this device’s progress.</p>
          <div className="button-row">
            <button
              onClick={() => {
                void sync.keepLocal();
              }}
            >
              Keep this device
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                void sync.useServer();
              }}
            >
              Use server
            </button>
          </div>
        </div>
      )}
      <details>
        <summary>About backups</summary>
        <p>
          Local progress autosaves. Sync uploads a server copy. Guest access
          belongs to this browser and expires after 30 days; clearing cookies
          loses that profile. Account recovery is not available yet.
        </p>
      </details>
    </section>
  );
}
