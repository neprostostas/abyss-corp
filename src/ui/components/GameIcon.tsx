import type { ReactNode } from 'react';
export type IconName =
  | 'coin'
  | 'crystal'
  | 'mining'
  | 'transport'
  | 'processing'
  | 'storage'
  | 'research'
  | 'missions'
  | 'trophy'
  | 'refresh'
  | 'settings'
  | 'lock'
  | 'play'
  | 'pause'
  | 'close'
  | 'arrow'
  | 'robot'
  | 'cloud'
  | 'check'
  | 'depth';
const shapes: Record<IconName, ReactNode> = {
  coin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 8.5a4 4 0 1 0 0 7M8 12h5" />
    </>
  ),
  crystal: (
    <>
      <path d="m12 2 8 8-8 12L4 10Z" />
      <path d="m12 2-3 8 3 12 3-12ZM4 10h16" />
    </>
  ),
  mining: (
    <>
      <path d="m6 4 12 0 2 4-8 13L4 8ZM4 8h16M8 12h8M10 16h4" />
      <path d="M9 2v2m6-2v2" />
    </>
  ),
  transport: (
    <>
      <rect x="4" y="7" width="17" height="12" rx="6" />
      <circle cx="15" cy="13" r="3" />
      <path d="M7 7V4h6v3M4 11l-3-2v8l3-2m4 7h9" />
    </>
  ),
  processing: (
    <>
      <path d="M7 3h10v5l4 7v6H3v-6l4-7ZM7 8h10M3 15h18" />
      <path d="m12 10-3 5h5l-3 5" />
    </>
  ),
  storage: (
    <>
      <path d="m3 7 9-4 9 4v13H3ZM3 7h18M8 7v13m8-13v13" />
      <path d="M10 11h4v5h-4Z" />
    </>
  ),
  research: (
    <>
      <path d="M9 3h6m-5 0v7L4 19q-1 2 2 2h12q3 0 2-2l-6-9V3M7 15h10" />
      <circle cx="12" cy="17" r=".5" />
    </>
  ),
  missions: (
    <>
      <path d="M8 4H5v17h14V4h-3M9 2h6v5H9Z" />
      <path d="m8 12 2 2 5-4M8 18h7" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 3h10v5a5 5 0 0 1-10 0ZM7 5H3v3a4 4 0 0 0 5 4m9-7h4v3a4 4 0 0 1-5 4M12 13v5m-4 3v-3h8v3Z" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5" />
    </>
  ),
  settings: (
    <>
      <path d="m9 3 1-2h4l1 2 3 2 2 0 2 4-1 2v3l1 2-2 4-3 0-2 2H9l-2-2H4l-2-4 1-2v-3L2 9l2-4h3Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="3" />
      <path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2" />
    </>
  ),
  play: <path d="m8 4 12 8-12 8Z" />,
  pause: (
    <>
      <path d="M7 4v16M17 4v16" strokeWidth="5" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  robot: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="5" />
      <path d="M12 3v4M8 16h8" />
      <circle cx="8" cy="12" r="1" />
      <circle cx="16" cy="12" r="1" />
      <circle cx="12" cy="2" r="1" />
    </>
  ),
  cloud: (
    <>
      <path d="M7 19H6a4 4 0 0 1-1-8 7 7 0 0 1 13-2 5 5 0 0 1 0 10h-1" />
      <path d="M12 22V12m-4 4 4-4 4 4" />
    </>
  ),
  check: <path d="m4 12 5 5L20 6" />,
  depth: (
    <>
      <path d="M12 3v18m-5-5 5 5 5-5M3 5h3m-3 7h3m-3 7h3m12-14h3m-3 7h3m-3 7h3" />
    </>
  ),
};
export function GameIcon({
  name,
  className = '',
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={`game-icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes[name]}
    </svg>
  );
}
