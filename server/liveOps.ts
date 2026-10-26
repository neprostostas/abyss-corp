import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { liveOpsConfigSchema, telemetryBatchSchema } from '../src/data/liveOps';

export function readLiveOpsConfig() {
  return liveOpsConfigSchema.parse(
    JSON.parse(
      readFileSync(
        process.env.ABYSS_LIVE_OPS_PATH ?? 'server/config/live-ops.json',
        'utf8',
      ),
    ),
  );
}
export function ingestTelemetry(db: DatabaseSync, value: unknown) {
  const batch = telemetryBatchSchema.parse(value);
  const hash = createHash('sha256').update(batch.installationId).digest('hex');
  const now = Date.now();
  const count = db
    .prepare(
      'SELECT COUNT(*) AS count FROM analytics_events WHERE installation_hash = ? AND received_at > ?',
    )
    .get(hash, now - 60000)?.count;
  if (typeof count === 'number' && count + batch.events.length > 120)
    return false;
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('DELETE FROM analytics_events WHERE received_at < ?').run(
      now - 30 * 86400000,
    );
    const insert = db.prepare(
      'INSERT OR IGNORE INTO analytics_events (id, installation_hash, name, occurred_at, received_at, data) VALUES (?, ?, ?, ?, ?, ?)',
    );
    for (const event of batch.events)
      insert.run(
        event.id,
        hash,
        event.name,
        Math.min(now, event.occurredAt),
        now,
        JSON.stringify(event),
      );
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return true;
}

export function pruneTelemetry(db: DatabaseSync) {
  db.prepare('DELETE FROM analytics_events WHERE received_at < ?').run(
    Date.now() - 30 * 86400000,
  );
}
