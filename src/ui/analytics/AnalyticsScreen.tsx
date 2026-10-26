import { Brand } from '../components/Brand';
import { useEffect, useState } from 'react';
import type {
  AdminAnalyticsGateway,
  TrafficReport,
} from '../../application/analyticsPorts';
import { GameIcon } from '../components/GameIcon';
export function AnalyticsScreen({
  gateway,
}: {
  gateway: AdminAnalyticsGateway;
}) {
  const [days, setDays] = useState(30),
    [refresh, setRefresh] = useState(0);
  const [report, setReport] = useState<TrafficReport | null>(null),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void gateway
      .load(days, controller.signal)
      .then((data) => {
        if (active) {
          setReport(data);
          setError(null);
        }
      })
      .catch((failure: unknown) => {
        if (active) {
          setReport(null);
          setError(failure instanceof Error ? failure.message : 'Try again.');
        }
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [gateway, days, refresh]);
  const max = Math.max(1, ...(report?.daily.map((row) => row.visitors) ?? []));
  return (
    <main className="database-screen analytics-screen">
      <header className="database-header">
        <a className="database-brand" href="/">
          <Brand />
        </a>
        <div>
          <a href="/database">Database</a>
          <a href="/">Back to game</a>
        </div>
      </header>
      <div className="database-title">
        <div>
          <span className="admin-access">Private report</span>
          <h1>Analytics</h1>
        </div>
        <button
          className="icon-button"
          disabled={busy}
          aria-label="Refresh analytics"
          onClick={() => {
            setBusy(true);
            setRefresh(refresh + 1);
          }}
        >
          <GameIcon name="refresh" />
        </button>
      </div>
      <nav className="analytics-ranges" aria-label="Report period">
        {[7, 30, 90].map((value) => (
          <button
            key={value}
            aria-pressed={days === value}
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setDays(value);
            }}
          >
            {value} days
          </button>
        ))}
      </nav>
      {busy ? (
        <p role="status">Loading report…</p>
      ) : error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : (
        report && (
          <>
            <div className="analytics-totals">
              {(['visitors', 'pageviews', 'sessions'] as const).map(
                (metric) => (
                  <article key={metric}>
                    <small>
                      {metric === 'visitors'
                        ? 'Unique visitors'
                        : metric === 'pageviews'
                          ? 'Page views'
                          : 'Visits'}
                    </small>
                    <strong>{report.totals[metric].toLocaleString()}</strong>
                  </article>
                ),
              )}
            </div>
            <section
              className="analytics-chart"
              aria-label="Daily unique visitors"
            >
              <h2>Visitors per day</h2>
              {report.daily.length ? (
                <div className="analytics-bars">
                  {report.daily.map((row) => (
                    <div
                      key={row.day}
                      title={`${row.day}: ${String(row.visitors)} visitors`}
                    >
                      <b>{row.visitors}</b>
                      <span
                        style={{
                          height: `${String(Math.max(2, (row.visitors / max) * 160))}px`,
                        }}
                      />
                      <small>{row.day.slice(5)}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No consenting visitors yet.</p>
              )}
            </section>
            <p className="analytics-note">
              PostHog EU · Production site · Consenting visitors only · UTC
              dates
            </p>
            <p className="analytics-note">
              Updated {new Date(report.updatedAt).toLocaleString()}
            </p>
          </>
        )
      )}
    </main>
  );
}
