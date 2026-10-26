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
  | 'depth'
  | 'profile'
  | 'cookie'
  | 'database'
  | 'analytics'
  | 'logout';
const shapes: Record<IconName, ReactNode> = {
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  cookie: (
    <>
      <path d="M21 12a5 5 0 0 1-5-5 5 5 0 0 1-5-5 10 10 0 1 0 10 10Z" />
      <circle cx="8" cy="9" r="1" fill="currentColor" />
      <circle cx="8" cy="16" r="1" fill="currentColor" />
      <circle cx="14" cy="15" r="1" fill="currentColor" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" />
    </>
  ),
  analytics: (
    <>
      <path d="M4 3v18h17" />
      <rect
        x="7"
        y="12"
        width="3"
        height="6"
        rx="1"
        fill="currentColor"
        stroke="none"
      />
      <rect
        x="12"
        y="8"
        width="3"
        height="10"
        rx="1"
        fill="currentColor"
        stroke="none"
      />
      <rect
        x="17"
        y="4"
        width="3"
        height="14"
        rx="1"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  logout: (
    <>
      <path d="M10 4H4v16h6M9 12h12m-4-4 4 4-4 4" />
    </>
  ),
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
      <path
        d="M9 3h6v2h-1v5l6 9a1.5 1.5 0 0 1-1.3 2H5.3A1.5 1.5 0 0 1 4 19l6-9V5H9Z"
        fill="currentColor"
        stroke="none"
      />
      <path d="m8 16-2 3h12l-2-3Z" fill="#245463" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="#245463" stroke="none" />
    </>
  ),
  missions: (
    <>
      <rect
        x="4"
        y="4"
        width="16"
        height="18"
        rx="3"
        fill="currentColor"
        stroke="none"
      />
      <rect
        x="8"
        y="2"
        width="8"
        height="5"
        rx="1.5"
        fill="#e9c575"
        stroke="#245463"
        strokeWidth="1.3"
      />
      <path d="m8 12 2 2 5-4M8 18h7" stroke="#245463" strokeWidth="2" />
    </>
  ),
  trophy: (
    <>
      <path
        d="M7 5H3v3a4 4 0 0 0 5 4m9-7h4v3a4 4 0 0 1-5 4"
        stroke="#e9c575"
        strokeWidth="2.5"
      />
      <path
        d="M7 3h10v5a5 5 0 0 1-10 0ZM11 13h2v5h4v3H7v-3h4Z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M10 6v2" stroke="#245463" />
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
      <path d="M12 3v4" stroke="#e9c575" strokeWidth="2" />
      <circle cx="12" cy="3" r="2" fill="#e9c575" stroke="none" />
      <rect
        x="3"
        y="7"
        width="18"
        height="14"
        rx="5"
        fill="currentColor"
        stroke="none"
      />
      <rect
        x="6"
        y="10"
        width="12"
        height="6"
        rx="2"
        fill="#245463"
        stroke="none"
      />
      <path d="M9 12v2m6-2v2" stroke="#ace6db" strokeWidth="1.6" />
      <path d="M9 18h6" stroke="#245463" strokeWidth="1.5" />
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
