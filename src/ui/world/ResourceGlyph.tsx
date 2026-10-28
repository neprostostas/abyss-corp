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
      {resource.shape === 'alloy' && (
        <>
          <path d="m0-18 16 9v18L0 18-16 9V-9Z" />
          <path d="m-16-9 16 9 16-9M0 0v18" fill="none" />
        </>
      )}
      {resource.shape === 'core' && (
        <>
          <path d="m0-20 17 10v20L0 20-17 10v-20Z" />
          <circle r="7" fill="#e8f1ff" stroke="none" />
        </>
      )}
      {resource.shape === 'pearl' && (
        <>
          <circle r="15" />
          <circle cx="-5" cy="-5" r="4" fill="#ffffff" stroke="none" />
        </>
      )}
    </g>
  );
}
