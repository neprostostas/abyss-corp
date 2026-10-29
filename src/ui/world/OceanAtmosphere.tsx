import { memo } from 'react';
import { LAYERS } from '../../data/layers';
import type { LayerId } from '../../data/layers';

/** Full-viewport scenery is independent of the interactive outpost's aspect ratio. */
export const OceanAtmosphere = memo(function OceanAtmosphere({
  layerId,
  surface = false,
}: {
  layerId: LayerId;
  surface?: boolean;
}) {
  const layer = LAYERS[layerId];
  return (
    <svg
      className="ocean-atmosphere"
      viewBox="0 0 1200 780"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ocean-beam" x2=".5" y2="1">
          <stop stopColor="#c7fff0" stopOpacity=".15" />
          <stop offset="1" stopColor="#c7fff0" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id="ocean-rock-fade"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="360"
          x2="0"
          y2="630"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="black" />
        </linearGradient>
        <mask
          id="ocean-rock-softness"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="1200"
          height="780"
        >
          <rect width="1200" height="780" fill="url(#ocean-rock-fade)" />
        </mask>
      </defs>
      <g className="sun-rays" fill="url(#ocean-beam)">
        <path d="M270-50h90l140 790H-10Z" />
        <path d="M580-50h45l360 790H380Z" />
        <path d="M910-50h35l340 790H780Z" />
      </g>
      <g opacity=".21" fill="#0b3b52" mask="url(#ocean-rock-softness)">
        <path d="M0 385 90 303 144 325 187 440 245 462 293 659H0Z" />
        <path d="M1200 298 1102 256 1067 327 1002 345 974 483 907 519 855 722H1200Z" />
        <path d="m190 514 86-69 105 26 22 139 94 50H100Z" />
        <path d="M630 596 700 443 759 427 810 478 866 640Z" />
      </g>
      <g
        className="depth-scenery"
        fill="#101f3f"
        opacity={!surface && layer.visual.formation === 'cavern' ? 0.6 : 0}
      >
        <path d="M0 0H1200V100l-73-25-72 70-89-103-121 65-87-78-127 50-65-38-114 83-72-90-129 39L160 30 0 128Z" />
      </g>
      <g
        className="depth-scenery"
        opacity={!surface && layerId === 'thermal-vents' ? 0.45 : 0}
        stroke="#ffad83"
        fill="none"
      >
        <path
          d="m48 780 25-51 18 20 20-39 23 70M1040 780l28-67 21 38 18-19 28 48"
          fill="#18343d"
          strokeWidth="3"
        />
        <path
          d="M84 710q-22-50 0-90t0-90M1090 700q20-45 0-85t0-85"
          strokeWidth="8"
          opacity=".16"
        />
      </g>
      <g
        className="depth-scenery"
        fill="#99bfff"
        opacity={!surface && layerId === 'midnight-rift' ? 0.4 : 0}
      >
        <path d="m52 660 12-27 10 32-10 12ZM1110 615l14-35 13 39-13 13Z" />
        <circle cx="90" cy="420" r="2" />
        <circle cx="1070" cy="360" r="3" />
        <circle cx="1140" cy="470" r="2" />
      </g>
      <path
        d="M0 743q145-53 265-5t235 7 252-6 448-10v51H0Z"
        fill="#0c3449"
        opacity=".7"
      />
    </svg>
  );
});
