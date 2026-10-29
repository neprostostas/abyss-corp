import { useDepthNavigation } from '../hooks/useDepthNavigation';
import { getProductionHint } from '../../domain/hints';
import { SPECIALIST_IDS } from '../../data/automation';
import { getSpecialistOffer } from '../../domain/world';
import { LockedDepthScene } from '../world/LockedDepthScene';
import { useSurfaceReady } from '../hooks/useSurfaceReady';
import { BasePanel } from '../panels/BasePanel';
import { OceanPanel } from '../panels/OceanPanel';
import { getPrestigeOffer } from '../../domain/campaign';
import { OceanAtmosphere } from '../world/OceanAtmosphere';
import { getExpeditionOffer } from '../../domain/expeditions';
import { ExpeditionsPanel } from '../panels/ExpeditionsPanel';
import {
  DRAWER_DURATION_MS,
  SURFACE_TRAVEL_MS,
  useGameDrawer,
} from '../hooks/useGameDrawer';
import { getFirstStep } from '../../domain/firstSteps';
import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { AccountSaveSnapshot } from '../../application/accountPorts';
import type { SessionSnapshot } from '../../application/GameSession';
import type { GameSession } from '../../application/GameSession';
import { useGameSession } from '../../app/useGameSession';
import { UPGRADE_IDS } from '../../data/balance';
import type { LayerId } from '../../data/layers';
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
import { GameHud } from '../components/GameHud';
import { GameIcon } from '../components/GameIcon';
import type { IconName } from '../components/GameIcon';
import { GamePanel } from '../components/GamePanel';
import { RESEARCH_IDS } from '../../data/progression';
import { DepthScene } from '../world/DepthScene';
import { DepthNavigation } from '../panels/DepthNavigation';
import { UpgradeCard } from '../panels/UpgradeCard';
import { ProductionPanel } from '../panels/ProductionPanel';
import { ClaimAllMissions, ProgressionPanel } from '../panels/ProgressionPanel';
import { AutomationPanel } from '../panels/AutomationPanel';

type WindowName =
  'ocean' | 'research' | 'missions' | 'crew' | 'leaderboard' | 'settings';
const windows: Record<WindowName, { title: string; icon: IconName }> = {
  ocean: { title: 'Ocean', icon: 'map' },
  leaderboard: { title: 'Leaders', icon: 'trophy' },
  research: { title: 'Research', icon: 'research' },
  missions: { title: 'Missions', icon: 'missions' },
  crew: { title: 'Base', icon: 'robot' },
  settings: { title: 'Profile', icon: 'profile' },
};
const canSwapPanels = (from: WindowName, to: WindowName) =>
  from !== 'ocean' && to !== 'ocean';
const closeDuration = (name: WindowName) =>
  name === 'ocean' ? SURFACE_TRAVEL_MS : DRAWER_DURATION_MS;
const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
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
    closeDuration,
    canSwapPanels,
  );
  useEffect(() => {
    try {
      window.sessionStorage.removeItem('abyss-corp.show-connections');
    } catch {
      /* Optional return navigation. */
    }
  }, []);
  useEffect(() => {
    if (!offlineReport || offlineReport.credits <= 0) return;
    const timeout = window.setTimeout(session.dismissOfflineReport, 3000);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [offlineReport, session]);
  const windowName = drawer.name;
  const surfaceReady = useSurfaceReady(windowName === 'ocean' && drawer.open);
  const [previewDepth, setPreviewDepth] = useState<LayerId | null>(null);
  useDepthNavigation({
    drawer,
    world,
    session,
    previewDepth,
    setPreviewDepth,
    surfaceReady,
  });

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
  const crewReady =
    (getAutomationOffer(world).affordable ? 1 : 0) +
    SPECIALIST_IDS.filter((id) => getSpecialistOffer(world, id).affordable)
      .length;
  const badges: Partial<Record<WindowName, number>> = {
    research: researchReady,
    crew: crewReady + (getPrestigeOffer(world).canPrestige ? 1 : 0),
    missions: missionsReady,
  };
  const automation = world.layers[world.selectedLayerId]?.automation;
  const firstStep = status === 'ready' ? getFirstStep(world) : null;
  const contextualHint = getProductionHint(world);
  const bottleneck =
    status === 'ready' && firstStep === null ? contextualHint.upgrade : null;
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
    : (firstStepLabel ?? contextualHint.text);
  const guidedUpgrade =
    firstStep?.kind === 'upgrade' ? firstStep.upgradeId : null;
  const upgrade = useCallback(
    (id: UpgradeId) => {
      setSelected(id);
      session.upgrade(id, world.selectedLayerId);
    },
    [session, world.selectedLayerId],
  );
  const selectDepth = useCallback(
    (id: LayerId) => {
      setPreviewDepth(null);
      session.select(id);
    },
    [session],
  );
  const unlockDepth = useCallback(
    (id: LayerId) => {
      setPreviewDepth(null);
      session.unlock(id);
    },
    [session],
  );
  const togglePanel = drawer.toggle;
  const openProfile = useCallback(() => {
    togglePanel('settings');
  }, [togglePanel]);
  const sell = () => {
    if (!saleValue) return;
    const earned = session.sell(world.selectedLayerId);
    if (earned <= 0) return;
    playSaleFeedback();
    setSaleFlash({ amount: earned, id: Date.now() });
  };
  return (
    <main
      className={`game-shell${previewDepth ? ' previewing-depth' : ''} biome-${windowName === 'ocean' && drawer.open ? 'ocean' : (previewDepth ?? world.selectedLayerId)}${drawer.open ? ' panel-open' : ''}${windowName === 'ocean' ? ` surface-mode surface-${drawer.phase ?? 'opening'}` : ''}`}
      style={
        {
          '--resource-color': config.resource.color,
          '--surface-travel': `${String(SURFACE_TRAVEL_MS)}ms`,
          '--drawer-duration': `${String(DRAWER_DURATION_MS)}ms`,
        } as CSSProperties
      }
    >
      <OceanAtmosphere
        layerId={previewDepth ?? world.selectedLayerId}
        surface={windowName === 'ocean' && drawer.open}
      />
      <div className="ocean-caustics" aria-hidden="true" />
      <GameHud
        credits={world.credits}
        offlineReport={offlineReport}
        ocean={windowName === 'ocean'}
        surfaceReady={surfaceReady}
        hasError={saveStatus === 'error' || cloud.status === 'error'}
        profileOpen={drawer.open && windowName === 'settings'}
        profileTrigger={profileTrigger}
        walletRef={walletRef}
        onDismiss={session.dismissOfflineReport}
        onProfile={openProfile}
      />
      <button
        className={`ocean-entry${windowName === 'ocean' ? ' is-active' : ''}`}
        aria-label="Ocean"
        aria-expanded={windowName === 'ocean' && drawer.open}
        onClick={() => {
          drawer.toggle('ocean');
        }}
      >
        <GameIcon name="map" />
      </button>
      <section
        className="ocean-stage"
        aria-label={layer.name}
        inert={windowName === 'ocean'}
      >
        {status === 'ready' && (
          <>
            {stateLabel && (
              <div className="location-hud production-hint">
                <span id="production-status" role="status">
                  {stateLabel}
                </span>
              </div>
            )}
            <DepthNavigation
              world={world}
              viewedDepth={previewDepth ?? world.selectedLayerId}
              onSelect={selectDepth}
              onPreview={setPreviewDepth}
              onUnlock={unlockDepth}
            />
            <DepthScene
              viewedLayerId={previewDepth ?? world.selectedLayerId}
              lockedScene={
                previewDepth ? (
                  <LockedDepthScene
                    onExplore={(id) => {
                      if (world.layers[id]) {
                        setPreviewDepth(null);
                        session.select(id);
                      } else setPreviewDepth(id);
                    }}
                    depth={previewDepth}
                    world={world}
                    onClose={() => {
                      setPreviewDepth(null);
                    }}
                    onUnlock={(id) => {
                      session.unlock(id);
                      setPreviewDepth(null);
                    }}
                  />
                ) : undefined
              }
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
            <div
              className="stage-bottom"
              inert={!!previewDepth}
              aria-hidden={!!previewDepth}
            >
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
                    Sell
                  </span>
                  <strong>
                    <GameIcon name="coin" />
                    <span className="sale-value">
                      {compact.format(saleValue)}
                    </span>
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
      <section
        className="upgrade-deck"
        aria-label={`Upgrade ${layer.name}`}
        inert={windowName === 'ocean' || !!previewDepth}
        aria-hidden={!!previewDepth}
      >
        {UPGRADE_IDS.map((id) => (
          <UpgradeCard
            key={`${world.selectedLayerId}-${id}`}
            id={id}
            game={game}
            config={config}
            selected={selected === id}
            limiting={bottleneck === id}
            guided={guidedUpgrade === id}
            onUpgrade={upgrade}
          />
        ))}
      </section>
      <nav
        className="game-dock"
        aria-label="Game menu"
        inert={windowName === 'ocean'}
      >
        {(['research', 'missions', 'crew', 'leaderboard'] as const).map(
          (name) => (
            <button
              key={name}
              className={`dock-button${drawer.open && windowName === name ? ' active-room' : ''}${badges[name] ? ' has-opportunity' : ''}${name === 'crew' && automation?.enabled ? ' crew-active' : ''}`}
              aria-expanded={drawer.open && windowName === name}
              aria-label={windows[name].title}
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
              <span className="dock-label" aria-hidden="true">
                {windows[name].title}
              </span>
            </button>
          ),
        )}
      </nav>
      {windowName && (
        <GamePanel
          key={windowName === 'ocean' ? 'ocean' : 'sidebar'}
          open={drawer.open}
          surface={windowName === 'ocean'}
          profile={windowName === 'settings'}
          title={windows[windowName].title}
          context={
            windowName === 'ocean'
              ? 'Global network'
              : windowName === 'research' || windowName === 'missions'
                ? 'All outposts'
                : windowName === 'leaderboard'
                  ? 'Ocean network'
                  : windowName === 'settings'
                    ? 'Account'
                    : layer.name
          }
          icon={windows[windowName].icon}
          onClose={drawer.close}
          headerAction={
            windowName === 'missions' ? (
              <ClaimAllMissions world={world} onClaim={session.claimMission} />
            ) : undefined
          }
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
          {windowName === 'ocean' && (
            <OceanPanel
              world={world}
              onDive={() => {
                setPreviewDepth(null);
                drawer.close();
              }}
            />
          )}
          {windowName === 'crew' && (
            <BasePanel world={world} session={session}>
              <AutomationPanel
                world={world}
                onSpecialist={(id) => {
                  session.upgradeSpecialist(id, world.selectedLayerId);
                }}
                onUpgrade={() => {
                  session.upgradeAutomation(world.selectedLayerId);
                }}
                onToggle={() => {
                  session.toggleAutomation(world.selectedLayerId);
                }}
              />
            </BasePanel>
          )}
          {windowName === 'leaderboard' && leaderboardPanel}
          {windowName === 'settings' && accountPanel}
        </GamePanel>
      )}
    </main>
  );
}
