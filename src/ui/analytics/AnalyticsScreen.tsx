import { TimelineChart } from '../charts/TimelineChart';
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
  const [metric, setMetric] = useState<'visitors' | 'sessions' | 'pageviews'>(
    'visitors',
  );
  const labels = {
    visitors: 'Unique visitors',
    sessions: 'Visits',
    pageviews: 'Page views',
  };
  const points = report
    ? Array.from({ length: days }, (_, i) => {
        const date = new Date(report.updatedAt);
        date.setUTCDate(date.getUTCDate() - days + 1 + i);
        const day = date.toISOString().slice(0, 10);
        return {
          day,
          value: report.daily.find((row) => row.day === day)?.[metric] ?? 0,
        };
      })
    : [];
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
              if (value === days) return;
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
              {(['visitors', 'sessions', 'pageviews'] as const).map((item) => (
                <button
                  key={item}
                  aria-pressed={metric === item}
                  onClick={() => {
                    setMetric(item);
                  }}
                >
                  <small>{labels[item]}</small>
                  <strong>{report.totals[item].toLocaleString()}</strong>
                </button>
              ))}
            </div>
            <TimelineChart
              key={`${String(days)}-${metric}`}
              title={`${labels[metric]} per day`}
              unit={
                metric === 'visitors'
                  ? 'visitors'
                  : metric === 'sessions'
                    ? 'visits'
                    : 'views'
              }
              points={points}
            />
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
