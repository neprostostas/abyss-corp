import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { IconAssetsContext } from '../src/ui/components/iconAssets';
import { GameSession } from '../src/application/GameSession';
import { GuestSaveRepository } from '../src/infrastructure/persistence/GuestSaveRepository';
import { browserClock } from '../src/infrastructure/clock/browserClock';
import { useGameSession } from '../src/app/useGameSession';
import {
  getLayerGame,
  getAutomationOffer,
  getUnlockOffer,
} from '../src/domain/world';
import {
  getLayerProduction,
  getReadyMissionCount,
} from '../src/domain/progression';
import { getProductionHint } from '../src/domain/hints';
import { getFirstStep } from '../src/domain/firstSteps';
import {
  getPhaseDuration,
  getUpgradeOffer,
  getSaleValue,
  getStorageCapacity,
  getProductionSummary,
  getProcessingDuration,
} from '../src/domain/game';
import type { UpgradeId } from '../src/domain/game';
import { LAYERS, LAYER_IDS } from '../src/data/layers';
import { GameIcon } from '../src/ui/components/GameIcon';
import type { IconName } from '../src/ui/components/GameIcon';
import { Brand } from '../src/ui/components/Brand';
import { GamePanel } from '../src/ui/components/GamePanel';
import { ProgressionPanel } from '../src/ui/panels/ProgressionPanel';
import { ExpeditionsPanel } from '../src/ui/panels/ExpeditionsPanel';
import { BasePanel } from '../src/ui/panels/BasePanel';
import { AutomationPanel } from '../src/ui/panels/AutomationPanel';
import { isolateStorage } from './storage';
import { WorldScene } from './WorldScene';
import { playFeedback } from './audio';
import { tutorialUpgradeTarget } from './tutorial';
import {
  tutorialKey,
  readTutorial,
  nextTutorial,
  tutorialCopy,
  tutorialSteps,
  type TutorialStep,
} from './tutorial';
import '../src/ui/styles/theme.css';
import '../src/ui/styles/game.css';
import '../src/ui/styles/panels.css';
import '../src/ui/styles/account.css';
import './immersive.css';
const names: Record<UpgradeId, string> = {
  mining: 'Extraction drill',
  transport: 'Cargo submarine',
  processing: 'Refinery',
  storage: 'Cargo depot',
};
const info: Record<UpgradeId, string> = {
  mining: 'Extracts the next batch from the seabed.',
  transport:
    'Carries raw crystals to the outpost, then returns for another load.',
  processing: 'Turns delivered crystals into valuable cargo.',
  storage:
    'Holds raw supplies and finished cargo. Sell a shipment to make room.',
};
type Room = 'research' | 'missions' | 'base' | 'depths' | 'profile';
const numberFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const format = (n: number) => numberFormat.format(n);
const rooms: Record<Room, { title: string; icon: IconName }> = {
  research: { title: 'Research', icon: 'research' },
  missions: { title: 'Missions', icon: 'missions' },
  base: { title: 'Base workshop', icon: 'robot' },
  depths: { title: 'Dive sites', icon: 'map' },
  profile: { title: 'Captain', icon: 'profile' },
};
function PrototypeGame() {
  const [session] = useState(
    () =>
      new GameSession(
        new GuestSaveRepository(() =>
          isolateStorage(localStorage, 'abyss-corp.prototype3d.'),
        ),
        browserClock,
      ),
  );
  const snapshot = useGameSession(session);
  const { world, status } = snapshot;
  const game = getLayerGame(world);
  const config = getLayerProduction(world);
  const layer = LAYERS[world.selectedLayerId];
  const [selected, setSelected] = useState<UpgradeId | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [anchor, setAnchor] = useState<{
    x: number;
    y: number;
    visible: boolean;
  } | null>(null);
  const [notice, setNotice] = useState('');
  const [sound, setSound] = useState(
    () => localStorage.getItem('abyss-corp.prototype3d.sound') === 'on',
  );
  const feedback = (kind: 'tap' | 'sale' | 'upgrade') => {
    if (sound) playFeedback(kind);
  };
  const [tutorial, setTutorial] = useState<TutorialStep | null>(() =>
    readTutorial(localStorage.getItem(tutorialKey)),
  );
  const [inspected, setInspected] = useState<UpgradeId | null>(null);
  const [guideAnchor, setGuideAnchor] = useState<{
    x: number;
    y: number;
    visible: boolean;
  } | null>(null);
  const upgradeTarget = tutorialUpgradeTarget(game);
  const guide =
    tutorial && tutorial !== 'done' && world.selectedLayerId === 'shallows'
      ? tutorial === 'upgrade' && upgradeTarget
        ? {
            ...tutorialCopy.upgrade,
            target: upgradeTarget,
            text: `Invest your credits in the ${names[upgradeTarget].toLowerCase()}. Open it and buy the next level. Sell more cargo if you need credits.`,
            action: `Inspect ${names[upgradeTarget].toLowerCase()}`,
          }
        : tutorialCopy[tutorial]
      : null;
  const advanceTutorial = (step: TutorialStep) => {
    setTutorial(step);
    localStorage.setItem(tutorialKey, step);
    setInspected(null);
    setGuideAnchor(null);
  };
  useEffect(() => {
    if (status !== 'ready' || tutorial !== null) return;
    advanceTutorial(
      Object.values(game.levels).some((level) => level > 1) ? 'done' : 'mining',
    );
  }, [status, tutorial]);
  useEffect(() => {
    if (
      !tutorial ||
      tutorial === 'done' ||
      world.selectedLayerId !== 'shallows' ||
      status !== 'ready'
    )
      return;
    const next = nextTutorial(tutorial, game, inspected);
    if (next !== tutorial) advanceTutorial(next);
  }, [tutorial, game, inspected, world.selectedLayerId, status]);
  const [intro, setIntro] = useState(
    () =>
      localStorage.getItem('abyss-corp.prototype3d.immersive-intro') !== 'seen',
  );
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelected(null);
      }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);
  useEffect(() => {
    setSelected(null);
    setAnchor(null);
  }, [world.selectedLayerId]);
  useEffect(() => {
    if (snapshot.offlineReport) {
      if (snapshot.offlineReport.credits > 0)
        setNotice(
          `Your crew earned ${Math.floor(snapshot.offlineReport.credits)} CR while away`,
        );
      session.dismissOfflineReport();
    }
  }, [snapshot.offlineReport, session]);
  const select = (id: UpgradeId) => {
    feedback('tap');
    if (intro) {
      setIntro(false);
      localStorage.setItem('abyss-corp.prototype3d.immersive-intro', 'seen');
    }
    setSelected(id);
    setInspected(id);
    setRoom(null);
  };
  const sale = getSaleValue(game, config);
  const capacity = getStorageCapacity(game, config);
  const offer = selected ? getUpgradeOffer(game, selected, config) : null;
  const summary = getProductionSummary(game, config);
  const first = getFirstStep(world);
  const hint = getProductionHint(world);
  const sell = () => {
    const n = session.sell();
    if (n) {
      feedback('sale');
      setNotice(`Shipment sold · +${format(n)} CR`);
      if (tutorial === 'sell' && world.selectedLayerId === 'shallows') {
        advanceTutorial('upgrade');
        setSelected(null);
      }
    }
  };
  const toggleRoom = (id: Room) => {
    setRoom(room === id ? null : id);
    setSelected(null);
  };
  const dismissIntro = () => {
    setIntro(false);
    localStorage.setItem('abyss-corp.prototype3d.immersive-intro', 'seen');
  };
  const anchorStyle = anchor?.visible
    ? {
        left: `clamp(16px, ${anchor.x * 100}vw + 26px, calc(100vw - 316px))`,
        top: `clamp(98px, ${anchor.y * 100}dvh - 100px, calc(100dvh - 355px))`,
      }
    : undefined;
  return (
    <main className={`dive-app${room ? ' room-visible' : ''}`}>
      <div className="dive-world">
        <WorldScene
          game={game}
          config={config}
          layerId={world.selectedLayerId}
          viewedLayerId={world.selectedLayerId}
          phase={game.phase}
          progress={game.phaseElapsedMs / getPhaseDuration(game, config)}
          running={game.running && status === 'ready'}
          selected={selected}
          bottleneck={null}
          onSelect={select}
          onAnchor={setAnchor}
          onDeselect={() => setSelected(null)}
          guideTarget={guide && !intro && !room ? guide.target : null}
          onGuideAnchor={setGuideAnchor}
        />
      </div>
      <div className="dive-top">
        <button
          className="dive-brand"
          data-panel-toggle
          aria-label="Captain profile"
          onClick={() => toggleRoom('profile')}
        >
          <Brand />
        </button>
        <div className="dive-wallet">
          <GameIcon name="coin" />
          <strong>{format(world.credits)}</strong>
          <span>CR</span>
        </div>
      </div>
      <button
        className="dive-location"
        data-panel-toggle
        onClick={() => toggleRoom('depths')}
        aria-expanded={room === 'depths'}
      >
        <GameIcon name="map" />
        <span>
          <small>{layer.depthMeters} m · OUTPOST</small>
          <b>{layer.name}</b>
        </span>
        <GameIcon name="arrow" className="dive-chevron" />
      </button>
      <nav className="dive-nav" aria-label="Outpost services">
        {(['research', 'missions', 'base'] as const).map((id) => (
          <button
            key={id}
            aria-label={rooms[id].title}
            title={rooms[id].title}
            aria-expanded={room === id}
            data-panel-toggle
            className={`dive-service ${room === id ? 'active' : ''}`}
            onClick={() => toggleRoom(id)}
          >
            <GameIcon name={rooms[id].icon} />
            <span>{id === 'base' ? 'Workshop' : rooms[id].title}</span>
            {id === 'missions' && getReadyMissionCount(world) > 0 && (
              <i>{getReadyMissionCount(world)}</i>
            )}
          </button>
        ))}
      </nav>
      <div className="dive-bottom">
        <button
          className="dive-stock"
          onClick={() => select('storage')}
          aria-label="Inspect cargo depot"
        >
          <GameIcon name="storage" />
          <span>
            <small>{config.resource.refinedName.toUpperCase()}</small>
            <b>
              {game.refined}
              <em> / {capacity}</em>
            </b>
          </span>
          <span className="dive-raw">
            {game.raw} {config.resource.unit}
          </span>
        </button>
        <button
          className={`dive-sell ${sale ? 'ready' : ''}`}
          disabled={!sale}
          onClick={sell}
        >
          <GameIcon name="coin" />
          <span>
            Sell shipment<strong>{format(sale)} CR</strong>
          </span>
        </button>
      </div>
      {!selected && !room && !intro && !guide && (
        <div className="dive-hint">
          <span className="dive-signal" />
          {first?.kind === 'produce'
            ? 'Watch your crew: extract → deliver → refine'
            : first?.kind === 'sell'
              ? 'Your first cargo is ready. Sell a shipment.'
              : hint.text}
        </div>
      )}
      <div className="dive-equipment" aria-label="Select equipment">
        {(['mining', 'transport', 'processing', 'storage'] as const).map(
          (id) => (
            <button
              key={id}
              className="icon-button"
              aria-label={`Inspect ${names[id]}`}
              title={names[id]}
              aria-pressed={selected === id}
              onClick={() => select(id)}
            >
              <GameIcon name={id} />
            </button>
          ),
        )}
      </div>
      {selected && !room && (
        <section
          className="dive-inspector"
          style={anchorStyle}
          aria-label={names[selected]}
        >
          <div className="dive-inspector-head">
            <span className="dive-equipment-icon">
              <GameIcon name={selected} />
            </span>
            <div>
              <small>OUTPOST EQUIPMENT · LV {game.levels[selected]}</small>
              <h2>{names[selected]}</h2>
            </div>
            <button
              ref={closeRef}
              className="icon-button"
              aria-label="Close equipment"
              onClick={() => setSelected(null)}
            >
              <GameIcon name="close" />
            </button>
          </div>
          <p>
            {selected === 'mining'
              ? `Extracts ${config.resource.unit} from the seabed.`
              : selected === 'processing'
                ? `Turns ${config.resource.unit} into ${config.resource.refinedName.toLowerCase()}.`
                : info[selected]}
          </p>
          <div className="dive-machine-status">
            <span className="dive-signal" />
            {!game.running
              ? 'Production paused'
              : selected === 'transport'
                ? summary.dockBlocked
                  ? 'Dock waiting · raw storage full'
                  : {
                      mining: 'Waiting at extraction site',
                      delivering: 'Delivering raw cargo',
                      returning: 'Returning to the drill',
                    }[game.phase]
                : selected === 'storage'
                  ? `${game.refined} ready · ${game.raw} raw · ${capacity} capacity`
                  : selected === 'processing'
                    ? summary.processorBlocked
                      ? 'Output full · sell a shipment'
                      : game.processingElapsedMs === null
                        ? 'Waiting for raw cargo'
                        : 'Refining cargo'
                    : game.phase === 'mining'
                      ? 'Extraction cycle active'
                      : 'Waiting for the submarine'}
          </div>
          {selected !== 'storage' && (
            <div
              className="dive-cycle-meter"
              role="progressbar"
              aria-label="Equipment cycle"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(
                100 *
                  (selected === 'processing'
                    ? (game.processingElapsedMs ?? 0) /
                      getProcessingDuration(game, config)
                    : game.phaseElapsedMs / getPhaseDuration(game, config)),
              )}
            >
              <span
                style={{
                  width: `${100 * (selected === 'processing' ? (game.processingElapsedMs ?? 0) / getProcessingDuration(game, config) : game.phaseElapsedMs / getPhaseDuration(game, config))}%`,
                }}
              />
            </div>
          )}
          {offer && (
            <div className="dive-upgrade-detail">
              <small>
                {selected === 'storage' ? 'CAPACITY' : 'CYCLE TIME'}
              </small>
              <b>
                {selected === 'storage'
                  ? offer.current.value
                  : `${(offer.current.value / 1000).toFixed(1)}s`}{' '}
                <GameIcon name="arrow" />{' '}
                {offer.next
                  ? selected === 'storage'
                    ? offer.next.value
                    : `${(offer.next.value / 1000).toFixed(1)}s`
                  : 'MAX'}
              </b>
            </div>
          )}
          <button
            className="wide-button dive-upgrade"
            disabled={!offer?.affordable}
            onClick={() => {
              session.upgrade(selected);
              feedback('upgrade');
              setNotice(`${names[selected]} upgraded`);
              if (
                tutorial === 'upgrade' &&
                world.selectedLayerId === 'shallows' &&
                offer?.affordable
              ) {
                advanceTutorial('done');
                setNotice(
                  'Outpost ready! Keep upgrading, research new technology and explore deeper.',
                );
                void session.save(true);
              }
            }}
          >
            {offer?.next ? (
              <>
                <span>Upgrade equipment</span>
                <span>
                  <GameIcon name="coin" />
                  {offer.next.cost}
                </span>
              </>
            ) : (
              'Maximum level reached'
            )}
          </button>
          {offer?.next && !offer.affordable && (
            <small className="dive-shortfall">
              {format(Math.max(0, offer.next.cost - world.credits))} more
              credits needed
            </small>
          )}
          {selected === 'storage' && (
            <button className="wide-button" disabled={!sale} onClick={sell}>
              Sell cargo · {format(sale)} CR
            </button>
          )}
        </section>
      )}
      {notice && (
        <div className="dive-toast" role="status">
          <GameIcon name="check" />
          {notice}
        </div>
      )}
      {snapshot.saveStatus === 'error' && (
        <button
          className="dive-save-error"
          onClick={() => void session.save(true)}
        >
          Save failed · retry
        </button>
      )}
      {room && (
        <GamePanel
          open
          title={rooms[room].title}
          icon={rooms[room].icon}
          context={
            room === 'depths'
              ? 'Ocean navigation'
              : room === 'profile'
                ? 'Local development captain'
                : layer.name
          }
          onClose={() => setRoom(null)}
        >
          {(room === 'research' || room === 'missions') && (
            <ProgressionPanel
              mode={room}
              world={world}
              onResearch={session.research}
              onClaim={session.claimMission}
              expeditions={
                <ExpeditionsPanel
                  world={world}
                  onStart={session.startExpedition}
                  onClaim={session.claimExpedition}
                />
              }
            />
          )}
          {room === 'base' && (
            <BasePanel world={world} session={session}>
              <AutomationPanel
                world={world}
                onSpecialist={(id) => session.upgradeSpecialist(id)}
                onUpgrade={() => session.upgradeAutomation()}
                onToggle={() => session.toggleAutomation()}
              />
            </BasePanel>
          )}
          {room === 'depths' && (
            <div className="dive-sites">
              <p>
                Explore Crystal shallows and the gold seams of Golden trench.
                Deeper outposts currently share the shallow-water environment.
              </p>
              {LAYER_IDS.map((id) => (
                <button
                  key={id}
                  disabled={
                    !world.layers[id] && !getUnlockOffer(world, id).canUnlock
                  }
                  aria-pressed={id === world.selectedLayerId}
                  onClick={() => {
                    if (!world.layers[id]) session.unlock(id);
                    session.select(id);
                    setRoom(null);
                  }}
                >
                  <GameIcon name="map" />
                  <span>
                    <b>{LAYERS[id].name}</b>
                    <small>
                      {LAYERS[id].depthMeters} m ·{' '}
                      {world.layers[id]
                        ? 'Outpost established'
                        : `${format(getUnlockOffer(world, id).cost)} CR`}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          )}
          {room === 'profile' && (
            <section className="guest-profile">
              <span className="account-avatar">
                <GameIcon name="profile" />
              </span>
              <h2>Local captain</h2>
              <p>
                Progress stays on this device. Your 2D account and cloud save
                are unchanged.
              </p>
              <button
                className="wide-button"
                onClick={() => void session.save(true)}
              >
                Save progress
              </button>
              <button
                className="wide-button"
                onClick={() => {
                  setRoom(null);
                  setIntro(true);
                }}
              >
                Camera & interaction guide
              </button>
              <p>Sales module: {getAutomationOffer(world).level}</p>
              <button
                className="wide-button"
                aria-pressed={sound}
                onClick={() => {
                  setSound(!sound);
                  localStorage.setItem(
                    'abyss-corp.prototype3d.sound',
                    sound ? 'off' : 'on',
                  );
                  if (!sound) playFeedback('tap');
                }}
              >
                Sound · {sound ? 'On' : 'Off'}
              </button>
              <button
                className="wide-button"
                onClick={() => {
                  session.select('shallows');
                  setRoom(null);
                  setSelected(null);
                  setIntro(false);
                  advanceTutorial('mining');
                }}
              >
                Replay outpost tutorial
              </button>
            </section>
          )}
        </GamePanel>
      )}
      {tutorial &&
        tutorial !== 'done' &&
        world.selectedLayerId !== 'shallows' &&
        !room &&
        !intro && (
          <button
            className="dive-hint"
            onClick={() => session.select('shallows')}
          >
            <GameIcon name="map" /> Return to Crystal shallows to continue your
            tutorial
          </button>
        )}
      {guide && !intro && !room && (
        <aside
          className="dive-tutorial"
          aria-label="Outpost tutorial"
          style={
            !selected && guideAnchor?.visible
              ? {
                  left: `clamp(16px, ${guideAnchor.x * 100}vw + 32px, calc(100vw - 410px))`,
                  top: `clamp(150px, ${guideAnchor.y * 100}dvh - 80px, calc(100dvh - 330px))`,
                }
              : undefined
          }
        >
          <div className="dive-tutorial-top">
            <GameIcon name={guide.target} />
            <small>
              FIRST DIVE · {tutorialSteps.indexOf(tutorial!) + 1} / 5
            </small>
            <button
              aria-label="Skip tutorial"
              onClick={() => advanceTutorial('done')}
            >
              <GameIcon name="close" />
            </button>
          </div>
          <h2 aria-live="polite">{guide.title}</h2>
          <p>{guide.text}</p>
          <button
            className="wide-button"
            disabled={tutorial === 'sell' && !sale}
            onClick={() => {
              if (tutorial === 'sell') sell();
              else select(guide.target);
            }}
          >
            {tutorial === 'processing' && inspected === 'processing'
              ? 'Waiting for finished cargo…'
              : guide.action}
            <GameIcon name={tutorial === 'sell' ? 'coin' : 'arrow'} />
          </button>
          <div className="dive-tutorial-progress" aria-hidden="true">
            {tutorialSteps.slice(0, 5).map((step, index) => (
              <i
                key={step}
                className={
                  index <= tutorialSteps.indexOf(tutorial!) ? 'reached' : ''
                }
              />
            ))}
          </div>
        </aside>
      )}
      {intro && (
        <div className="dive-intro">
          <span className="dive-intro-kicker">WELCOME TO YOUR OUTPOST</span>
          <h1>
            A whole ocean.
            <br />
            Yours to build.
          </h1>
          <p>
            Tap the drill, submarine or buildings to inspect and upgrade them.
            Your crew keeps working while you explore.
          </p>
          <div>
            <GameIcon name="transport" />
            <span>
              Drag to orbit · WASD to explore
              <br />
              Two fingers to pan & zoom on touch
            </span>
          </div>
          <button onClick={dismissIntro}>
            Explore the outpost <GameIcon name="arrow" />
          </button>
        </div>
      )}
    </main>
  );
}
createRoot(document.getElementById('root')!).render(
  <IconAssetsContext.Provider value="/icons/generated-v1">
    <PrototypeGame />
  </IconAssetsContext.Provider>,
);
