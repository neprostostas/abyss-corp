import { Brand } from '../components/Brand';
import { authReturnUrl } from '../../infrastructure/supabase/authRedirect';
import { useEffect, useState } from 'react';
import { normalizeCaptainName } from '../../domain/captainName';
import {
  loadSocialProviders,
  providerScopes,
} from '../../infrastructure/supabase/socialProviders';
import type { SocialProvider } from '../../infrastructure/supabase/socialProviders';
import { SocialSignIn } from './SocialSignIn';
import { GameIcon } from '../components/GameIcon';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../infrastructure/supabase/database.types';

type Mode = 'login' | 'register' | 'forgot' | 'reset';
export function AuthScreen({
  client,
  recovery,
  signedIn,
  onPasswordUpdated,
  onGuest,
}: {
  client: SupabaseClient<Database>;
  recovery: boolean;
  signedIn: boolean;
  onPasswordUpdated: () => void;
  onGuest: () => void;
}) {
  const [mode, setMode] = useState<Mode>(recovery ? 'reset' : 'login');
  const [nickname, setNickname] = useState('');
  const [providers, setProviders] = useState<SocialProvider[]>([]);
  useEffect(() => {
    let active = true;
    void loadSocialProviders()
      .then((value) => {
        if (active) setProviders(value);
      })
      .catch(() => {
        /* Email and guest play remain usable. */
      });
    return () => {
      active = false;
    };
  }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resend, setResend] = useState(false);
  const changeMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword('');
    setConfirmation('');
    setResend(false);
  };
  const submit = async () => {
    if (busy) return;
    setError(null);
    setNotice(null);
    if (
      (mode === 'register' || mode === 'reset') &&
      password !== confirmation
    ) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const address = email.trim();
      if (mode === 'login') {
        const { error: failure } = await client.auth.signInWithPassword({
          email: address,
          password,
        });
        if (failure) {
          setResend(failure.code === 'email_not_confirmed');
          throw new Error(
            failure.code === 'email_not_confirmed'
              ? 'Confirm your email before signing in.'
              : 'Could not sign in. Check your email and password.',
          );
        }
      } else if (mode === 'register') {
        const { error: failure } = await client.auth.signUp({
          email: address,
          password,
          options: {
            emailRedirectTo: authReturnUrl('/'),
            data: { captain_name: normalizeCaptainName(nickname) },
          },
        });
        if (failure) throw failure;
        setNotice('Check your email to confirm your account.');
        setResend(true);
        setPassword('');
        setConfirmation('');
      } else if (mode === 'forgot') {
        const { error: failure } = await client.auth.resetPasswordForEmail(
          address,
          {
            redirectTo: authReturnUrl('/reset-password'),
          },
        );
        if (failure) throw failure;
        setNotice('If an account exists, you’ll receive a reset link.');
      } else {
        if (!signedIn)
          throw new Error(
            'Open the password reset link from your email first.',
          );
        const { error: failure } = await client.auth.updateUser({ password });
        if (failure) throw failure;
        onPasswordUpdated();
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Connection failed. Try again.',
      );
    } finally {
      setBusy(false);
    }
  };
  const socialSignIn = async (provider: SocialProvider) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const scopes = providerScopes(provider);
      const { error: failure } = await client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: authReturnUrl('/'),
          ...(scopes ? { scopes } : {}),
        },
      });
      if (failure) throw failure;
    } catch {
      setError('Could not connect. Try again or use email.');
    } finally {
      setBusy(false);
    }
  };
  const resendConfirmation = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error: failure } = await client.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: authReturnUrl('/') },
      });
      if (failure) throw failure;
      setNotice('Confirmation email requested. Check your inbox.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };
  const title = {
    login: 'Welcome back',
    register: 'Join the expedition',
    forgot: 'Forgot password?',
    reset: 'New password',
  }[mode];
  const action = {
    login: 'Sign in',
    register: 'Create account',
    forgot: 'Send reset link',
    reset: 'Save password',
  }[mode];
  return (
    <main className="account-screen">
      <section className="auth-card" aria-labelledby="auth-title">
        <a href="/" className="auth-brand">
          <Brand />
        </a>
        <h1 id="auth-title">{title}</h1>
        {(mode === 'login' || mode === 'register') && (
          <>
            <button className="quick-play" disabled={busy} onClick={onGuest}>
              <GameIcon name="transport" />
              <span>
                <strong>Quick play</strong>
                <small>No account needed</small>
              </span>
              <GameIcon name="arrow" />
            </button>
            <SocialSignIn
              providers={providers}
              busy={busy}
              onSignIn={(provider) => {
                void socialSignIn(provider);
              }}
            />
            <div className="auth-divider">
              <span>or with email</span>
            </div>
          </>
        )}
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const fields = Array.from(event.currentTarget.elements).filter(
              (field): field is HTMLInputElement =>
                field instanceof HTMLInputElement,
            );
            const invalid = fields.find((field) => !field.validity.valid);
            if (invalid) {
              setError(
                invalid.validity.valueMissing
                  ? `Enter your ${invalid.name === 'confirmation' ? 'password confirmation' : invalid.name}.`
                  : invalid.type === 'email'
                    ? 'Enter a valid email.'
                    : 'Use at least 10 characters.',
              );
              invalid.focus();
              return;
            }
            void submit();
          }}
        >
          {mode === 'register' && (
            <label>
              Nickname
              <input
                name="nickname"
                autoComplete="nickname"
                required
                maxLength={48}
                value={nickname}
                disabled={busy}
                onChange={(event) => {
                  setNickname(event.target.value);
                }}
              />
              <small>3–24 characters · shown to other players</small>
            </label>
          )}
          {mode !== 'reset' && (
            <label>
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
                disabled={busy}
              />
            </label>
          )}
          {mode !== 'forgot' && (
            <label>
              Password
              <input
                type="password"
                name="password"
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                required
                minLength={mode === 'login' ? 1 : 10}
                maxLength={128}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
                disabled={busy}
              />
              {mode !== 'login' && <small>At least 10 characters</small>}
            </label>
          )}
          {(mode === 'register' || mode === 'reset') && (
            <label>
              Confirm password
              <input
                type="password"
                name="confirmation"
                autoComplete="new-password"
                required
                minLength={10}
                maxLength={128}
                value={confirmation}
                onChange={(event) => {
                  setConfirmation(event.target.value);
                }}
                disabled={busy}
              />
            </label>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="form-notice" role="status">
              {notice}
            </p>
          )}
          <button
            type="submit"
            className="wide-button"
            disabled={busy || (mode === 'reset' && !signedIn)}
          >
            {busy ? 'Please wait…' : action}
          </button>
        </form>
        <div className="auth-links">
          {mode === 'login' && (
            <>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => {
                  changeMode('forgot');
                }}
              >
                Forgot password?
              </button>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => {
                  changeMode('register');
                }}
              >
                Create account
              </button>
            </>
          )}
          {mode !== 'login' && (
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                if (mode === 'reset') onPasswordUpdated();
                else changeMode('login');
              }}
            >
              {mode === 'reset' && signedIn
                ? 'Back to game'
                : 'Back to sign in'}
            </button>
          )}
          {resend && (
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                void resendConfirmation();
              }}
            >
              Resend confirmation
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
