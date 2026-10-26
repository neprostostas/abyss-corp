import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { GameIcon } from './GameIcon';
import type { IconName } from './GameIcon';
export function GameDialog({
  title,
  context,
  credits,
  navigation,
  icon,
  onClose,
  children,
}: {
  title: string;
  context: string;
  credits: string;
  navigation: ReactNode;
  icon: IconName;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="game-dialog"
      aria-labelledby="game-dialog-title"
      onClose={() => {
        if (!ref.current?.open) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-shell">
        <header className="dialog-heading">
          <span className="dialog-emblem">
            <GameIcon name={icon} />
          </span>
          <div className="dialog-title-block">
            <span className="dialog-context">{context}</span>
            <h2 id="game-dialog-title">{title}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close"
            autoFocus
            onClick={onClose}
          >
            <GameIcon name="close" />
          </button>
        </header>
        {navigation}
        <div className="dialog-content" key={title}>
          {children}
        </div>
        <footer className="dialog-footer">
          <span className="dialog-balance">
            <GameIcon name="coin" />
            <strong>{credits}</strong>
            <small>CR</small>
          </span>
          <button className="return-to-base" onClick={onClose}>
            <span>Return to base</span>
            <kbd>ESC</kbd>
          </button>
        </footer>
      </div>
    </dialog>
  );
}
