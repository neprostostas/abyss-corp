import {
  CAPTAIN_NAME_LIMITS,
  captainInitial,
  displayPlayerName,
  normalizeCaptainName,
} from '../../domain/captainName';
import { useEffect, useEffectEvent, useState } from 'react';
import type {
  LeaderboardPage,
  PlayerGateway,
  PlayerStanding,
} from '../../application/playerPorts';
import { GameIcon } from '../components/GameIcon';
import { LEADERBOARD_PAGE_SIZE as pageSize } from '../../application/playerPorts';
const credits = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
function StandingRow({
  player,
  own = false,
}: {
  player: PlayerStanding;
  own?: boolean;
}) {
  const name = displayPlayerName(player.captainName, player.id);
  return (
    <li
      className={`standing-row${own ? ' is-you' : ''}${player.position <= 3 ? ' top-captain' : ''}`}
    >
      <span
        className={`standing-place place-${String(player.position)}`}
        aria-label={`Rank ${String(player.position)}`}
      >
        <b>{player.position}</b>
      </span>
      <span className="captain-avatar" aria-hidden="true">
        {captainInitial(name)}
      </span>
      <span className="standing-captain">
        <strong>
          {name}
          {own && <small>You</small>}
        </strong>
        <span>
          {player.upgrades} upgrades · {credits.format(player.credits)}
        </span>
      </span>
      <strong className="standing-depth">
        {player.depthMeters}
        <small>m</small>
      </strong>
    </li>
  );
}
export function LeaderboardPanel({
  gateway,
  synchronize,
}: {
  gateway: PlayerGateway;
  synchronize: () => Promise<void>;
}) {
  const [data, setData] = useState<LeaderboardPage | null>(null);
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState(false);
  // Saving updates the parent cloud state. Read the latest services without
  // treating their new object/function identities as a request to save again.
  const loadPage = useEffectEvent(async (requestedPage: number) => {
    await synchronize();
    return gateway.loadLeaderboard(requestedPage);
  });
  useEffect(() => {
    let active = true;
    let latestRequest = 0;
    let inFlight = false;
    const load = () => {
      if (inFlight) return;
      inFlight = true;
      const request = ++latestRequest;
      const isCurrent = () => active && request === latestRequest;
      void loadPage(page)
        .then((result) => {
          if (isCurrent()) {
            setData(result);
            setError(null);
          }
        })
        .catch((failure: unknown) => {
          if (isCurrent())
            setError(failure instanceof Error ? failure.message : 'Try again.');
        })
        .finally(() => {
          inFlight = false;
          if (isCurrent()) setBusy(false);
        });
    };
    load();
    const interval = window.setInterval(load, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [page, refresh]);
  const rename = async () => {
    if (renaming) return;
    setRenaming(true);
    setError(null);
    try {
      await gateway.renameCaptain(normalizeCaptainName(name));
      setEditing(false);
      setRefresh((value) => value + 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Try again.');
    } finally {
      setRenaming(false);
    }
  };
  return (
    <section className="leaderboard-panel" aria-label="Player rankings">
      <div className="leaderboard-heading">
        <div>
          <strong>Rankings</strong>
          <small>
            {data ? `${String(data.total)} players` : 'Connecting…'}
          </small>
        </div>
        <button
          className="icon-button"
          aria-label="Refresh leaderboard"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setRefresh((value) => value + 1);
          }}
        >
          <GameIcon name="refresh" />
        </button>
      </div>
      {data?.currentPlayer && (
        <div className="your-standing">
          <div className="your-standing-label">
            <span>Your rank #{data.currentPlayer.position}</span>
            <button
              className="text-button"
              disabled={renaming}
              onClick={() => {
                setName(data.currentPlayer?.captainName ?? '');
                setEditing(!editing);
              }}
            >
              {editing ? 'Cancel' : 'Rename'}
            </button>
          </div>
          {editing ? (
            <form
              noValidate
              className="captain-rename"
              onSubmit={(event) => {
                event.preventDefault();
                void rename();
              }}
            >
              <label className="sr-only" htmlFor="captain-name">
                Captain name
              </label>
              <input
                id="captain-name"
                autoComplete="nickname"
                minLength={CAPTAIN_NAME_LIMITS.min}
                maxLength={CAPTAIN_NAME_LIMITS.max * 2}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                }}
                disabled={renaming}
                required
              />
              <button disabled={renaming}>
                {renaming ? 'Saving…' : 'Save'}
              </button>
            </form>
          ) : !data.players.some(
              (player) => player.id === data.currentPlayer?.id,
            ) ? (
            <ol>
              <StandingRow player={data.currentPlayer} own />
            </ol>
          ) : null}
        </div>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {busy && !data && <p role="status">Loading players…</p>}
      {data && (
        <>
          <ol className="captain-list">
            {data.players.map((player) => (
              <StandingRow
                key={player.id}
                player={player}
                own={player.id === data.currentPlayer?.id}
              />
            ))}
          </ol>
          {!data.players.length && (
            <p className="empty-standings">No players here yet.</p>
          )}
          {data.total > pageSize && (
            <nav className="standing-pagination" aria-label="Ranking pages">
              <button
                disabled={busy || page === 0}
                onClick={() => {
                  setBusy(true);
                  setPage(page - 1);
                }}
                aria-label="Previous players"
              >
                ←
              </button>
              <span>
                {page + 1} / {Math.ceil(data.total / pageSize)}
              </span>
              <button
                disabled={busy || (page + 1) * pageSize >= data.total}
                onClick={() => {
                  setBusy(true);
                  setPage(page + 1);
                }}
                aria-label="Next players"
              >
                →
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
