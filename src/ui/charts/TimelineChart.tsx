import { useEffect, useId, useRef, useState } from 'react';
export interface TimelinePoint {
  readonly day: string;
  readonly value: number;
}
const dayFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const label = (day: string) => dayFormat.format(new Date(`${day}T00:00:00Z`));

/** One readable time series, with the same exact values available by pointer or keyboard. */
export function TimelineChart({
  title,
  points,
  unit,
}: {
  title: string;
  points: readonly TimelinePoint[];
  unit: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const gradient = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(720);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0)
        setWidth(Math.max(240, Math.round(entry.contentRect.width)));
    });
    observer.observe(svg);
    return () => {
      observer.disconnect();
    };
  }, []);
  const height = 220,
    left = 42,
    right = 16,
    top = 20,
    bottom = 36;
  const plotWidth = width - left - right,
    plotHeight = height - top - bottom;
  const max = Math.max(
    2,
    Math.ceil(Math.max(0, ...points.map((p) => p.value)) / 2) * 2,
  );
  const x = (i: number) =>
    left + (i / Math.max(1, points.length - 1)) * plotWidth;
  const y = (value: number) => top + plotHeight - (value / max) * plotHeight;
  const inspect = (clientX: number, svg: SVGSVGElement) => {
    const bounds = svg.getBoundingClientRect();
    const pointer = ((clientX - bounds.left) / bounds.width) * width;
    setSelected(
      Math.max(
        0,
        Math.min(
          points.length - 1,
          Math.round(((pointer - left) / plotWidth) * (points.length - 1)),
        ),
      ),
    );
  };
  const line = points
    .map((p, i) => `${i ? 'L' : 'M'}${String(x(i))},${String(y(p.value))}`)
    .join(' ');
  const currentIndex =
    selected === null
      ? points.length - 1
      : Math.min(selected, points.length - 1);
  const current = points[currentIndex];
  const ticks = [
    ...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]),
  ];
  return (
    <section className="report-chart" aria-label={title}>
      <header>
        <h2>{title}</h2>
        <output>
          {current
            ? `${label(current.day)} · ${current.value.toLocaleString()} ${current.value === 1 ? unit.replace(/s$/, '') : unit}`
            : 'No data'}
        </output>
      </header>
      {points.length ? (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${String(width)} ${String(height)}`}
          role="img"
          tabIndex={0}
          aria-label={`${title}. Use left and right arrows to inspect dates.`}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              setSelected(
                Math.max(
                  0,
                  Math.min(
                    points.length - 1,
                    currentIndex + (event.key === 'ArrowLeft' ? -1 : 1),
                  ),
                ),
              );
            }
          }}
          onPointerMove={(event) => {
            inspect(event.clientX, event.currentTarget);
          }}
          onPointerDown={(event) => {
            inspect(event.clientX, event.currentTarget);
          }}
        >
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#8cdbc7" stopOpacity=".25" />
              <stop offset="1" stopColor="#8cdbc7" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((fraction) => (
            <g key={fraction}>
              <line
                x1={left}
                x2={width - right}
                y1={y(max * fraction)}
                y2={y(max * fraction)}
                className="chart-grid"
              />
              <text x={left - 10} y={y(max * fraction) + 4} textAnchor="end">
                {Math.round(max * fraction)}
              </text>
            </g>
          ))}
          <path
            d={`${line} L${String(x(points.length - 1))},${String(y(0))} L${String(left)},${String(y(0))} Z`}
            fill={`url(#${gradient})`}
          />
          <path d={line} className="chart-line" />
          {current && (
            <g>
              <line
                x1={x(currentIndex)}
                x2={x(currentIndex)}
                y1={top}
                y2={y(0)}
                className="chart-cursor"
              />
              <circle
                cx={x(currentIndex)}
                cy={y(current.value)}
                r="4"
                className="chart-point"
              />
            </g>
          )}
          {ticks.map((i) => {
            const point = points[i];
            return (
              point && (
                <text
                  key={i}
                  x={x(i)}
                  y={height - 10}
                  textAnchor={
                    i === 0
                      ? 'start'
                      : i === points.length - 1
                        ? 'end'
                        : 'middle'
                  }
                >
                  {label(point.day)}
                </text>
              )
            );
          })}
        </svg>
      ) : (
        <p>No data for this period.</p>
      )}
    </section>
  );
}
