import { AccountDangerActions } from '../ui/account/AccountDangerActions';
import { createWorld } from '../domain/world';
import { lazy, Suspense, useState } from 'react';
import { GameSession } from '../application/GameSession';
import { GuestSaveRepository } from '../infrastructure/persistence/GuestSaveRepository';
import { browserClock } from '../infrastructure/clock/browserClock';
import { GameIcon } from '../ui/components/GameIcon';
const GameScreen = lazy(async () => ({
  default: (await import('../ui/screens/GameScreen')).GameScreen,
}));
export function GuestGame({ onSignIn }: { onSignIn: () => void }) {
  const [runtime] = useState(() => {
    const repository = new GuestSaveRepository(() => window.localStorage);
    return { repository, session: new GameSession(repository, browserClock) };
  });
  const { session, repository } = runtime;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signIn = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    session.setActive(false);
    await session.save(true);
    if (session.getSnapshot().saveStatus === 'error') {
      setError('Could not save on this device. Keep this tab open and retry.');
      session.setActive(!document.hidden);
      setBusy(false);
      return;
    }
    onSignIn();
  };
  const invitation = (
    <section className="guest-profile">
      <span className="account-avatar">
        <GameIcon name="profile" />
      </span>
      <h2>Guest captain</h2>
      <p>Progress saved on this device.</p>
      <button
        className="wide-button"
        disabled={busy}
        onClick={() => {
          void signIn();
        }}
      >
        Save to an account
      </button>
      <small>
        New account? Take your guest progress with you. Existing account? Resume
        its cloud save.
      </small>
      <AccountDangerActions
        onReset={async () => {
          await session.lock();
          try {
            const fresh = {
              version: 8 as const,
              savedAt: browserClock.timestamp(),
              world: createWorld(),
            };
            await repository.reset(fresh);
            session.adoptCloudSave(fresh);
          } finally {
            session.unlockAfterAccountChange();
            session.setActive(!document.hidden);
          }
        }}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
  return (
    <Suspense
      fallback={
        <main className="account-screen">
          <p role="status">Diving in…</p>
        </main>
      }
    >
      <GameScreen
        session={session}
        accountPanel={invitation}
        leaderboardPanel={invitation}
        cloud={{ status: 'saved', error: null, syncedAt: null }}
      />
    </Suspense>
  );
}
