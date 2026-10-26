import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { GameSession } from '../application/GameSession';
import { LocalSaveRepository } from '../infrastructure/persistence/LocalSaveRepository';
import { browserClock } from '../infrastructure/clock/browserClock';
import '../ui/styles/theme.css';
import '../ui/styles/app.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Abyss Corp cannot start: the root element is missing.');
}

const session = new GameSession(
  new LocalSaveRepository(() => window.localStorage),
  browserClock,
);

createRoot(root).render(
  <StrictMode>
    <App session={session} />
  </StrictMode>,
);
