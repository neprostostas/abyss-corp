import { useRef, useState } from 'react';
import { GameIcon } from '../components/GameIcon';

export function AccountDangerActions({
  onReset,
  onDelete,
}: {
  onReset: () => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [action, setAction] = useState<'reset' | 'delete' | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const word = action === 'delete' ? 'DELETE' : 'RESET';
  return (
    <section className="account-danger" aria-label="Progress and account">
      {!action ? (
        <>
          <button
            className="settings-control"
            onClick={() => {
              setAction('reset');
              setConfirmation('');
            }}
          >
            <GameIcon name="refresh" />
            <span>Start a new game</span>
            <GameIcon name="arrow" />
          </button>
          {onDelete && (
            <button
              className="settings-control danger-link"
              onClick={() => {
                setAction('delete');
                setConfirmation('');
              }}
            >
              <GameIcon name="trash" />
              <span>Delete account</span>
              <GameIcon name="arrow" />
            </button>
          )}
        </>
      ) : (
        <form
          className="danger-confirm"
          onSubmit={(event) => {
            event.preventDefault();
            if (confirmation !== word || running.current) return;
            running.current = true;
            setBusy(true);
            setError(null);
            void (async () => {
              try {
                if (action === 'delete' && onDelete) await onDelete();
                else await onReset();
                setAction(null);
              } catch (failure) {
                setError(
                  failure instanceof Error
                    ? failure.message
                    : 'Could not complete this action. Try again.',
                );
              } finally {
                running.current = false;
                setBusy(false);
              }
            })();
          }}
        >
          <strong>
            {action === 'delete' ? 'Delete your account?' : 'Start from zero?'}
          </strong>
          <p id="danger-description">
            {action === 'delete'
              ? 'Account, progress and uploaded photos will be deleted permanently.'
              : 'Erase all game progress. Keep your profile and sign-in methods.'}
          </p>
          <label htmlFor="danger-confirmation">Type {word} to confirm</label>
          <input
            id="danger-confirmation"
            name="confirmation"
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            placeholder={word}
            aria-describedby="danger-description"
            spellCheck={false}
            value={confirmation}
            disabled={busy}
            onChange={(event) => {
              setConfirmation(event.target.value);
            }}
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="danger-buttons">
            <button
              className="danger-button"
              disabled={busy || confirmation !== word}
            >
              {busy
                ? 'Working…'
                : action === 'delete'
                  ? 'Delete permanently'
                  : 'Start new game'}
            </button>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => {
                setAction(null);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
