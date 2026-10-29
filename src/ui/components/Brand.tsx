import { memo } from 'react';
export const Brand = memo(function Brand() {
  return (
    <span className="brand-lockup">
      <img src="/brand/abyss-mark.svg" width="48" height="36" alt="" />
      <span className="brand-name">
        <span>Abyss</span>
        <small>Corp</small>
      </span>
    </span>
  );
});
