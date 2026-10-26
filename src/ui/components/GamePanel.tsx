import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { GameIcon } from './GameIcon';
import type { IconName } from './GameIcon';

/** A non-modal equipment drawer: the base and its controls stay interactive. */
export function GamePanel({
  title,
  context,
  icon,
  onClose,
  children,
}: {
  title: string;
  context: string;
  icon: IconName;
  onClose: () => void;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeRef.current?.focus();
    const panel = panelRef.current;
    return () => {
      if (
        opener.current?.isConnected &&
        (document.activeElement === document.body ||
          (document.activeElement && panel?.contains(document.activeElement)))
      ) {
        opener.current.focus();
      }
    };
  }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('keydown', escape);
    };
  }, [onClose]);
  return (
    <aside ref={panelRef} className="game-panel" aria-labelledby="panel-title">
      <header className="panel-heading">
        <GameIcon name={icon} />
        <div>
          <small>{context}</small>
          <h2 id="panel-title">{title}</h2>
        </div>
        <button
          ref={closeRef}
          className="icon-button"
          aria-label="Close panel"
          title="Close · Esc"
          onClick={onClose}
        >
          <GameIcon name="close" />
        </button>
      </header>
      <div className="panel-content" key={title}>
        {children}
      </div>
    </aside>
  );
}
