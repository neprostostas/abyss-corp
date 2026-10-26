import type { Phase } from '../../domain/game';
import { RESOURCE } from '../../data/balance';

/** Position and cargo reflect the real cycle; this scene never awards resources. */
export function OutpostIllustration({
  phase,
  progress,
  running,
}: {
  phase: Phase;
  progress: number;
  running: boolean;
}) {
  const travel =
    phase === 'delivering'
      ? progress
      : phase === 'returning'
        ? 1 - progress
        : 0;
  const x = 220 + travel * 560;
  const y = 280 - travel * 70;
  return (
    <svg
      className="outpost-illustration"
      viewBox="0 0 1000 440"
      role="img"
      aria-labelledby="outpost-art-title"
    >
      <title id="outpost-art-title">
        A submarine extracting crystals at the seabed and carrying them to the
        surface outpost.
      </title>
      <defs>
        <linearGradient id="ocean" x2="0" y2="1">
          <stop stopColor="#28bfd1" />
          <stop offset="1" stopColor="#07557e" />
        </linearGradient>
        <linearGradient id="glass" x2="0" y2="1">
          <stop stopColor="#8cebf0" />
          <stop offset="1" stopColor="#1786b2" />
        </linearGradient>
      </defs>
      <path fill="url(#ocean)" d="M0 0h1000v440H0z" />
      <g fill="#b2ffff" opacity=".1">
        <path d="M130 0h85l150 440H80z" />
        <path d="M440 0h45l240 440H390z" />
        <path d="M800 0h70l130 300v140H780z" />
      </g>
      <g fill="none" stroke="#b2f5f1" strokeWidth="2" opacity=".45">
        <circle cx="145" cy="140" r="7" />
        <circle cx="163" cy="108" r="4" />
        <circle cx="828" cy="238" r="6" />
        <circle cx="846" cy="204" r="3" />
        <circle cx="625" cy="80" r="5" />
      </g>
      <path d="M0 360Q130 318 265 370T570 365T1000 340V440H0" fill="#095574" />
      <path d="M0 406Q180 365 330 410T660 395T1000 390V440H0" fill="#063f61" />
      <path d="M250 330 Q520 330 800 260" className="cargo-route" />
      <g
        transform="translate(310 -10) scale(.8)"
        stroke="#073f60"
        strokeWidth="8"
        strokeLinejoin="round"
      >
        <path d="M365 276v105m195-105v105" stroke="#80bed0" strokeWidth="17" />
        <rect x="302" y="248" width="326" height="37" rx="15" fill="#f5bc43" />
        <rect x="338" y="137" width="255" height="115" rx="35" fill="#eefaff" />
        <path d="M381 139v-30q0-21 21-21h96q22 0 22 21v30" fill="#edfaff" />
        <path
          d="M410 86V60m0 0h45"
          fill="none"
          stroke="#e3f9fc"
          strokeWidth="6"
        />
        <rect
          x="361"
          y="161"
          width="150"
          height="59"
          rx="22"
          fill="url(#glass)"
        />
        <path d="M411 164v53m49-53v53" fill="none" strokeWidth="6" />
        <rect x="533" y="171" width="37" height="79" rx="12" fill="#f7c64b" />
        <path
          d="M310 228h-35v-47h61"
          fill="none"
          stroke="#d9f3f9"
          strokeWidth="14"
        />
        <path
          d="M593 210h34v38"
          fill="none"
          stroke="#e3f9fc"
          strokeWidth="12"
        />
      </g>
      <g
        transform={`translate(${String(x)} ${String(y)}) scale(.65)`}
        stroke="#073f60"
        strokeWidth="6"
        strokeLinejoin="round"
      >
        <path d="m-10 44-27-19v55l27-15" fill="#e4f8ff" />
        <rect x="-12" y="20" width="125" height="69" rx="34" fill="#ffcb4b" />
        <circle cx="78" cy="54" r="22" fill="url(#glass)" />
        <path d="M21 18V4h27v14" fill="#e4f8ff" />
        <path d="M13 93h65" stroke="#d9f6fa" strokeLinecap="round" />
        {phase === 'delivering' && (
          <g fill="#96fff1" stroke="#188ea0" strokeWidth="3">
            <path d="m12 66 9-18 11 18-11 12z" />
            <path d="m34 66 9-18 11 18-11 12z" />
          </g>
        )}
        {phase === 'mining' && (
          <g className={running ? 'drill-active' : undefined}>
            <path
              d="M40 92v25m-12-9 12 12 12-12"
              fill="none"
              stroke="#f7c64b"
            />
            <path d="M31 126h18" stroke="#96fff1" />
          </g>
        )}
      </g>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M103 411v-52m0 25-20-18m20 5 21-26m-21 57 29-19"
          stroke="#ff8d93"
          strokeWidth="12"
        />
        <path
          d="M887 405v-52m0 29-23-22m23 35 26-24"
          stroke="#b0a3f8"
          strokeWidth="13"
        />
        <path
          d="M182 410q-26-29-11-55m18 54q23-21 16-39M803 415q-18-24-9-44"
          stroke="#44cbb6"
          strokeWidth="11"
        />
      </g>
      <g fill="#7fe5e8" opacity=".7">
        <path d="m242 218 13-7 15 7-15 7zm30 0 8-7v14z" />
        <path d="m865 100 13-7 15 7-15 7zm30 0 8-7v14z" />
      </g>
      <text x="620" y="25" className="world-label">
        SURFACE DOCK
      </text>
      <text x="160" y="240" className="world-label">
        CRYSTAL VEIN
      </text>
      <text x="700" y="315" className="world-value">
        {phase === 'returning'
          ? 'Cargo sold!'
          : phase === 'delivering'
            ? `${String(RESOURCE.batchSize)} crystals on board`
            : 'Ready for cargo'}
      </text>
      <g fill="#8cdef0">
        <path d="m229 397 10-26 14 6 7 25z" />
        <path d="m253 403 6-23 14 9-2 17z" />
      </g>
    </svg>
  );
}
