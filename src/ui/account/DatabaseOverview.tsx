import type { AdminOverview } from '../../application/adminPorts';
import { TimelineChart } from '../charts/TimelineChart';
export function DatabaseOverview({ data }: { data: AdminOverview }) {
  const max = Math.max(1, ...data.depths.map((row) => row.count));
  const labels = {
    accounts: 'Accounts',
    verified: 'Email confirmed',
    withProgress: 'Started playing',
    saved7Days: 'Saved in last 7 days',
  };
  return (
    <section className="database-overview" aria-label="Player overview">
      <div className="overview-totals">
        {(['accounts', 'verified', 'withProgress', 'saved7Days'] as const).map(
          (key) => (
            <article key={key}>
              <small>{labels[key]}</small>
              <strong>{data.totals[key].toLocaleString()}</strong>
            </article>
          ),
        )}
      </div>
      <div className="overview-charts">
        <TimelineChart
          title="New accounts · last 30 days"
          unit="accounts"
          points={data.registrations}
        />
        <section className="report-chart depth-distribution">
          <header>
            <h2>Deepest outpost</h2>
          </header>
          <p className="analytics-note">
            Where registered players have reached
          </p>
          {data.depths.map((row) => (
            <div key={row.depth}>
              <span>
                {row.depth === 0 ? 'Not started' : `${String(row.depth)} m`}
              </span>
              <div className="depth-count-track">
                <i style={{ width: `${String((row.count / max) * 100)}%` }} />
              </div>
              <strong>{row.count}</strong>
            </div>
          ))}
        </section>
      </div>
    </section>
  );
}
