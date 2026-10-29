import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ResourceGlyph } from '../world/ResourceGlyph';
import { LAYERS, LAYER_IDS } from '../../data/layers';
import type { LayerId } from '../../data/layers';
import { getUnlockOffer } from '../../domain/world';
import type { WorldState } from '../../domain/world';
import { GameIcon } from '../components/GameIcon';
const compactCredits = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
export const DepthNavigation = memo(
  function DepthNavigation({
    world,
    onSelect,
    onUnlock,
    onPreview,
    viewedDepth = world.selectedLayerId,
  }: {
    world: WorldState;
    onSelect: (id: LayerId) => void;
    onUnlock: (id: LayerId) => void;
    onPreview?: (id: LayerId) => void;
    viewedDepth?: LayerId;
  }) {
    const [expanded, setExpanded] = useState(false);
    const [hovered, setHovered] = useState(false);
    const open = expanded || hovered;
    const available = LAYER_IDS.filter(
      (id) => getUnlockOffer(world, id).canUnlock,
    ).length;
    const currentIndex = LAYER_IDS.indexOf(viewedDepth);
    const firstVisibleIndex = Math.min(currentIndex, LAYER_IDS.length - 3);
    const navRef = useRef<HTMLElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
      if (!open || !listRef.current) return;
      const list = listRef.current;
      const align = () => {
        const node = list.children[firstVisibleIndex] as
          HTMLElement | undefined;
        if (node) list.scrollTop = node.offsetTop;
      };
      align();
      const observer =
        typeof ResizeObserver === 'undefined'
          ? null
          : new ResizeObserver(align);
      observer?.observe(list);
      return () => {
        observer?.disconnect();
      };
    }, [open, firstVisibleIndex, viewedDepth]);
    useEffect(() => {
      if (!open) return;
      const outside = (event: PointerEvent) => {
        if (
          event.target instanceof window.Node &&
          !navRef.current?.contains(event.target)
        ) {
          setExpanded(false);
          setHovered(false);
        }
      };
      document.addEventListener('pointerdown', outside);
      return () => {
        document.removeEventListener('pointerdown', outside);
      };
    }, [open]);
    return (
      <nav
        ref={navRef}
        className={`depth-rail depth-island${open ? ' is-expanded' : ''}`}
        aria-label="Depths"
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setHovered(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== 'mouse') return;
          setHovered(false);
          setExpanded(false);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setExpanded(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setExpanded(false);
            setHovered(false);
            toggleRef.current?.focus({ preventScroll: true });
            event.stopPropagation();
          }
        }}
      >
        <button
          ref={toggleRef}
          className="depth-island-toggle"
          aria-label={
            available
              ? `Explore depths, ${String(available)} available to unlock`
              : 'Explore depths'
          }
          aria-expanded={open}
          aria-controls="depth-island-list"
          onClick={() => {
            setExpanded(!expanded);
            setHovered(false);
          }}
        >
          <GameIcon name="depth" />
          <b>
            {LAYERS[viewedDepth].depthMeters}
            <small>m</small>
          </b>
          <span
            className={`island-grip${available ? ' has-depths' : ''}`}
            aria-hidden="true"
          />
          {!!available && (
            <span className="island-available" aria-hidden="true">
              +{available}
            </span>
          )}
        </button>
        <div
          className="depth-island-list"
          id="depth-island-list"
          ref={listRef}
          onWheel={(event) => {
            event.stopPropagation();
          }}
          inert={!open}
          aria-hidden={!open}
        >
          {LAYER_IDS.map((id) => {
            const index = LAYER_IDS.indexOf(id);
            const layer = LAYERS[id];
            const offer = getUnlockOffer(world, id);
            const selected = id === viewedDepth;
            return (
              <button
                key={id}
                className={`depth-node depth-${String(index)}${selected ? ' selected' : ''}${offer.canUnlock ? ' can-unlock' : ''}${offer.unlocked ? ' unlocked' : ' locked'}`}
                onClick={() => {
                  if (selected) {
                    toggleRef.current?.focus({ preventScroll: true });
                    setExpanded(false);
                    setHovered(false);
                  } else if (offer.unlocked) onSelect(id);
                  else if (offer.canUnlock) onUnlock(id);
                  else onPreview?.(id);
                }}
                disabled={!offer.unlocked && !offer.canUnlock && !onPreview}
                aria-label={
                  offer.unlocked
                    ? layer.name
                    : `Unlock ${layer.name}, ${String(offer.cost)} credits`
                }
                aria-current={selected ? 'location' : undefined}
                title={
                  offer.unlocked
                    ? layer.name
                    : `${layer.name} · ${String(offer.cost)} CR${offer.prerequisiteMet ? '' : ' · unlock previous depth first'}`
                }
              >
                <span className="depth-orb">
                  {offer.canUnlock && (
                    <span
                      className="depth-ready"
                      aria-label="New depth available"
                    >
                      !
                    </span>
                  )}
                  {offer.unlocked ? (
                    <svg
                      className="depth-resource"
                      viewBox="-24 -24 48 48"
                      aria-hidden="true"
                    >
                      <ResourceGlyph
                        resource={layer.production.resource}
                        x={0}
                        y={0}
                        scale={1}
                      />
                    </svg>
                  ) : (
                    <GameIcon name="lock" />
                  )}
                </span>
                <b>
                  {layer.depthMeters}
                  <small>m</small>
                </b>
                {!offer.unlocked && (
                  <span className="depth-price">
                    <GameIcon name="coin" />
                    {compactCredits.format(offer.cost)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    );
  },
  (before, after) =>
    before.viewedDepth === after.viewedDepth &&
    before.world.selectedLayerId === after.world.selectedLayerId &&
    before.onSelect === after.onSelect &&
    before.onUnlock === after.onUnlock &&
    before.onPreview === after.onPreview &&
    LAYER_IDS.every((id) => {
      const a = getUnlockOffer(before.world, id),
        b = getUnlockOffer(after.world, id);
      return (
        a.unlocked === b.unlocked &&
        a.canUnlock === b.canUnlock &&
        a.cost === b.cost &&
        a.prerequisiteMet === b.prerequisiteMet
      );
    }),
);
