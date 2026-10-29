import { useEffect, useEffectEvent, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { LAYER_IDS } from '../../data/layers';
import type { LayerId } from '../../data/layers';
import type { WorldState } from '../../domain/world';
import type { GameSession } from '../../application/GameSession';
import { SURFACE_TRAVEL_MS } from './useGameDrawer';

export function useDepthNavigation({
  drawer,
  world,
  session,
  previewDepth,
  setPreviewDepth,
  surfaceReady,
}: {
  drawer: {
    name: string | null;
    close: () => void;
    toggle: (name: 'ocean') => void;
  };
  world: WorldState;
  session: GameSession;
  previewDepth: LayerId | null;
  setPreviewDepth: Dispatch<SetStateAction<LayerId | null>>;
  surfaceReady: boolean;
}) {
  const navigationGesture = useRef({ last: 0, accumulated: 0, wheelTime: 0 });
  const touchGesture = useRef<{
    x: number;
    y: number;
    target: EventTarget | null;
    scrollTop: number;
  } | null>(null);
  const handlers = () => {
    const gesture = navigationGesture.current;
    const navigate = (direction: number) => {
      if (drawer.name && drawer.name !== 'ocean') return;
      if (
        Date.now() - gesture.last <
        (drawer.name === 'ocean' ? SURFACE_TRAVEL_MS : 900)
      )
        return;
      if (drawer.name === 'ocean' && !surfaceReady) return;
      gesture.last = Date.now();
      if (drawer.name === 'ocean') {
        if (direction > 0) drawer.close();
        return;
      }
      const index = LAYER_IDS.indexOf(previewDepth ?? world.selectedLayerId);
      if (direction < 0 && index === 0) {
        drawer.toggle('ocean');
        return;
      }
      const next = LAYER_IDS[index + direction];
      if (next) {
        if (world.layers[next]) {
          setPreviewDepth(null);
          session.select(next);
        } else setPreviewDepth(next);
      }
    };
    const ignored = (target: EventTarget | null) =>
      target instanceof Element &&
      !!target.closest(
        'input,textarea,select,[contenteditable],.game-panel:not(.ocean-surface),.depth-island',
      );
    const wheel = (event: WheelEvent) => {
      if (
        event.ctrlKey ||
        ignored(event.target) ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
      )
        return;
      // A depth gesture must not also scroll the locked scene or its parent.
      const lockedFrame =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('.locked-depth-frame')
          : null;
      if (
        lockedFrame &&
        lockedFrame.scrollHeight > lockedFrame.clientHeight + 1
      ) {
        const canScroll =
          event.deltaY > 0
            ? lockedFrame.scrollTop + lockedFrame.clientHeight <
              lockedFrame.scrollHeight - 1
            : lockedFrame.scrollTop > 0;
        if (canScroll) return;
      }
      if (previewDepth) event.preventDefault();
      if (
        Date.now() - gesture.wheelTime > 180 ||
        Math.sign(event.deltaY) !== Math.sign(gesture.accumulated)
      )
        gesture.accumulated = 0;
      gesture.wheelTime = Date.now();
      gesture.accumulated += event.deltaY * (event.deltaMode === 1 ? 16 : 1);
      if (Math.abs(gesture.accumulated) < 100) return;
      navigate(gesture.accumulated > 0 ? 1 : -1);
      gesture.accumulated = 0;
    };
    const key = (event: KeyboardEvent) => {
      const editing =
        event.target instanceof Element &&
        !!event.target.closest('input,textarea,select,[contenteditable]');
      if (
        editing ||
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.repeat
      )
        return;
      if (drawer.name && drawer.name !== 'ocean') return;
      if (
        event.target instanceof Element &&
        event.target.closest('.depth-island')
      )
        return;
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      navigate(event.key === 'ArrowDown' ? 1 : -1);
    };
    const touchStart = (event: TouchEvent) => {
      const point = event.touches[0];
      const target = event.target;
      const interactive =
        target instanceof Element &&
        target.closest(
          'button:not(.surface-region),a,input,textarea,select,.game-panel:not(.ocean-surface),.depth-island,.game-dock,.upgrade-deck,.game-hud',
        );
      touchGesture.current =
        point && event.touches.length === 1 && !interactive
          ? {
              x: point.clientX,
              y: point.clientY,
              target,
              scrollTop:
                target instanceof Element
                  ? (target.closest<HTMLElement>(
                      '.locked-depth-frame,.ocean-world',
                    )?.scrollTop ?? 0)
                  : 0,
            }
          : null;
    };
    const touchEnd = (event: TouchEvent) => {
      const start = touchGesture.current;
      touchGesture.current = null;
      const point = event.changedTouches[0];
      if (!start || !point || event.touches.length) return;
      const dy = start.y - point.clientY;
      const dx = start.x - point.clientX;
      if (Math.abs(dy) < 55 || Math.abs(dy) < Math.abs(dx) * 1.4) return;
      const frame =
        start.target instanceof Element
          ? start.target.closest<HTMLElement>(
              '.locked-depth-frame,.ocean-world',
            )
          : null;
      if (frame && frame.scrollHeight > frame.clientHeight + 2) {
        const max = frame.scrollHeight - frame.clientHeight;
        const atStartEdge =
          dy < 0 ? start.scrollTop <= 1 : start.scrollTop >= max - 1;
        if (!atStartEdge || Math.abs(frame.scrollTop - start.scrollTop) > 2)
          return;
      }
      if (event.cancelable) event.preventDefault();
      navigate(dy > 0 ? 1 : -1);
    };

    return { wheel, key, touchStart, touchEnd };
  };
  const wheel = useEffectEvent((event: WheelEvent) => {
    handlers().wheel(event);
  });
  const key = useEffectEvent((event: KeyboardEvent) => {
    handlers().key(event);
  });
  const touchStart = useEffectEvent((event: TouchEvent) => {
    handlers().touchStart(event);
  });
  const touchEnd = useEffectEvent((event: TouchEvent) => {
    handlers().touchEnd(event);
  });
  useEffect(() => {
    const touchCancel = () => {
      touchGesture.current = null;
    };
    const onWheel = (event: WheelEvent) => {
      wheel(event);
    };
    const onKey = (event: KeyboardEvent) => {
      key(event);
    };
    const onStart = (event: TouchEvent) => {
      touchStart(event);
    };
    const onEnd = (event: TouchEvent) => {
      touchEnd(event);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: false });
    window.addEventListener('touchcancel', touchCancel);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', touchCancel);
    };
  }, []);
}
