import { useEffect, useState } from 'react';
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
  return (
    <li
      className={`standing-row${own ? ' is-you' : ''}${player.position <= 3 ? ' top-captain' : ''}`}
    >
      <span
        className={`standing-place place-${String(player.position)}`}
        aria-label={`Rank ${String(player.position)}`}
      >
        {player.position <= 3 && <GameIcon name="trophy" />}
        <b>{player.position}</b>
      </span>
      <span className="captain-avatar" aria-hidden="true">
        {player.captainName.slice(0, 1).toUpperCase()}
      </span>
      <span className="standing-captain">
        <strong>
          {player.captainName}
          {own && <small>You</small>}
        </strong>
        <span>
          {player.upgrades} upgrades · {credits.format(player.credits)} CR
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
  useEffect(() => {
    let active = true;
    const load = () => {
      void synchronize()
        .then(() => gateway.loadLeaderboard(page))
        .then((result) => {
          if (active) {
            setData(result);
            setError(null);
          }
        })
        .catch((failure: unknown) => {
          if (active)
            setError(failure instanceof Error ? failure.message : 'Try again.');
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    };
    load();
    const interval = window.setInterval(load, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [gateway, synchronize, page, refresh]);
  const rename = async () => {
    const trimmed = name.trim();
    if (
      trimmed.length < 3 ||
      trimmed.length > 24 ||
      /[\p{Cc}]/u.test(trimmed)
    ) {
      setError('Use 3-24 characters.');
      return;
    }
    setRenaming(true);
    setError(null);
    try {
      await gateway.renameCaptain(trimmed);
      setEditing(false);
      setRefresh((value) => value + 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Try again.');
    } finally {
      setRenaming(false);
    }
  };
  return (
    <section className="leaderboard-panel" aria-label="Captain rankings">
      <div className="leaderboard-heading">
        <span className="leaderboard-emblem">
          <GameIcon name="trophy" />
        </span>
        <div>
          <strong>Captain standings</strong>
          <small>
            {data ? `${String(data.total)} captains` : 'Connecting…'}
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
            <span>Your captain</span>
            <button
              className="text-button"
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
                minLength={3}
                maxLength={24}
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
          ) : (
            <ol>
              <StandingRow player={data.currentPlayer} own />
            </ol>
          )}
        </div>
      )}
      <p
        className="ranking-rule"
        title="Depth → upgrades → research → automation → credits"
      >
        Depth first. Upgrades break ties.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {busy && !data && <p role="status">Loading captains…</p>}
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
            <p className="empty-standings">No captains here yet.</p>
          )}
          {data.total > pageSize && (
            <nav className="standing-pagination" aria-label="Ranking pages">
              <button
                disabled={busy || page === 0}
                onClick={() => {
                  setBusy(true);
                  setPage(page - 1);
                }}
                aria-label="Previous captains"
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
                aria-label="Next captains"
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
