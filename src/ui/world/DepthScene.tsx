import { useLayoutEffect, useRef, useState } from 'react';
import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import type { LayerId } from '../../data/layers';
import { LAYERS, LAYER_IDS } from '../../data/layers';
import { OutpostIllustration } from './OutpostIllustration';

type Props = ComponentProps<typeof OutpostIllustration> & {
  viewedLayerId?: LayerId;
  lockedScene?: ReactNode;
};
export function DepthScene(props: Props) {
  const sceneRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const scene = sceneRef.current;
    const shell = scene?.closest('.game-shell');
    const footer = shell?.querySelector('.game-dock');
    if (!scene || !shell || !footer) return;
    const update = () => {
      const bounds = scene.getBoundingClientRect();
      scene.style.setProperty(
        '--scene-footer-clip',
        `${String(bounds.bottom - footer.getBoundingClientRect().top)}px`,
      );
    };
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(scene);
    observer.observe(footer);
    observer.observe(shell);
    shell.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    update();
    return () => {
      observer.disconnect();
      shell.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);
  const [previous, setPrevious] = useState(props);
  const [departure, setDeparture] = useState<Props | null>(null);
  const [direction, setDirection] = useState(1);
  const [trip, setTrip] = useState(0);
  if (previous !== props) {
    setPrevious(props);
    if (
      (previous.viewedLayerId ?? previous.layerId) !==
      (props.viewedLayerId ?? props.layerId)
    ) {
      setDeparture(previous);
      setDirection(
        LAYER_IDS.indexOf(props.viewedLayerId ?? props.layerId) >
          LAYER_IDS.indexOf(previous.viewedLayerId ?? previous.layerId)
          ? 1
          : -1,
      );
      setTrip(trip + 1);
    }
  }
  return (
    <div
      ref={sceneRef}
      className="depth-scene"
      style={{ '--depth-direction': direction } as CSSProperties}
    >
      {departure && (
        <div
          key={`out-${trip}`}
          className="depth-scene-frame departing"
          inert
          aria-hidden="true"
        >
          {departure.lockedScene ?? (
            <OutpostIllustration {...departure} running={false} />
          )}
        </div>
      )}
      <div
        key={trip}
        className={`depth-scene-frame${departure ? ' arriving' : ''}`}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setDeparture(null);
        }}
      >
        {props.lockedScene ?? <OutpostIllustration {...props} />}
      </div>
      <DepthIdentity {...props} />
    </div>
  );
}

function DepthIdentity(props: Props) {
  const viewed = props.viewedLayerId ?? props.layerId;
  const layer = LAYERS[viewed];
  const number = String(LAYER_IDS.indexOf(viewed) + 1).padStart(2, '0');
  return (
    <header
      className="depth-identity"
      aria-label={`Depth ${number}: ${layer.name}`}
    >
      <span className="depth-identity-number" aria-hidden="true">
        {number}
      </span>
      <div className="depth-identity-copy">
        <h1>{layer.name}</h1>
      </div>
    </header>
  );
}
