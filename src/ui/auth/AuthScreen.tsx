import { authReturnUrl } from '../../infrastructure/supabase/authRedirect';
import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../infrastructure/supabase/database.types';

type Mode = 'login' | 'register' | 'forgot' | 'reset';
export function AuthScreen({
  client,
  recovery,
  signedIn,
  onPasswordUpdated,
}: {
  client: SupabaseClient<Database>;
  recovery: boolean;
  signedIn: boolean;
  onPasswordUpdated: () => void;
}) {
  const [mode, setMode] = useState<Mode>(recovery ? 'reset' : 'login');
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
          options: { emailRedirectTo: authReturnUrl('/') },
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
          <img src="/brand/abyss-emblem.png" alt="" width="64" height="64" />
          <span>
            ABYSS <small>CORP</small>
          </span>
        </a>
        <h1 id="auth-title">{title}</h1>
        {mode === 'login' && <p>Your ocean. Your progress.</p>}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
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
