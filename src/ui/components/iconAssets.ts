import { createContext, useContext } from 'react';

// The default keeps the existing 2D UI; the prototype supplies its own asset pack.
export const IconAssetsContext = createContext<string | null>(null);
export function useIconAssets() {
  return useContext(IconAssetsContext);
}
