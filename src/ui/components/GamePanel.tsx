import { useSurfaceReady } from '../hooks/useSurfaceReady';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { GameIcon } from './GameIcon';
import type { IconName } from './GameIcon';

/** Equipment drawer with outside-click dismissal; Ocean remains a separate surface. */
export function GamePanel({
  title,
  open,
  context,
  icon,
  onClose,
  children,
  headerAction,
  profile = false,
  surface = false,
}: {
  title: string;
  open: boolean;
  context: string;
  icon: IconName;
  onClose: () => void;
  children: ReactNode;
  headerAction?: ReactNode;
  profile?: boolean;
  surface?: boolean;
}) {
  const surfaceReady = useSurfaceReady(open && surface, surface);
  const interactive = open && (!surface || surfaceReady);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
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
    if (!interactive) return;
    const target = surface ? panelRef.current : closeRef.current;
    target?.focus({ preventScroll: true });
  }, [interactive, surface]);
  useEffect(() => {
    const content = panelRef.current?.querySelector('.panel-content');
    if (content) content.scrollTop = 0;
  }, [title]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (
        open &&
        event.key === 'Escape' &&
        !event.defaultPrevented &&
        !event.isComposing
      )
        onClose();
    };
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('keydown', escape);
    };
  }, [onClose, open]);
  useEffect(() => {
    if (!open || surface) return;
    const outside = (event: MouseEvent) => {
      const target = event.target;
      if (
        !(target instanceof window.Element) ||
        panelRef.current?.contains(target)
      )
        return;
      // Navigation buttons already switch or close drawers themselves.
      if (target.closest('.dock-button, .settings-trigger, .ocean-entry'))
        return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('click', outside, true);
    return () => {
      document.removeEventListener('click', outside, true);
    };
  }, [open, surface, onClose]);
  return (
    <>
      {open && !surface && (
        <div className="game-panel-backdrop" aria-hidden="true" />
      )}
      <aside
        ref={panelRef}
        tabIndex={surface ? -1 : undefined}
        className={`game-panel${profile ? ' game-panel-profile' : ''}${surface ? ' ocean-surface' : ''}`}
        aria-label={surface ? title : undefined}
        aria-labelledby={surface ? undefined : 'panel-title'}
        aria-hidden={!open}
        inert={!interactive}
      >
        {!surface && (
          <header className="panel-heading">
            <GameIcon name={icon} />
            <div>
              <small>{context}</small>
              <h2 id="panel-title">{title}</h2>
            </div>
            {headerAction}
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
        )}
        <div className="panel-content" key={title}>
          {children}
        </div>
      </aside>
    </>
  );
}
