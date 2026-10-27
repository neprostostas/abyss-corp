import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '../../infrastructure/supabase/database.types';
import { PlayerClient } from '../../infrastructure/supabase/PlayerClient';
import { needsCaptainName, requestedCaptainName } from '../../domain/profile';
import { Brand } from '../components/Brand';

export function ProfileGate({
  client,
  user,
  children,
}: {
  client: SupabaseClient<Database>;
  user: User;
  children: (
    name: string,
    rename: (name: string) => Promise<void>,
  ) => ReactNode;
}) {
  const [name, setName] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const isActive = () => active;
    const load = async () => {
      try {
        const { data, error: failure } = await client
          .from('player_progress')
          .select('captain_name')
          .eq('id', user.id)
          .maybeSingle();
        if (failure || !data)
          throw new Error('Could not load your profile. Retry to continue.');
        if (!isActive()) return;
        let chosen = data.captain_name;
        if (
          needsCaptainName(
            chosen,
            user.id,
            user.user_metadata.captain_name_confirmed === true,
          )
        ) {
          const requested = requestedCaptainName(user.user_metadata);
          if (requested) {
            await new PlayerClient(client, user.id).renameCaptain(requested);
            chosen = requested;
          } else chosen = '';
        }
        if (active) {
          setName(chosen);
          setError(null);
        }
      } catch (failure) {
        if (active)
          setError(failure instanceof Error ? failure.message : 'Try again.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [client, user.id, user.user_metadata, retry]);
  const rename = async (value: string) => {
    await new PlayerClient(client, user.id).renameCaptain(value);
    setName(value.trim());
  };
  if (name) return children(name, rename);
  return (
    <main className="account-screen">
      <section className="auth-card">
        <div className="auth-brand">
          <Brand />
        </div>
        <h1>{loading ? 'Getting ready…' : 'Your captain name'}</h1>
        {!loading && name !== null && (
          <>
            <p>Choose how other players see you.</p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (busy) return;
                setBusy(true);
                setError(null);
                void rename(draft)
                  .catch((failure: unknown) => {
                    setError(
                      failure instanceof Error ? failure.message : 'Try again.',
                    );
                  })
                  .finally(() => {
                    setBusy(false);
                  });
              }}
            >
              <label>
                Nickname
                <input
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
              </label>
              <button className="wide-button" disabled={busy}>
                {busy ? 'Saving…' : 'Start playing'}
              </button>
            </form>
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {!loading && name === null && (
          <button
            className="wide-button"
            onClick={() => {
              setLoading(true);
              setRetry((value) => value + 1);
            }}
          >
            Retry
          </button>
        )}
        <div className="auth-links">
          <button
            className="text-button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void client.auth
                .signOut()
                .then(({ error: failure }) => {
                  if (failure) setError(failure.message);
                })
                .catch(() => {
                  setError('Could not sign out. Try again.');
                })
                .finally(() => {
                  setBusy(false);
                });
            }}
          >
            Sign out
          </button>
        </div>
      </section>
    </main>
  );
}
