import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

/** Local presentation state only: production continues throughout reconstruction. */
export function UpgradeReveal({
  level,
  width,
  height,
  children,
}: {
  level: number;
  width: number;
  height: number;
  children: (level: number) => ReactNode;
}) {
  const [transition, setTransition] = useState({
    level,
    from: null as number | null,
  });
  if (transition.level !== level) {
    setTransition({
      level,
      from: level > transition.level ? transition.level : null,
    });
  }
  const upgrading = transition.from !== null;
  useEffect(() => {
    if (!upgrading) return;
    const timer = window.setTimeout(() => {
      setTransition((current) => ({ ...current, from: null }));
    }, 1800);
    return () => {
      window.clearTimeout(timer);
    };
  }, [level, upgrading]);

  return (
    <g className={upgrading ? 'upgrade-reveal is-upgrading' : 'upgrade-reveal'}>
      {upgrading && (
        <g
          key={`effects-${level}`}
          className="upgrade-effects"
          pointerEvents="none"
          aria-hidden="true"
        >
          <ellipse className="upgrade-wave" cy="12" rx={width * 0.55} ry="28" />
          <ellipse
            className="upgrade-wave upgrade-wave-late"
            cy="12"
            rx={width * 0.55}
            ry="28"
          />
          <g transform={`translate(0 ${-height / 2})`}>
            <ellipse
              className="upgrade-aura"
              rx={width * 0.65}
              ry={height * 0.7}
            />
            {Array.from({ length: 12 }, (_, i) => {
              const angle = (i / 12) * Math.PI * 2;
              return (
                <g
                  key={i}
                  transform={`translate(${Math.cos(angle) * width * 0.35} ${Math.sin(angle) * height * 0.35})`}
                >
                  <path
                    className="upgrade-particle"
                    d="M0-6 2-2 6 0 2 2 0 6-2 2-6 0-2-2Z"
                    style={
                      {
                        '--particle-x': `${Math.cos(angle) * 45}px`,
                        '--particle-y': `${Math.sin(angle) * 35 - 30}px`,
                        animationDelay: `${0.3 + (i % 4) * 0.07}s`,
                      } as CSSProperties
                    }
                  />
                </g>
              );
            })}
          </g>
          <g
            className="upgrade-scan"
            style={{ '--scan-height': `${-height}px` } as CSSProperties}
          >
            <path d={`M${-width / 2} 0H${width / 2}`} />
            <path d={`M${-width / 2} 0V15M${width / 2} 0V15`} />
          </g>
        </g>
      )}
      {upgrading && (
        <g
          key={`old-${level}`}
          className="upgrade-old"
          pointerEvents="none"
          aria-hidden="true"
        >
          {children(transition.from ?? level)}
        </g>
      )}
      <g key={level} className={upgrading ? 'upgrade-new' : undefined}>
        {children(level)}
      </g>
      {upgrading && (
        <g
          key={`badge-${level}`}
          transform={`translate(0 ${-height - 25})`}
          pointerEvents="none"
          aria-hidden="true"
        >
          <g className="upgrade-badge">
            <rect x="-36" y="-14" width="72" height="28" rx="14" />
            <path d="m-23 2 5-5 5 5m-5-5v10" />
            <text x="9" y="5" textAnchor="middle">
              LV {level}
            </text>
          </g>
        </g>
      )}
    </g>
  );
}
