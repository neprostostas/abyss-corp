import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { IconAssetsContext } from '../ui/components/iconAssets';
import { supabase } from '../infrastructure/supabase/client';

import '../ui/styles/theme.css';
import '../ui/styles/game.css';
import '../ui/styles/panels.css';
import '../ui/styles/account.css';
import '../ui/styles/analytics.css';
import '../ui/styles/world.css';

const root = document.getElementById('root');
if (!root)
  throw new Error('Abyss Corp cannot start: the root element is missing.');
createRoot(root).render(
  <StrictMode>
    <IconAssetsContext.Provider value="/icons/generated-v1">
      <App client={supabase} />
    </IconAssetsContext.Provider>
  </StrictMode>,
);
