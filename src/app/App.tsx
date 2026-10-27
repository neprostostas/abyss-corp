import { sessionProvider } from '../infrastructure/supabase/sessionProvider';
import type { LoginProvider } from '../infrastructure/supabase/sessionProvider';
import { accountProfileDetails } from '../domain/profile';
import { ProfileAvatar } from '../ui/account/ProfileAvatar';
import { ProviderBadge } from '../ui/account/ProviderBadge';
import { GuestGame } from './GuestGame';
import { GuestSaveRepository } from '../infrastructure/persistence/GuestSaveRepository';
import { ProfileGate } from '../ui/account/ProfileGate';
import { AdminAnalyticsClient } from '../infrastructure/analytics/AdminAnalyticsClient';
import { CookieConsent } from '../ui/analytics/CookieConsent';
import { PrivacyScreen } from '../ui/analytics/PrivacyScreen';
import { AnalyticsScreen } from '../ui/analytics/AnalyticsScreen';
import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '../infrastructure/supabase/database.types';
import { AccountSaveRepository } from '../infrastructure/supabase/AccountSaveRepository';
import { browserClock } from '../infrastructure/clock/browserClock';
import { GameSession } from '../application/GameSession';
import { AuthScreen } from '../ui/auth/AuthScreen';
import { PlayerClient } from '../infrastructure/supabase/PlayerClient';
import { AdminDatabaseClient } from '../infrastructure/supabase/AdminDatabaseClient';
import { LeaderboardPanel } from '../ui/players/LeaderboardPanel';
import { AccountPanel } from '../ui/account/AccountPanel';

const GameScreen = lazy(async () => {
  const module = await import('../ui/screens/GameScreen');
  return { default: module.GameScreen };
});
const DatabaseScreen = lazy(async () => {
  const module = await import('../ui/account/DatabaseScreen');
  return { default: module.DatabaseScreen };
});
const loadingScreen = (
  <main className="account-screen">
    <p role="status">Loading…</p>
  </main>
);

function AccountGame({
  client,
  user,
  captainName,
  onRename,
  loginProvider,
}: {
  client: SupabaseClient<Database>;
  user: User;
  captainName: string;
  loginProvider: LoginProvider | null;
  onRename: (name: string) => Promise<void>;
}) {
  const [runtime] = useState(() => {
    const repository = new AccountSaveRepository(
      client,
      user.id,
      () => window.localStorage,
      () => new GuestSaveRepository(() => window.localStorage).claim(user.id),
    );
    const session = new GameSession(repository, browserClock);
    repository.subscribe(() => {
      const update = repository.takeRemoteUpdate();
      if (update) session.adoptCloudSave(update);
    });
    return {
      repository,
      session,
      synchronize: async () => {
        await session.save(true);
        if (session.getSnapshot().saveStatus === 'error')
          throw new Error('Device save failed. Keep this tab open and retry.');
        await repository.flush();
        if (repository.getSnapshot().status === 'error')
          throw new Error(
            repository.getSnapshot().error ?? 'Cloud save failed.',
          );
      },
      players: new PlayerClient(client, user.id),
    };
  });
  const { session, repository } = runtime;
  const cloud = useSyncExternalStore(
    repository.subscribe,
    repository.getSnapshot,
  );
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let active = true;
    void client.rpc('is_database_admin').then(({ data, error }) => {
      if (active) setIsAdmin(!error && data);
    });
    return () => {
      active = false;
    };
  }, [client]);
  useEffect(() => {
    const sync = () => {
      void repository.flush();
    };
    const interval = window.setInterval(sync, 15000);
    const visibility = () => {
      if (document.hidden) sync();
    };
    window.addEventListener('online', sync);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', sync);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [repository]);
  const save = runtime.synchronize;
  const account = (
    <AccountPanel
      isAdmin={isAdmin}
      client={client}
      currentProvider={loginProvider}
      user={user}
      captainName={captainName}
      onRename={onRename}
      repository={repository}
      onSave={save}
      onSignOut={async () => {
        session.setActive(false);
        let signedOut = false;
        try {
          await save();
          if (repository.getSnapshot().status === 'pending')
            await repository.flush();
          if (repository.getSnapshot().status === 'error')
            throw new Error('Sync failed. Retry before signing out.');
          const { error } = await client.auth.signOut();
          if (error) throw error;
          signedOut = true;
        } finally {
          if (!signedOut) session.setActive(!document.hidden);
        }
      }}
    />
  );
  return (
    <Suspense fallback={loadingScreen}>
      <GameScreen
        session={session}
        accountPanel={account}
        profileTrigger={
          <span className="profile-trigger-avatar">
            <ProfileAvatar
              name={captainName}
              url={accountProfileDetails(user, loginProvider).avatar}
            />
            {loginProvider && <ProviderBadge provider={loginProvider} />}
          </span>
        }
        cloud={cloud}
        leaderboardPanel={
          <LeaderboardPanel
            gateway={{
              loadLeaderboard: (page) => runtime.players.loadLeaderboard(page),
              renameCaptain: onRename,
            }}
            synchronize={runtime.synchronize}
          />
        }
      />
    </Suspense>
  );
}

function AppContent({ client }: { client: SupabaseClient<Database> | null }) {
  const [analyticsClient] = useState(() =>
    client ? new AdminAnalyticsClient(client) : null,
  );
  const [adminClient] = useState(() =>
    client ? new AdminDatabaseClient(client) : null,
  );
  const [guest, setGuest] = useState(() => {
    try {
      return window.sessionStorage.getItem('abyss-corp.play-mode') === 'guest';
    } catch {
      return false;
    }
  });
  const changeGuest = (value: boolean) => {
    setGuest(value);
    try {
      if (value) window.sessionStorage.setItem('abyss-corp.play-mode', 'guest');
      else window.sessionStorage.removeItem('abyss-corp.play-mode');
    } catch {
      /* GameSession reports unavailable persistent storage. */
    }
  };
  const [user, setUser] = useState<User | null>(null);
  const [loginProvider, setLoginProvider] = useState<LoginProvider | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(() =>
    new URLSearchParams(window.location.hash.slice(1)).has('error_description')
      ? 'The sign-in link failed or expired. Please try again.'
      : null,
  );
  const [recovery, setRecovery] = useState(
    window.location.pathname === '/reset-password',
  );
  useEffect(() => {
    if (!client) return;
    let live = true;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (!live) return;
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      setUser(session?.user ?? null);
      setLoginProvider(session ? sessionProvider(session) : null);
      if (session?.user) {
        setGuest(false);
        try {
          window.sessionStorage.removeItem('abyss-corp.play-mode');
        } catch {
          /* Session can still continue. */
        }
      }
      setLoading(false);
    });
    void client.auth
      .getSession()
      .then(({ error: failure }) => {
        if (live && failure) {
          setError('Could not restore your sign-in. Refresh to retry.');
          setLoading(false);
        }
      })
      .catch(() => {
        if (live) {
          setError('Connection failed. Refresh to retry.');
          setLoading(false);
        }
      });
    const parameters = new URLSearchParams(window.location.hash.slice(1));
    const callbackError = parameters.get('error_description');
    if (callbackError) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    return () => {
      live = false;
      subscription.unsubscribe();
    };
  }, [client]);
  if (guest && !user && !recovery)
    return (
      <GuestGame
        onSignIn={() => {
          changeGuest(false);
        }}
      />
    );
  if (!client)
    return (
      <main className="account-screen">
        <section className="auth-card">
          <h1>Dive into Abyss Corp</h1>
          <button
            className="wide-button"
            onClick={() => {
              changeGuest(true);
            }}
          >
            Quick play
          </button>
          <p>
            Account sign-in is temporarily unavailable. You can still play on
            this device.
          </p>
        </section>
      </main>
    );
  if (loading)
    return (
      <main className="account-screen">
        <p role="status">Connecting…</p>
      </main>
    );
  if (!user || recovery)
    return (
      <>
        {error && (
          <div className="auth-banner" role="alert">
            {error}
          </div>
        )}
        <AuthScreen
          key={recovery ? 'recovery' : 'auth'}
          client={client}
          recovery={recovery}
          signedIn={user !== null}
          onGuest={() => {
            changeGuest(true);
          }}
          onPasswordUpdated={() => {
            setRecovery(false);
            setError(null);
            window.history.replaceState(null, '', '/');
          }}
        />
      </>
    );
  if (window.location.pathname === '/analytics' && analyticsClient)
    return <AnalyticsScreen gateway={analyticsClient} />;
  if (window.location.pathname === '/database' && adminClient)
    return (
      <Suspense fallback={loadingScreen}>
        <DatabaseScreen gateway={adminClient} />
      </Suspense>
    );
  return (
    <>
      {error && (
        <div className="auth-banner" role="alert">
          {error}
          <button
            className="text-button"
            onClick={() => {
              setError(null);
            }}
          >
            Dismiss
          </button>
        </div>
      )}
      <ProfileGate key={user.id} client={client} user={user}>
        {(captainName, onRename) => (
          <AccountGame
            client={client}
            user={user}
            loginProvider={loginProvider}
            captainName={captainName}
            onRename={onRename}
          />
        )}
      </ProfileGate>
    </>
  );
}

export function App({ client }: { client: SupabaseClient<Database> | null }) {
  return (
    <>
      {window.location.pathname === '/privacy' ? (
        <PrivacyScreen />
      ) : (
        <AppContent client={client} />
      )}
      <CookieConsent />
    </>
  );
}
