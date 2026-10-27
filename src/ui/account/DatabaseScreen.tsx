import { DatabaseOverview } from './DatabaseOverview';
import type { AdminOverview } from '../../application/adminPorts';
import { Brand } from '../components/Brand';
import { useEffect, useRef, useState } from 'react';
import {
  ADMIN_TABLES,
  ADMIN_TABLE_IDS,
  ADMIN_PAGE_SIZE,
} from '../../application/adminPorts';
import type {
  AdminDatabaseGateway,
  AdminPage,
  AdminTableId,
} from '../../application/adminPorts';
import { GameIcon } from '../components/GameIcon';
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
function cell(value: unknown, column: string): string {
  if (value === null || value === undefined) return '-';
  if (column === 'depth_m' && typeof value === 'number')
    return value === 0 ? 'Not started' : `${String(value)} m`;
  if (column === 'email_confirmed_at') return 'Verified';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string')
    return column.endsWith('_at') || column === 'banned_until'
      ? dateFormat.format(new Date(value))
      : value;
  if (typeof value === 'object') return 'JSON';
  return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : '-';
}
function RecordInspector({
  record,
  title,
  onClose,
}: {
  record: Readonly<Record<string, unknown>>;
  title: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="record-inspector"
      aria-labelledby="record-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header>
        <div>
          <small>Record</small>
          <h2 id="record-title">{title}</h2>
        </div>
        <button
          className="icon-button"
          autoFocus
          aria-label="Close record"
          onClick={onClose}
        >
          <GameIcon name="close" />
        </button>
      </header>
      <pre>{JSON.stringify(record, null, 2)}</pre>
    </dialog>
  );
}
export function DatabaseScreen({ gateway }: { gateway: AdminDatabaseGateway }) {
  const [table, setTable] = useState<AdminTableId>('player_progress');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [technical, setTechnical] = useState(false);
  const columns = ADMIN_TABLES[table].columns.filter(
    (column) =>
      technical || !['id', 'user_id', 'write_id', 'save'].includes(column),
  );
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<AdminPage | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Readonly<
    Record<string, unknown>
  > | null>(null);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(
      () => {
        void gateway
          .load(table, page, search.trim())
          .then((result) => {
            if (active) {
              setData(result);
              setError(null);
            }
          })
          .catch((failure: unknown) => {
            if (active) {
              setData(null);
              setError(
                failure instanceof Error ? failure.message : 'Try again.',
              );
            }
          })
          .finally(() => {
            if (active) setBusy(false);
          });
      },
      search ? 250 : 0,
    );
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [gateway, table, page, search, refresh]);
  useEffect(() => {
    let active = true;
    void gateway
      .overview()
      .then((result) => {
        if (active) {
          setOverview(result);
          setOverviewError(null);
        }
      })
      .catch((failure: unknown) => {
        if (active)
          setOverviewError(
            failure instanceof Error
              ? failure.message
              : 'Overview unavailable.',
          );
      });
    return () => {
      active = false;
    };
  }, [gateway, refresh]);
  return (
    <main className="database-screen">
      <header className="database-header">
        <a href="/" className="database-brand">
          <Brand />
        </a>
        <div>
          <a
            href="https://supabase.com/dashboard/project/qduhqhhhsboljuipruvy/editor"
            target="_blank"
            rel="noreferrer"
          >
            Studio ↗
          </a>
          <a href="/analytics">Analytics</a>
          <a href="/">Back to game</a>
        </div>
      </header>
      <div className="database-title">
        <div>
          <span className="admin-access">
            {data ? 'Administrator' : 'Restricted'}
          </span>
          <h1>Database</h1>
        </div>
        <button
          className="icon-button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setRefresh(refresh + 1);
          }}
          aria-label="Refresh database"
        >
          <GameIcon name="refresh" />
        </button>
      </div>
      {overview && <DatabaseOverview data={overview} />}
      {overviewError && (
        <p className="form-error" role="alert">
          {overviewError}
        </p>
      )}
      {!error && (
        <nav className="database-tabs" aria-label="Database tables">
          {ADMIN_TABLE_IDS.map((id) => (
            <button
              key={id}
              aria-current={table === id ? 'page' : undefined}
              onClick={() => {
                if (id === table && page === 0) return;
                setData(null);
                setTable(id);
                setPage(0);
                setBusy(true);
                setSelected(null);
              }}
            >
              {ADMIN_TABLES[id].label}
              <span>{data?.tables[id] ?? '-'}</span>
            </button>
          ))}
        </nav>
      )}
      {error ? (
        <div className="database-error" role="alert">
          <GameIcon name="lock" />
          <h2>{error}</h2>
        </div>
      ) : (
        <>
          <div className="database-toolbar">
            <span>
              {data?.total ?? 0} {data?.total === 1 ? 'record' : 'records'}
            </span>
            <button
              className="technical-toggle"
              aria-pressed={technical}
              onClick={() => {
                setTechnical(!technical);
              }}
            >
              Technical fields
            </button>
            <label>
              <span className="sr-only">Search database records</span>
              <input
                type="search"
                placeholder="Search records"
                maxLength={80}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                  setBusy(true);
                }}
              />
            </label>
          </div>
          <div className="database-table" aria-busy={busy}>
            <table>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column}>
                      {(
                        {
                          captain_name: 'Captain',
                          depth_m: 'Depth',
                          outposts: 'Bases',
                          upgrades: 'Upgrades',
                          research: 'Research',
                          automation: 'Pilot levels',
                          credits: 'Credits',
                          updated_at: 'Last saved',
                          created_at: 'Created',
                          email_confirmed_at: 'Email confirmed',
                          last_sign_in_at: 'Last sign in',
                          banned_until: 'Blocked until',
                          revision: 'Save revision',
                          email: 'Email',
                        } as Record<string, string>
                      )[column] ?? column.replaceAll('_', ' ')}
                    </th>
                  ))}
                  <th>
                    <span className="sr-only">Inspect</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {!busy &&
                  data?.rows.map((record, index) => (
                    <tr key={index}>
                      {columns.map((column) => (
                        <td key={column}>
                          <span
                            className="database-cell"
                            title={
                              typeof record[column] === 'string'
                                ? record[column]
                                : undefined
                            }
                          >
                            {cell(record[column], column)}
                          </span>
                        </td>
                      ))}
                      <td>
                        <button
                          className="record-open"
                          aria-label={`View record ${String(index + 1)}`}
                          onClick={() => {
                            setSelected(record);
                          }}
                        >
                          <GameIcon name="arrow" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {busy ? (
              <p className="database-empty" role="status">
                Loading…
              </p>
            ) : (
              !data?.rows.length && (
                <p className="database-empty">
                  {search ? 'No matching records.' : 'No records.'}
                </p>
              )
            )}
          </div>
          {data && data.total > ADMIN_PAGE_SIZE && (
            <nav className="database-pagination" aria-label="Database pages">
              <button
                disabled={busy || page === 0}
                onClick={() => {
                  setBusy(true);
                  setPage(page - 1);
                }}
              >
                ← Previous
              </button>
              <span>
                {page + 1} / {Math.ceil(data.total / ADMIN_PAGE_SIZE)}
              </span>
              <button
                disabled={busy || (page + 1) * ADMIN_PAGE_SIZE >= data.total}
                onClick={() => {
                  setBusy(true);
                  setPage(page + 1);
                }}
              >
                Next →
              </button>
            </nav>
          )}
        </>
      )}
      {selected && (
        <RecordInspector
          title={ADMIN_TABLES[table].label}
          record={selected}
          onClose={() => {
            setSelected(null);
          }}
        />
      )}
    </main>
  );
}
