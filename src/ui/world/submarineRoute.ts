// One curve for both the drawn route and the submarine's movement.
const start = { x: 400, y: 285 };
const control = { x: 482.5, y: 201 };
const end = { x: 565, y: 245 };

export const SUBMARINE_ROUTE = `M${String(start.x)} ${String(start.y)}Q${String(control.x)} ${String(control.y)} ${String(end.x)} ${String(end.y)}`;

export function submarinePosition(progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  const remaining = 1 - t;
  return {
    x:
      remaining ** 2 * start.x + 2 * remaining * t * control.x + t ** 2 * end.x,
    y:
      remaining ** 2 * start.y + 2 * remaining * t * control.y + t ** 2 * end.y,
  };
}
