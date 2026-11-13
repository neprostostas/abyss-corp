export function RasterIcon({
  base,
  name,
  className = '',
  size = 24,
}: {
  base: string;
  name: string;
  className?: string;
  size?: number;
}) {
  return (
    <img
      className={`game-icon raster-icon ${className}`}
      src={`${base}/${name}-64.webp`}
      srcSet={`${base}/${name}-64.webp 64w, ${base}/${name}-128.webp 128w, ${base}/${name}-256.webp 256w`}
      sizes={`${String(size)}px`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      decoding="async"
    />
  );
}
