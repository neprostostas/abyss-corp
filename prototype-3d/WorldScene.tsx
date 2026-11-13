import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import type { DepthScene } from '../src/ui/world/DepthScene';
import {
  getPhaseDuration,
  getProcessingDuration,
  getStorageCapacity,
} from '../src/domain/game';
import { GameIcon } from '../src/ui/components/GameIcon';
import { UPGRADE_IDS } from '../src/data/balance';

type Props = ComponentProps<typeof DepthScene> & {
  guideTarget?: string | null;
  onGuideAnchor?: (anchor: { x: number; y: number; visible: boolean }) => void;
  onAnchor?: (anchor: { x: number; y: number; visible: boolean }) => void;
  onDeselect?: () => void;
};
export function WorldScene(props: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const current = useRef(props);
  current.current = props;
  const [ready, setReady] = useState(false);
  const [help, setHelp] = useState(false);
  const held = useRef(new Set<string>());
  const send = useCallback((data: object) => {
    frame.current?.contentWindow?.postMessage(
      { source: 'abyss-game', ...data },
      location.origin,
    );
  }, []);
  const sync = useCallback(() => {
    const p = current.current;
    send({
      type: 'state',
      depth: p.layerId,
      game: p.game,
      phaseDuration: getPhaseDuration(p.game, p.config),
      processingDuration: getProcessingDuration(p.game, p.config),
      capacity: getStorageCapacity(p.game, p.config),
      started: p.running,
    });
    send({ type: 'select', id: p.selected });
    send({ type: 'guide', id: p.guideTarget ?? null });
  }, [send]);
  useEffect(() => {
    const receive = (e: MessageEvent) => {
      if (
        e.origin !== location.origin ||
        e.source !== frame.current?.contentWindow ||
        e.data?.source !== 'abyss-3d'
      )
        return;
      if (e.data.type === 'ready') {
        setReady(true);
        sync();
      }
      if (e.data.type === 'anchor') current.current.onAnchor?.(e.data);
      if (e.data.type === 'guide-anchor')
        current.current.onGuideAnchor?.(e.data);
      if (e.data.type === 'deselect') current.current.onDeselect?.();
      if (e.data.type === 'select' && UPGRADE_IDS.includes(e.data.id))
        current.current.onSelect(e.data.id);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [sync]);
  useEffect(() => {
    if (ready) sync();
  }, [
    props.game,
    props.selected,
    props.config,
    props.running,
    props.guideTarget,
    ready,
    sync,
  ]);
  useEffect(() => {
    const valid = new Set([
      'w',
      'a',
      's',
      'd',
      'arrowup',
      'arrowdown',
      'arrowleft',
      'arrowright',
      'q',
      'e',
      'r',
      '+',
      '=',
      '-',
    ]);
    const clear = () => {
      held.current.clear();
      send({ type: 'keys', keys: [] });
    };
    const keydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest('input,textarea,select,[contenteditable=true]') ||
        document.querySelector('.game-panel:not([inert])')
      )
        return;
      const key = e.key.toLowerCase();
      if (!valid.has(key) || e.altKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      held.current.add(key);
      send({ type: 'keys', keys: [...held.current] });
    };
    const keyup = (e: KeyboardEvent) => {
      held.current.delete(e.key.toLowerCase());
      send({ type: 'keys', keys: [...held.current] });
    };
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', clear);
    return () => {
      clear();
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', clear);
    };
  }, [send]);
  return (
    <div className="prototype-world">
      <iframe
        ref={frame}
        title="Interactive 3D outpost"
        src="/prototype-3d-scene/index.html"
        onLoad={() => send({ type: 'ping' })}
      />
      {!ready && (
        <div className="prototype-loading" role="status">
          Diving in…
        </div>
      )}
      {!['shallows', 'golden-trench'].includes(
        props.viewedLayerId ?? props.layerId,
      ) && (
        <div className="prototype-biome-note">
          {props.layerId} · temporary shallow-water model
        </div>
      )}
      <div className="prototype-camera-tools">
        <button
          className="icon-button"
          aria-label="Reset 3D camera"
          title="Reset camera · R"
          onClick={() => send({ type: 'home' })}
        >
          <GameIcon name="map" />
        </button>
        <button
          className="icon-button"
          aria-label="3D camera controls"
          aria-expanded={help}
          onClick={() => setHelp(!help)}
        >
          <GameIcon name="settings" />
        </button>
      </div>
      {help && (
        <div className="prototype-controls-help">
          Drag to orbit · two fingers to pan/zoom
          <br />
          WASD / arrows to move · Q/E to rotate
          <br />+ / − to zoom · R to return to base
        </div>
      )}
      <div className="prototype-touch-pad" aria-label="Move 3D camera">
        {(['up', 'left', 'down', 'right'] as const).map((direction) => (
          <button
            key={direction}
            className={`icon-button move-${direction}`}
            aria-label={`Move camera ${direction}`}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              send({
                type: 'keys',
                keys: [
                  { up: 'w', left: 'a', down: 's', right: 'd' }[direction],
                ],
              });
            }}
            onPointerUp={() => send({ type: 'keys', keys: [] })}
            onPointerCancel={() => send({ type: 'keys', keys: [] })}
            onLostPointerCapture={() => send({ type: 'keys', keys: [] })}
          >
            <GameIcon name="arrow" />
          </button>
        ))}
      </div>
      {props.lockedScene && (
        <div className="prototype-locked-scene">{props.lockedScene}</div>
      )}
    </div>
  );
}
