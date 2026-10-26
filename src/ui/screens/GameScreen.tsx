import { useEffect, useState, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import type { GameSession } from '../../application/GameSession';
import type { SaveSync } from '../../application/SaveSync';
import type { LiveOps } from '../../application/LiveOps';
import { useGameSession } from '../../app/useGameSession';
import { UPGRADE_IDS } from '../../data/balance';
import { LAYERS } from '../../data/layers';
import { getLayerGame } from '../../domain/world';
import {
  getLayerProduction,
  getReadyMissionCount,
} from '../../domain/progression';
import { getLiveEventOffer } from '../../domain/liveEvents';
import {
  getPhaseDuration,
  getProductionSummary,
  getSaleValue,
} from '../../domain/game';
import type { UpgradeId } from '../../domain/game';
import { GameIcon } from '../components/GameIcon';
import type { IconName } from '../components/GameIcon';
import { GameDialog } from '../components/GameDialog';
import { OutpostIllustration } from '../world/OutpostIllustration';
import { DepthNavigation } from '../panels/DepthNavigation';
import { UpgradeCard } from '../panels/UpgradeCard';
import { ProductionPanel } from '../panels/ProductionPanel';
import { ProgressionPanel } from '../panels/ProgressionPanel';
import { AutomationPanel } from '../panels/AutomationPanel';
import { LiveOpsPanel } from '../panels/LiveOpsPanel';
import { ServerSavePanel } from '../panels/ServerSavePanel';

type WindowName = 'research' | 'missions' | 'crew' | 'events' | 'settings';
const windows: Record<WindowName, { title: string; icon: IconName }> = {
  research: { title: 'Research', icon: 'research' },
  missions: { title: 'Missions', icon: 'missions' },
  crew: { title: 'Crew', icon: 'robot' },
  events: { title: 'Events', icon: 'events' },
  settings: { title: 'Settings', icon: 'settings' },
};
const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const phaseNames = {
  mining: 'Mining',
  delivering: 'Delivering',
  returning: 'Returning',
};
export function GameScreen({
  session,
  sync,
  liveOps,
}: {
  session: GameSession;
  sync: SaveSync;
  liveOps: LiveOps;
}) {
  const { world, status, saveStatus, error, offlineReport } =
    useGameSession(session);
  const live = useSyncExternalStore(liveOps.subscribe, liveOps.getSnapshot);
  const [windowName, setWindow] = useState<WindowName | null>(null);
  const [selected, setSelected] = useState<UpgradeId | null>(null);
  const [saleFlash, setSaleFlash] = useState<{
    amount: number;
    id: number;
  } | null>(null);
  useEffect(() => {
    if (!saleFlash) return;
    const timeout = window.setTimeout(() => setSaleFlash(null), 1700);
    return () => window.clearTimeout(timeout);
  }, [saleFlash]);
  const layer = LAYERS[world.selectedLayerId];
  const config = getLayerProduction(world);
  const game = getLayerGame(world);
  const production = getProductionSummary(game, config);
  const progress = game.phaseElapsedMs / getPhaseDuration(game, config);
  const saleValue = getSaleValue(game, config);
  const missionsReady = getReadyMissionCount(world);
  const eventReady = live.config?.event
    ? getLiveEventOffer(world, live.config.event, live.now).canClaim
    : false;
  const automation = world.layers[world.selectedLayerId]?.automation;
  const stateLabel = !game.running
    ? 'Paused'
    : production.storageFull
      ? 'Storage full'
      : phaseNames[game.phase];
  const sell = () => {
    if (!saleValue) return;
    session.sell();
    setSaleFlash({ amount: saleValue, id: Date.now() });
  };
  return (
    <main
      className={`game-shell biome-${world.selectedLayerId}`}
      style={{ '--resource-color': config.resource.color } as CSSProperties}
    >
      <header className="game-hud">
        <div className="game-brand" aria-label="Abyss Corp">
          <img
            className="brand-emblem"
            src="/brand/abyss-emblem.png"
            alt=""
            width="56"
            height="56"
          />
          <span>
            ABYSS<small>CORP</small>
          </span>
        </div>
        <div className="hud-wallet" title="Corporate credits">
          <span className="coin-medallion">
            <GameIcon name="coin" />
          </span>
          <strong data-testid="credits">{compact.format(world.credits)}</strong>
          <small>CR</small>
        </div>
        <div className="hud-depth">
          <GameIcon name="depth" />
          <strong>
            {layer.depthMeters}
            <small>m</small>
          </strong>
        </div>
        <button
          className={`icon-button settings-trigger${saveStatus === 'error' ? ' has-error' : ''}`}
          aria-label="Settings"
          onClick={() => setWindow('settings')}
        >
          <GameIcon name="settings" />
        </button>
      </header>
      <section className="ocean-stage" aria-label={layer.name}>
        <div className="ocean-caustics" aria-hidden="true" />
        {status === 'ready' && (
          <>
            <div className="location-hud">
              <span className="location-marker" />
              <div>
                <h1>{layer.name}</h1>
                <span>
                  <i className={game.running ? 'running-dot' : ''} />
                  {stateLabel}
                </span>
              </div>
            </div>
            <button
              className={`operation-button${game.running ? ' running' : ''}`}
              onClick={session.toggleRunning}
              aria-label={game.running ? 'Pause operation' : 'Start operation'}
            >
              <GameIcon name={game.running ? 'pause' : 'play'} />
              <span>{game.running ? 'Pause' : 'Start'}</span>
            </button>
            <DepthNavigation
              world={world}
              onSelect={session.select}
              onUnlock={session.unlock}
            />
            <OutpostIllustration
              phase={game.phase}
              progress={progress}
              running={game.running}
              game={game}
              layerId={world.selectedLayerId}
              config={config}
              selected={selected}
              onSelect={setSelected}
            />
            {offlineReport && (
              <div className="offline-toast" role="status">
                <GameIcon name="coin" />
                <div>
                  <strong>+{compact.format(offlineReport.credits)} CR</strong>
                  <span>While you were away</span>
                </div>
                <button
                  className="icon-button"
                  aria-label="Dismiss offline report"
                  onClick={session.dismissOfflineReport}
                >
                  <GameIcon name="close" />
                </button>
              </div>
            )}
            {saleFlash && (
              <span key={saleFlash.id} className="sale-float" role="status">
                +{compact.format(saleFlash.amount)}
                <GameIcon name="coin" />
              </span>
            )}
            <div className="stage-bottom">
              <ProductionPanel game={game} config={config} />
              <button
                className="sell-button"
                disabled={saleValue === 0}
                onClick={sell}
              >
                <span>
                  <GameIcon name="storage" />
                  Sell cargo
                </span>
                <strong>
                  <GameIcon name="coin" />
                  {compact.format(saleValue)}
                </strong>
              </button>
            </div>
          </>
        )}
        {status === 'loading' && (
          <div className="loading-state">
            <GameIcon name="transport" />
            <span>Diving in…</span>
          </div>
        )}
        {error && (
          <div className="game-error" role="alert">
            <p>{error}</p>
            <button
              onClick={() => {
                if (status === 'load-error') void session.initialize();
                else void session.save(true);
              }}
            >
              Retry
            </button>
          </div>
        )}
      </section>
      <section className="upgrade-deck" aria-label="Upgrade your outpost">
        {UPGRADE_IDS.map((id) => (
          <UpgradeCard
            key={id}
            id={id}
            game={game}
            config={config}
            selected={selected === id}
            onUpgrade={(upgradeId) => {
              setSelected(upgradeId);
              session.upgrade(upgradeId);
            }}
          />
        ))}
      </section>
      <nav className="game-dock" aria-label="Game menu">
        {(['research', 'missions', 'crew', 'events'] as const).map((name) => (
          <button
            key={name}
            className={`dock-button${name === 'crew' && automation?.enabled ? ' crew-active' : ''}`}
            onClick={() => setWindow(name)}
            disabled={status !== 'ready'}
          >
            <span className="dock-icon">
              <GameIcon name={windows[name].icon} />
              {name === 'missions' && missionsReady > 0 && (
                <b className="notification-badge">{missionsReady}</b>
              )}
              {name === 'events' && eventReady && (
                <b className="notification-badge">!</b>
              )}
            </span>
            <span>{windows[name].title}</span>
          </button>
        ))}
        <span
          className="save-indicator"
          title={
            saveStatus === 'error'
              ? 'Save failed — open settings'
              : 'Autosave on'
          }
        >
          <i className={saveStatus === 'error' ? 'error' : ''} />
          {saveStatus === 'saving'
            ? 'Saving'
            : saveStatus === 'error'
              ? 'Save error'
              : saveStatus === 'unsaved'
                ? 'Ready'
                : 'Autosaved'}
        </span>
      </nav>
      {windowName && (
        <GameDialog
          title={windows[windowName].title}
          context={
            windowName === 'research' || windowName === 'missions'
              ? 'Fleet command'
              : layer.name
          }
          credits={compact.format(world.credits)}
          navigation={
            <nav className="dialog-navigation" aria-label="Command rooms">
              {(Object.keys(windows) as WindowName[]).map((name) => (
                <button
                  key={name}
                  aria-current={windowName === name ? 'page' : undefined}
                  onClick={() => setWindow(name)}
                >
                  <GameIcon name={windows[name].icon} />
                  <span>{windows[name].title}</span>
                  {name === 'missions' && missionsReady > 0 && (
                    <b>{missionsReady}</b>
                  )}
                </button>
              ))}
            </nav>
          }
          icon={windows[windowName].icon}
          onClose={() => setWindow(null)}
        >
          {(windowName === 'research' || windowName === 'missions') && (
            <ProgressionPanel
              mode={windowName}
              world={world}
              onResearch={session.research}
              onClaim={session.claimMission}
            />
          )}
          {windowName === 'crew' && (
            <AutomationPanel
              world={world}
              onUpgrade={session.upgradeAutomation}
              onToggle={session.toggleAutomation}
            />
          )}
          {windowName === 'events' && (
            <LiveOpsPanel
              liveOps={liveOps}
              session={session}
              world={world}
              onNavigate={setWindow}
            />
          )}
          {windowName === 'settings' && (
            <>
              <section className="settings-section">
                <div className="setting-row">
                  <span>
                    <GameIcon name="check" />
                    Local save
                  </span>
                  <button
                    disabled={saveStatus === 'saving' || status !== 'ready'}
                    onClick={() => {
                      void session.save(true);
                    }}
                  >
                    {saveStatus === 'saving' ? 'Saving…' : 'Save now'}
                  </button>
                </div>
              </section>
              <ServerSavePanel sync={sync} />
              <LiveOpsPanel
                mode="privacy"
                liveOps={liveOps}
                session={session}
                world={world}
              />
            </>
          )}
        </GameDialog>
      )}
    </main>
  );
}
