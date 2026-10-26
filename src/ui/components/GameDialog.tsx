import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { GameIcon } from './GameIcon';
import type { IconName } from './GameIcon';
export function GameDialog({
  title,
  icon,
  onClose,
  children,
}: {
  title: string;
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
          <h2 id="game-dialog-title">{title}</h2>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <GameIcon name="close" />
          </button>
        </header>
        <div className="dialog-content">{children}</div>
      </div>
    </dialog>
  );
}
