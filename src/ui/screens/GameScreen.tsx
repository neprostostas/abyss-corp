import { getExpeditionOffer } from '../../domain/expeditions';
import { ExpeditionsPanel } from '../panels/ExpeditionsPanel';
import { DRAWER_DURATION_MS, useGameDrawer } from '../hooks/useGameDrawer';
import { getFirstStep } from '../../domain/firstSteps';
import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { AccountSaveSnapshot } from '../../application/accountPorts';
import type { SessionSnapshot } from '../../application/GameSession';
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
import { useSaleFeedback } from '../feedback/useSaleFeedback';
import { Brand } from '../components/Brand';
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
  settings: { title: 'Profile', icon: 'profile' },
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
interface GameScreenProps {
  session: GameSession;
  accountPanel: ReactNode;
  profileTrigger?: ReactNode;
  leaderboardPanel: ReactNode;
  cloud: AccountSaveSnapshot;
}

export function GameScreen(props: GameScreenProps) {
  const snapshot = useGameSession(props.session);
  return <GameBoard {...props} snapshot={snapshot} />;
}

function GameBoard({
  session,
  accountPanel,
  profileTrigger,
  leaderboardPanel,
  cloud,
  snapshot,
}: GameScreenProps & { snapshot: SessionSnapshot }) {
  const { world, status, saveStatus, error, offlineReport } = snapshot;
  const {
    walletRef,
    sellRef,
    play: playSaleFeedback,
  } = useSaleFeedback(world.selectedLayerId);
  const drawer = useGameDrawer<WindowName>(
    (() => {
      try {
        return window.sessionStorage.getItem('abyss-corp.show-connections') ===
          '1'
          ? 'settings'
          : undefined;
      } catch {
        return undefined;
      }
    })(),
  );
  useEffect(() => {
    try {
      window.sessionStorage.removeItem('abyss-corp.show-connections');
    } catch {
      /* Optional return navigation. */
    }
  }, []);
  const windowName = drawer.name;
  const [selected, setSelected] = useState<UpgradeId | null>(null);
  const [saleFlash, setSaleFlash] = useState<{
    amount: number;
    id: number;
  } | null>(null);
  const [viewLayerId, setViewLayerId] = useState(world.selectedLayerId);
  if (viewLayerId !== world.selectedLayerId) {
    setViewLayerId(world.selectedLayerId);
    setSelected(null);
    setSaleFlash(null);
  }
  useEffect(() => {
    if (!saleFlash) return;
    const timeout = window.setTimeout(() => {
      setSaleFlash(null);
    }, 1000);
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
  const expedition = getExpeditionOffer(world);
  const missionsReady =
    getReadyMissionCount(world) +
    (expedition.ready || expedition.canStart ? 1 : 0);
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
  const firstStep = status === 'ready' ? getFirstStep(world) : null;
  const bottleneck =
    status === 'ready' &&
    game.running &&
    firstStep === null &&
    (production.storageFull || !production.fullyUpgraded)
      ? production.bottleneck
      : null;
  const bottleneckLabels: Record<UpgradeId, string> = {
    mining: 'Slowest: drill',
    transport: 'Slowest: submarine',
    processing: 'Slowest: refinery',
    storage: 'Storage full · sell cargo',
  };
  const firstUpgradeNames: Record<UpgradeId, string> = {
    mining: 'drill',
    transport: 'submarine',
    processing: 'refinery',
    storage: 'storage',
  };
  const firstStepLabel =
    firstStep?.kind === 'produce'
      ? 'Mine → refine → sell'
      : firstStep?.kind === 'sell'
        ? 'Sell cargo to earn credits'
        : firstStep?.kind === 'upgrade'
          ? `Upgrade your ${firstUpgradeNames[firstStep.upgradeId]}`
          : null;
  const stateLabel = !game.running
    ? 'Paused'
    : (firstStepLabel ??
      (bottleneck ? bottleneckLabels[bottleneck] : phaseNames[game.phase]));
  const guidedUpgrade =
    firstStep?.kind === 'upgrade' ? firstStep.upgradeId : null;
  const sell = () => {
    if (!saleValue) return;
    const earned = session.sell(world.selectedLayerId);
    if (earned <= 0) return;
    playSaleFeedback();
    setSaleFlash({ amount: earned, id: Date.now() });
  };
  return (
    <main
      className={`game-shell biome-${world.selectedLayerId}${drawer.open ? ' panel-open' : ''}`}
      style={
        {
          '--resource-color': config.resource.color,
          '--drawer-duration': `${String(DRAWER_DURATION_MS)}ms`,
        } as CSSProperties
      }
    >
      <header className="game-hud">
        <div className="game-brand">
          <Brand />
        </div>
        <div
          ref={walletRef}
          className="hud-wallet"
          title="Credits shared across all depths"
        >
          <span className="coin-medallion">
            <GameIcon name="coin" />
          </span>
          <strong>{compact.format(world.credits)}</strong>
          <small>CR</small>
        </div>
        <button
          className={`icon-button settings-trigger${saveStatus === 'error' || cloud.status === 'error' ? ' has-error' : ''}`}
          aria-label="Profile"
          aria-expanded={drawer.open && windowName === 'settings'}
          onClick={() => {
            drawer.toggle('settings');
          }}
        >
          {profileTrigger ?? <GameIcon name="profile" />}
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
                <span
                  id="production-status"
                  className={
                    bottleneck || firstStep ? 'production-limited' : undefined
                  }
                  role={firstStep ? 'status' : undefined}
                >
                  <i className={game.running ? 'running-dot' : ''} />
                  {stateLabel}
                </span>
              </div>
            </div>
            <DepthNavigation
              world={world}
              onSelect={session.select}
              onUnlock={session.unlock}
            />
            <OutpostIllustration
              key={world.selectedLayerId}
              phase={game.phase}
              progress={progress}
              running={game.running}
              game={game}
              layerId={world.selectedLayerId}
              config={config}
              selected={selected}
              bottleneck={guidedUpgrade ?? bottleneck}
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
            <div className="stage-bottom">
              <ProductionPanel game={game} config={config} />
              <div className="sell-control">
                {saleFlash && (
                  <span key={saleFlash.id} className="sale-float" role="status">
                    +{compact.format(saleFlash.amount)} CR
                  </span>
                )}
                <button
                  ref={sellRef}
                  className={`sell-button${production.storageFull ? ' cargo-full' : ''}${firstStep?.kind === 'sell' ? ' first-step-target' : ''}`}
                  aria-describedby={
                    firstStep?.kind === 'sell' ? 'production-status' : undefined
                  }
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
      <section className="upgrade-deck" aria-label={`Upgrade ${layer.name}`}>
        {UPGRADE_IDS.map((id) => (
          <UpgradeCard
            key={`${world.selectedLayerId}-${id}`}
            id={id}
            game={game}
            config={config}
            selected={selected === id}
            limiting={bottleneck === id}
            guided={guidedUpgrade === id}
            onUpgrade={(upgradeId) => {
              setSelected(upgradeId);
              session.upgrade(upgradeId, world.selectedLayerId);
            }}
          />
        ))}
      </section>
      <nav className="game-dock" aria-label="Game menu">
        {(['research', 'missions', 'crew', 'leaderboard'] as const).map(
          (name) => (
            <button
              key={name}
              className={`dock-button${drawer.open && windowName === name ? ' active-room' : ''}${badges[name] ? ' has-opportunity' : ''}${name === 'crew' && automation?.enabled ? ' crew-active' : ''}`}
              aria-expanded={drawer.open && windowName === name}
              title={
                badges[name]
                  ? `${windows[name].title}: ${String(badges[name])} available`
                  : windows[name].title
              }
              onClick={() => {
                drawer.toggle(name);
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
      </nav>
      {windowName && (
        <GamePanel
          open={drawer.open}
          title={windows[windowName].title}
          context={
            windowName === 'research' || windowName === 'missions'
              ? 'All outposts'
              : windowName === 'leaderboard'
                ? 'Ocean network'
                : windowName === 'settings'
                  ? 'Account'
                  : layer.name
          }
          icon={windows[windowName].icon}
          onClose={drawer.close}
        >
          {(windowName === 'research' || windowName === 'missions') && (
            <ProgressionPanel
              mode={windowName}
              world={world}
              expeditions={
                <ExpeditionsPanel
                  world={world}
                  onStart={session.startExpedition}
                  onClaim={session.claimExpedition}
                />
              }
              onResearch={session.research}
              onClaim={session.claimMission}
            />
          )}
          {windowName === 'crew' && (
            <AutomationPanel
              world={world}
              onUpgrade={() => {
                session.upgradeAutomation(world.selectedLayerId);
              }}
              onToggle={() => {
                session.toggleAutomation(world.selectedLayerId);
              }}
            />
          )}
          {windowName === 'leaderboard' && leaderboardPanel}
          {windowName === 'settings' && accountPanel}
        </GamePanel>
      )}
    </main>
  );
}
