import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

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
  const [lastLevel, setLastLevel] = useState(level);
  const [purchased, setPurchased] = useState(false);
  if (lastLevel !== level) {
    setLastLevel(level);
    setPurchased(level > lastLevel);
  }
  useEffect(() => {
    if (!purchased) return;
    const timer = window.setTimeout(() => {
      setPurchased(false);
    }, 760);
    return () => {
      window.clearTimeout(timer);
    };
  }, [level, purchased]);
  return (
    <g className="upgrade-reveal">
      <g key={level} className={purchased ? 'upgrade-new' : undefined}>
        {children(level)}
      </g>
      {purchased && (
        <g
          key={`purchase-${level}`}
          className="upgrade-effects"
          pointerEvents="none"
          aria-hidden="true"
        >
          <ellipse className="upgrade-wave" cy="12" rx={width * 0.48} ry="22" />
          {[-1, -0.6, 0.6, 1].map((side, i) => (
            <g
              key={side}
              transform={`translate(${side * width * 0.43} ${-height * (0.3 + (i % 2) * 0.25)})`}
            >
              <circle
                className="upgrade-bubble"
                r={i % 2 ? 4 : 6}
                style={
                  {
                    animationDelay: `${i * 45}ms`,
                    '--drift': `${side * 12}px`,
                  } as CSSProperties
                }
              />
            </g>
          ))}
        </g>
      )}
    </g>
  );
}
