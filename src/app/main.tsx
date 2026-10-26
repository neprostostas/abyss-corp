import { LiveOps } from '../application/LiveOps';
import { LiveOpsClient } from '../infrastructure/api/LiveOpsClient';
import { SaveSync } from '../application/SaveSync';
import { CloudSaveClient } from '../infrastructure/api/CloudSaveClient';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { GameSession } from '../application/GameSession';
import { LocalSaveRepository } from '../infrastructure/persistence/LocalSaveRepository';
import { browserClock } from '../infrastructure/clock/browserClock';
import '../ui/styles/theme.css';
import '../ui/styles/app.css';
import '../ui/styles/command.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Abyss Corp cannot start: the root element is missing.');
}

const liveOps = new LiveOps(
  new LiveOpsClient(),
  browserClock,
  () => window.localStorage,
);

const session = new GameSession(
  new LocalSaveRepository(() => window.localStorage),
  browserClock,
  liveOps.track,
);

const sync = new SaveSync(
  session,
  new CloudSaveClient(),
  () => window.localStorage,
);

createRoot(root).render(
  <StrictMode>
    <App session={session} sync={sync} liveOps={liveOps} />
  </StrictMode>,
);
