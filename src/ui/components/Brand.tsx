import { memo } from 'react';
import { useIconAssets } from './iconAssets';
import { RasterIcon } from './RasterIcon';
export const Brand = memo(function Brand() {
  const base = useIconAssets();
  return (
    <span className="brand-lockup">
      {base ? (
        <RasterIcon base={base} name="brand-abyss" size={48} />
      ) : (
        <img src="/brand/abyss-mark.svg" width="48" height="36" alt="" />
      )}
      <span className="brand-name">
        <span>Abyss</span>
        <small>Corp</small>
      </span>
    </span>
  );
});
