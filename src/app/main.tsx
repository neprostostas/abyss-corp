import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { supabase } from '../infrastructure/supabase/client';
import '../ui/styles/theme.css';
import '../ui/styles/app.css';
import '../ui/styles/command.css';
import '../ui/styles/account.css';
import '../ui/styles/players.css';

const root = document.getElementById('root');
if (!root)
  throw new Error('Abyss Corp cannot start: the root element is missing.');
createRoot(root).render(
  <StrictMode>
    <App client={supabase} />
  </StrictMode>,
);

import '../ui/styles/analytics.css';

import '../ui/styles/polish.css';
