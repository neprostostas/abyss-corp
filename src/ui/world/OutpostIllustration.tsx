import { useSubmarineMotion } from './useSubmarineMotion';
import { UpgradeReveal } from './UpgradeReveal';
import type { KeyboardEvent } from 'react';
import { getProductionSummary, getProcessingDuration } from '../../domain/game';
import type { GameState, Phase, UpgradeId } from '../../domain/game';
import { LAYERS } from '../../data/layers';
import type { LayerId, ProductionConfig } from '../../data/layers';
import {
  CrystalCluster,
  MiningRig,
  Reef,
  RefineryModel,
  SubmarineModel,
  WarehouseModel,
} from './WorldModels';

export function OutpostIllustration({
  phase,
  progress,
  running,
  game,
  layerId,
  config,
  selected,
  bottleneck,
  onSelect,
}: {
  phase: Phase;
  progress: number;
  running: boolean;
  game: GameState;
  layerId: LayerId;
  config: ProductionConfig;
  selected: UpgradeId | null;
  bottleneck: UpgradeId | null;
  onSelect: (id: UpgradeId) => void;
}) {
  const layer = LAYERS[layerId];
  const resource = config.resource;
  const production = getProductionSummary(game, config);
  const refining =
    running &&
    game.processingElapsedMs !== null &&
    !production.processorBlocked;
  const submarineRef = useSubmarineMotion(phase, progress, running, layerId);
  const activation = (id: UpgradeId) => (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(id);
    }
  };
  const hit = (id: UpgradeId, name: string) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': `${name}, level ${game.levels[id]}${bottleneck === id ? ', production bottleneck' : ''}`,
    onClick: () => {
      onSelect(id);
    },
    onKeyDown: activation(id),
    className: `world-object${selected === id ? ' selected' : ''}${bottleneck === id ? ' production-limit' : ''}`,
  });
  const processFraction =
    game.processingElapsedMs === null
      ? 0
      : game.processingElapsedMs / getProcessingDuration(game, config);
  return (
    <svg
      className="outpost-illustration"
      viewBox="0 0 1200 780"
      role="group"
      aria-label={`${layer.name} underwater outpost`}
    >
      <defs>
        <linearGradient id="shell" x2=".7" y2="1">
          <stop stopColor="#fffeed" />
          <stop offset=".5" stopColor="#e9f0dc" />
          <stop offset="1" stopColor="#abc6bd" />
        </linearGradient>
        <linearGradient id="glass-dome" x1="0" y1="0" x2=".8" y2="1">
          <stop stopColor="#a8fff1" />
          <stop offset=".35" stopColor="#42c5c4" />
          <stop offset="1" stopColor="#147b91" />
        </linearGradient>
        <linearGradient id="sub-shell" x2=".2" y2="1">
          <stop stopColor="#ffe89a" />
          <stop offset=".55" stopColor="#fbc457" />
          <stop offset="1" stopColor="#dda23f" />
        </linearGradient>
        <linearGradient id="rock-front" x2=".3" y2="1">
          <stop stopColor="#285c67" />
          <stop offset="1" stopColor="#103b4d" />
        </linearGradient>
        <linearGradient id="rock-top" x2="1" y2="1">
          <stop stopColor="#568c85" />
          <stop offset="1" stopColor="#2b666d" />
        </linearGradient>
        <radialGradient id="mineral-glow">
          <stop stopColor={resource.color} stopOpacity=".4" />
          <stop offset="1" stopColor={resource.color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="beam" x2=".5" y2="1">
          <stop stopColor="#c7fff0" stopOpacity=".15" />
          <stop offset="1" stopColor="#c7fff0" stopOpacity="0" />
        </linearGradient>
        <filter id="object-shadow" x="-50%" y="-50%" width="200%" height="220%">
          <feDropShadow
            dx="0"
            dy="8"
            stdDeviation="6"
            floodColor="#032c3c"
            floodOpacity=".3"
          />
        </filter>
      </defs>
      <g className="sun-rays" fill="url(#beam)">
        <path d="M270-50h90l140 790H-10Z" />
        <path d="M580-50h45l360 790H380Z" />
        <path d="M910-50h35l340 790H780Z" />
      </g>
      <g opacity=".21" fill="#0b3b52">
        <path d="M0 385 90 303 144 325 187 440 245 462 293 659H0Z" />
        <path d="M1200 298 1102 256 1067 327 1002 345 974 483 907 519 855 722H1200Z" />
        <path d="m190 514 86-69 105 26 22 139 94 50H100Z" />
        <path d="M630 596 700 443 759 427 810 478 866 640Z" />
      </g>
      {layer.visual.formation === 'cavern' && (
        <g fill="#101f3f" opacity=".6">
          <path d="M0 0H1200V100l-73-25-72 70-89-103-121 65-87-78-127 50-65-38-114 83-72-90-129 39L160 30 0 128Z" />
        </g>
      )}
      <g className="fish-school" fill="#b3efda" opacity=".4">
        {(
          [
            [160, 230, 1],
            [190, 245, 0.75],
            [218, 222, 0.8],
            [220, 265, 0.55],
            [900, 205, 0.8],
            [926, 220, 0.6],
            [950, 202, 0.7],
          ] as const
        ).map(([fx, fy, size], i) => (
          <path
            key={i}
            transform={`translate(${fx} ${fy}) scale(${size})`}
            d="M0 0q13-12 26 0-13 12-26 0m24 0 10-8v16Z"
          />
        ))}
      </g>
      <g className="jellyfish" transform="translate(1020 292)" opacity=".7">
        <path d="M-24 0q0-36 24-36T24 0Z" fill="#d3bee8" />
        <path
          d="M-14 2q-10 22 0 32m14-32q12 28 0 45M14 2q-7 20 2 31"
          fill="none"
          stroke="#dcc6ef"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M-13-15q8-15 16-13"
          fill="none"
          stroke="#fff"
          strokeWidth="4"
          opacity=".6"
        />
      </g>
      <g
        className="ambient-bubbles"
        fill="none"
        stroke="#b6f9e7"
        strokeWidth="2"
        opacity=".35"
      >
        {[
          [190, 390, 5],
          [205, 354, 3],
          [500, 220, 4],
          [520, 182, 2],
          [954, 440, 5],
          [973, 400, 3],
          [443, 490, 3],
          [100, 170, 3],
        ].map(([bx, by, r], i) => (
          <circle key={i} cx={bx} cy={by} r={r} />
        ))}
      </g>
      <g opacity=".3" fill="#7ac3b3">
        {Array.from({ length: 22 }, (_, i) => (
          <circle
            key={i}
            cx={(i * 173 + 80) % 1150}
            cy={150 + ((i * 83) % 520)}
            r={i % 3 === 0 ? 2 : 1}
          />
        ))}
      </g>
      <ellipse
        cx="590"
        cy="625"
        rx="470"
        ry="107"
        fill="#062b3d"
        opacity=".24"
      />
      <path
        d="m138 574 113-42 111 23 88-50 140 42 94-68 160 32 147 80-40 91-131 13-91 64-147-27-92 29-122-59-99 4Z"
        fill="url(#rock-front)"
      />
      <path
        d="m138 574 113-42 111 23 88-50 140 42 94-68 160 32 147 80-150 48-148-30-132 32-113-41-104 24Z"
        fill="url(#rock-top)"
      />
      <path
        d="m138 574 106 50 104-24 113 41 132-32 148 30 150-48"
        fill="none"
        stroke="#78a591"
        strokeWidth="8"
        opacity=".5"
      />
      <path
        d="m244 624 14 57 61-5 29-76m113 41 28 91 104-44v-79m148 30 10 56 60-48m-113 48-9 64"
        fill="none"
        stroke="#0e3446"
        strokeWidth="7"
        opacity=".4"
      />
      <path
        d="m290 560 96-24 115 23 121-31 148 32 103-17"
        fill="none"
        stroke="#184b5d"
        strokeWidth="24"
        strokeLinecap="round"
      />
      <path
        d="m290 560 96-24 115 23 121-31 148 32 103-17"
        fill="none"
        stroke="#75a5a4"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <path
        d="m290 560 96-24 115 23 121-31 148 32 103-17"
        fill="none"
        stroke="#accbc0"
        strokeWidth="3"
      />
      <Reef x={168} y={583} color="#e3888c" scale={0.9} />
      <Reef x={957} y={590} color={layer.visual.coral} scale={0.9} flip />
      <g stroke="#3aa898" fill="none" strokeLinecap="round">
        <path
          d="M203 564q-33-45-20-76m29 81q28-43 8-67m701 43q-10-50 15-72"
          strokeWidth="11"
        />
        <path d="M193 563q-10-22-34-34m769 24q18-26 35-27" strokeWidth="8" />
      </g>
      <ellipse cx="290" cy="536" rx="118" ry="90" fill="url(#mineral-glow)" />
      <g filter="url(#object-shadow)">
        {resource.shape === 'pearl' ? (
          <g fill={resource.color} stroke="#d2a6df" strokeWidth="2">
            <path d="M237 543q-2-45 46-29 47-18 44 29l-43 22Z" fill="#9867aa" />
            <circle cx="281" cy="531" r="25" />
            <circle cx="270" cy="522" r="7" fill="#fff9f9" stroke="none" />
            <circle cx="314" cy="553" r="11" />
            <circle cx="245" cy="552" r="12" />
          </g>
        ) : (
          <CrystalCluster color={resource.color} x={280} y={550} scale={0.88} />
        )}
        <g
          transform="translate(338 510)"
          {...hit('mining', 'Extraction drill')}
        >
          <ellipse className="selection-ring" cy="2" rx="92" ry="31" />
          <UpgradeReveal
            key={`${layerId}-mining`}
            level={game.levels.mining}
            width={190}
            height={155}
          >
            {(level) => (
              <MiningRig level={level} active={running && phase === 'mining'} />
            )}
          </UpgradeReveal>
          <g className="model-level" transform="translate(-20 -164)">
            <rect x="-26" y="-14" width="52" height="25" rx="9" />
            <text textAnchor="middle" y="3">
              LV {game.levels.mining}
            </text>
          </g>
        </g>
        <g transform="translate(693 485)" {...hit('processing', 'Refinery')}>
          <ellipse className="selection-ring" cy="24" rx="126" ry="45" />
          <UpgradeReveal
            key={`${layerId}-processing`}
            level={game.levels.processing}
            width={250}
            height={235}
          >
            {(level) => (
              <RefineryModel
                level={level}
                active={refining}
                blocked={production.processorBlocked}
              />
            )}
          </UpgradeReveal>
          <g className="model-level" transform="translate(0 -251)">
            <rect x="-26" y="-14" width="52" height="25" rx="9" />
            <text textAnchor="middle" y="3">
              LV {game.levels.processing}
            </text>
          </g>
          <rect
            x="-42"
            y="58"
            width="84"
            height="6"
            rx="3"
            fill="#124352"
            stroke="none"
          />
          <rect
            x="-42"
            y="58"
            width={84 * processFraction}
            height="6"
            rx="3"
            fill={resource.color}
            stroke="none"
          />
        </g>
        <g transform="translate(899 546)" {...hit('storage', 'Warehouse')}>
          <ellipse className="selection-ring" cy="20" rx="91" ry="34" />
          <UpgradeReveal
            key={`${layerId}-storage`}
            level={game.levels.storage}
            width={175}
            height={180}
          >
            {(level) => (
              <WarehouseModel
                level={level}
                fraction={game.refined / production.capacity}
                color={resource.color}
              />
            )}
          </UpgradeReveal>
          <g
            className="model-level"
            transform={`translate(6 ${game.levels.storage >= 5 ? -205 : game.levels.storage >= 4 ? -153 : game.levels.storage >= 3 ? -141 : -126})`}
          >
            <rect x="-26" y="-14" width="52" height="25" rx="9" />
            <text textAnchor="middle" y="3">
              LV {game.levels.storage}
            </text>
          </g>
        </g>
      </g>
      <path
        d="M370 400Q500 310 655 365"
        className={`sub-route${running ? ' active' : ''}`}
      />
      <g
        ref={submarineRef}
        transform="translate(370 400)"
        {...hit('transport', 'Submarine')}
      >
        <ellipse className="selection-ring" cy="20" rx="86" ry="33" />
        <g className={running ? 'sub-idle' : undefined}>
          <UpgradeReveal
            key={`${layerId}-transport`}
            level={game.levels.transport}
            width={180}
            height={60}
          >
            {(level) => (
              <SubmarineModel
                level={level}
                facingLeft={phase === 'returning'}
                loaded={phase === 'delivering'}
                color={resource.color}
              />
            )}
          </UpgradeReveal>
        </g>
      </g>
      {running && phase === 'mining' && (
        <g className="mining-sparks" fill={resource.color}>
          <path d="m380 505 4-8 3 8-3 8Z" />
          <circle cx="364" cy="519" r="3" />
          <circle cx="397" cy="515" r="4" />
        </g>
      )}
      <g opacity=".9">
        <Reef x={85} y={737} color="#6377a0" scale={1.5} />
        <Reef x={1107} y={744} color="#647a9d" scale={1.5} flip />
        <Reef x={181} y={744} color="#358e88" scale={0.65} />
        <Reef x={1006} y={745} color="#3b9290" scale={0.8} />
      </g>
      <path
        d="M0 743q145-53 265-5t235 7 252-6 448-10v51H0Z"
        fill="#0c3449"
        opacity=".7"
      />
      <g fill="#79b7a6" opacity=".5">
        <ellipse cx="445" cy="650" rx="9" ry="3" />
        <ellipse cx="557" cy="673" rx="5" ry="2" />
        <ellipse cx="782" cy="680" rx="8" ry="3" />
        <ellipse cx="399" cy="668" rx="4" ry="2" />
      </g>
    </svg>
  );
}
