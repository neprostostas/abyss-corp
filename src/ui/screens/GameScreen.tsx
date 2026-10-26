import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { AccountSaveSnapshot } from '../../application/accountPorts';
import type { GameSession } from '../../application/GameSession';
import { useGameSession } from '../../app/useGameSession';
import { UPGRADE_IDS } from '../../data/balance';
import { LAYERS } from '../../data/layers';
import { getLayerGame, getAutomationOffer } from '../../domain/world';
import {
  getLayerProduction,
  getReadyMissionCount,
  getResearchOffer,
} from '../../domain/progression';
import {
  getPhaseDuration,
  getProductionSummary,
  getSaleValue,
} from '../../domain/game';
import type { UpgradeId } from '../../domain/game';
import { GameIcon } from '../components/GameIcon';
import type { IconName } from '../components/GameIcon';
import { GamePanel } from '../components/GamePanel';
import { RESEARCH_IDS } from '../../data/progression';
import { OutpostIllustration } from '../world/OutpostIllustration';
import { DepthNavigation } from '../panels/DepthNavigation';
import { UpgradeCard } from '../panels/UpgradeCard';
import { ProductionPanel } from '../panels/ProductionPanel';
import { ProgressionPanel } from '../panels/ProgressionPanel';
import { AutomationPanel } from '../panels/AutomationPanel';

type WindowName = 'research' | 'missions' | 'crew' | 'leaderboard' | 'settings';
const windows: Record<WindowName, { title: string; icon: IconName }> = {
  leaderboard: { title: 'Leaders', icon: 'trophy' },
  research: { title: 'Research', icon: 'research' },
  missions: { title: 'Missions', icon: 'missions' },
  crew: { title: 'Crew', icon: 'robot' },
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
  accountPanel,
  leaderboardPanel,
  cloud,
}: {
  session: GameSession;
  accountPanel: ReactNode;
  leaderboardPanel: ReactNode;
  cloud: AccountSaveSnapshot;
}) {
  const { world, status, saveStatus, error, offlineReport } =
    useGameSession(session);
  const [windowName, setWindow] = useState<WindowName | null>(null);
  const [selected, setSelected] = useState<UpgradeId | null>(null);
  const [saleFlash, setSaleFlash] = useState<{
    amount: number;
    id: number;
  } | null>(null);
  useEffect(() => {
    if (!saleFlash) return;
    const timeout = window.setTimeout(() => {
      setSaleFlash(null);
    }, 1700);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [saleFlash]);
  const layer = LAYERS[world.selectedLayerId];
  const config = getLayerProduction(world);
  const game = getLayerGame(world);
  const production = getProductionSummary(game, config);
  const progress = game.phaseElapsedMs / getPhaseDuration(game, config);
  const saleValue = getSaleValue(game, config);
  const missionsReady = getReadyMissionCount(world);
  const researchReady = RESEARCH_IDS.filter(
    (id) => getResearchOffer(world, id).affordable,
  ).length;
  const crewReady = getAutomationOffer(world).affordable;
  const badges: Partial<Record<WindowName, number>> = {
    research: researchReady,
    crew: crewReady ? 1 : 0,
    missions: missionsReady,
  };
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
      className={`game-shell biome-${world.selectedLayerId}${windowName ? ' panel-open' : ''}`}
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
          <strong>{compact.format(world.credits)}</strong>
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
          className={`icon-button settings-trigger${saveStatus === 'error' || cloud.status === 'error' ? ' has-error' : ''}`}
          aria-label="Settings"
          aria-expanded={windowName === 'settings'}
          onClick={() => {
            setWindow(windowName === 'settings' ? null : 'settings');
          }}
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
        {(['research', 'missions', 'crew', 'leaderboard'] as const).map(
          (name) => (
            <button
              key={name}
              className={`dock-button${windowName === name ? ' active-room' : ''}${badges[name] ? ' has-opportunity' : ''}${name === 'crew' && automation?.enabled ? ' crew-active' : ''}`}
              aria-expanded={windowName === name}
              title={
                badges[name]
                  ? `${windows[name].title}: ${String(badges[name])} available`
                  : windows[name].title
              }
              onClick={() => {
                setWindow(windowName === name ? null : name);
              }}
              disabled={status !== 'ready'}
            >
              <span className="dock-icon">
                <GameIcon name={windows[name].icon} />
                {!!badges[name] && (
                  <b className="notification-badge">
                    {name === 'research' || name === 'crew'
                      ? '↑'
                      : badges[name]}
                  </b>
                )}
              </span>
              <span>{windows[name].title}</span>
            </button>
          ),
        )}
        <span
          className="save-indicator"
          title={cloud.error ?? 'Progress syncs to your account automatically'}
        >
          <i
            className={
              saveStatus === 'error' || cloud.status === 'error' ? 'error' : ''
            }
          />
          {saveStatus === 'error'
            ? 'Save error'
            : cloud.status === 'error'
              ? 'Sync paused'
              : cloud.status === 'syncing'
                ? 'Syncing'
                : cloud.status === 'saved'
                  ? 'Synced'
                  : 'Saved locally'}
        </span>
      </nav>
      {windowName && (
        <GamePanel
          title={windows[windowName].title}
          context={
            windowName === 'research' || windowName === 'missions'
              ? 'All outposts'
              : windowName === 'leaderboard'
                ? 'Ocean network'
                : layer.name
          }
          icon={windows[windowName].icon}
          onClose={() => {
            setWindow(null);
          }}
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
          {windowName === 'leaderboard' && leaderboardPanel}
          {windowName === 'settings' && accountPanel}
        </GamePanel>
      )}
    </main>
  );
}
