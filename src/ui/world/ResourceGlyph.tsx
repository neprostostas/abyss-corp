import type { ResourceDefinition } from '../../data/resources';

export function ResourceGlyph({
  resource,
  x,
  y,
  scale = 1,
}: {
  resource: ResourceDefinition;
  x: number;
  y: number;
  scale?: number;
}) {
  return (
    <g
      transform={`translate(${String(x)} ${String(y)}) scale(${String(scale)})`}
      fill={resource.color}
      stroke="#188ea0"
      strokeWidth="2"
    >
      {resource.shape === 'crystal' && <path d="M0-20 14 0 0 18-14 0Z" />}
      {resource.shape === 'ingot' && <path d="M-12-10H12L20 10H-20Z" />}
      {resource.shape === 'pearl' && (
        <>
          <circle r="15" />
          <circle cx="-5" cy="-5" r="4" fill="#ffffff" stroke="none" />
        </>
      )}
    </g>
  );
}
