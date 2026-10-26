import type { GameSession } from '../../application/GameSession';
import { useGameSession } from '../../app/useGameSession';
import { LAYER, RESOURCE, UPGRADE_IDS } from '../../data/balance';
import {
  DELIVERY_VALUE,
  getProductionSummary,
  getPhaseDuration,
} from '../../domain/game';
import { OutpostIllustration } from '../world/OutpostIllustration';
import { UpgradeCard } from '../panels/UpgradeCard';
import { ProgressBar } from '../components/ProgressBar';

const PHASE_LABELS = {
  mining: 'Extracting crystals',
  delivering: 'Delivering cargo',
  returning: 'Returning to the vein',
} as const;
const SAVE_LABELS = {
  unsaved: 'Not saved yet',
  saving: 'Saving…',
  saved: 'Saved locally',
  error: 'Save failed',
} as const;
const numberFormat = new Intl.NumberFormat('en-US');

export function GameScreen({ session }: { session: GameSession }) {
  const { game, status, saveStatus, error } = useGameSession(session);
  const progress = game.phaseElapsedMs / getPhaseDuration(game);
  const production = getProductionSummary(game);
  const complete = production.fullyUpgraded;
  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="#main" aria-label="Abyss Corp home">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>
            ABYSS<span className="brand-secondary">CORP</span>
          </span>
        </a>
        <span className="preview-badge">First playable</span>
      </header>
      <main id="main" className="game-screen">
        {status === 'loading' && (
          <p role="status" className="session-notice">
            Preparing your outpost…
          </p>
        )}
        {error && (
          <div className="session-notice error-notice" role="alert">
            <p>{error}</p>
            <button
              onClick={() => {
                if (status === 'load-error') void session.initialize();
                else void session.save(true);
              }}
            >
              {status === 'load-error' ? 'Retry loading' : 'Retry saving'}
            </button>
          </div>
        )}
        {status === 'ready' && (
          <>
            <section
              className="operation-heading"
              aria-labelledby="welcome-title"
            >
              <div>
                <p className="eyebrow">Your first ocean operation</p>
                <h1 id="welcome-title">
                  Small crew. <span>Big potential.</span>
                </h1>
              </div>
              <button
                className="primary-button"
                onClick={session.toggleRunning}
              >
                {game.running ? 'Pause operation' : 'Start operation'}
              </button>
            </section>
            <section className="resource-hud" aria-label="Operation overview">
              <div className="resource-counter">
                <span>Corporate credits</span>
                <strong data-testid="credits">
                  {numberFormat.format(game.credits)} <small>CR</small>
                </strong>
              </div>
              <div className="resource-counter">
                <span>Cargo on board</span>
                <strong>
                  {production.cargo} <small>crystals</small>
                </strong>
              </div>
              <div className="resource-counter">
                <span>Full-cycle average{game.running ? '' : ' · paused'}</span>
                <strong>
                  {production.creditsPerSecond.toFixed(1)}{' '}
                  <small>CR / sec</small>
                </strong>
              </div>
            </section>
            <section className="world-panel" aria-labelledby="outpost-title">
              <div className="world-heading">
                <div>
                  <p className="eyebrow">
                    One vein. One submarine. Your beginning.
                  </p>
                  <h2 id="outpost-title">{LAYER.name}</h2>
                </div>
                <span className="scene-label">↓ {LAYER.depthMeters} m</span>
              </div>
              <OutpostIllustration
                phase={game.phase}
                progress={progress}
                running={game.running}
              />
              <div className="production-status">
                <div className="production-status-heading">
                  <strong>
                    {game.running
                      ? PHASE_LABELS[game.phase]
                      : 'Operation paused'}
                  </strong>
                  <span>
                    {game.phase === 'returning'
                      ? `Cargo sold · +${String(DELIVERY_VALUE)} CR`
                      : `${String(RESOURCE.batchSize)} crystals → ${String(DELIVERY_VALUE)} CR at the dock`}
                  </span>
                </div>
                <ProgressBar
                  label={PHASE_LABELS[game.phase]}
                  value={progress}
                />
                <div className="production-steps" aria-label="Production route">
                  {(['mining', 'delivering', 'returning'] as const).map(
                    (phase, index) => (
                      <span
                        key={phase}
                        aria-current={game.phase === phase ? 'step' : undefined}
                      >
                        {index + 1}.{' '}
                        {phase === 'mining'
                          ? 'Extract'
                          : phase === 'delivering'
                            ? 'Deliver & sell'
                            : 'Return'}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </section>
            <section
              className="upgrades-section"
              aria-labelledby="upgrades-title"
            >
              <div className="section-heading">
                <h2 id="upgrades-title">Build a better operation</h2>
                <span>Upgrades take effect immediately</span>
              </div>
              <div className="upgrade-grid">
                {UPGRADE_IDS.map((id) => (
                  <UpgradeCard
                    key={id}
                    id={id}
                    game={game}
                    onUpgrade={session.upgrade}
                  />
                ))}
              </div>
            </section>
            <aside className="milestone-note">
              <span className="milestone-number" aria-hidden="true">
                01
              </span>
              <div>
                <p className="eyebrow">
                  {complete ? 'First outpost complete' : 'Your first objective'}
                </p>
                <h2>
                  {complete
                    ? 'A small crew, working at full speed.'
                    : 'Fully upgrade your drill and submarine.'}
                </h2>
                <p>
                  {complete
                    ? 'You have completed this playable slice. Keep earning or pause here; more production stages come in a later milestone.'
                    : 'Every delivery earns credits. Reinvest them to make the next delivery arrive sooner.'}
                </p>
              </div>
            </aside>
            <div className="save-row">
              <span>{SAVE_LABELS[saveStatus]}</span>
              <button
                className="text-button"
                disabled={saveStatus === 'saving'}
                onClick={() => {
                  void session.save(true);
                }}
              >
                Save now
              </button>
            </div>
            <p className="session-help">
              Progress saves on this browser. Production pauses while this tab
              is hidden or closed. Use one game tab at a time.
            </p>
          </>
        )}
      </main>
      <footer className="app-footer">
        <span>Abyss Corp</span>
        <span>An ocean of possibility.</span>
      </footer>
    </div>
  );
}
