import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function openDatabase(filename: string) {
  mkdirSync(dirname(resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(
    'PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;',
  );
  const version = db.prepare('PRAGMA user_version').get()?.user_version;
  if (version !== 0 && version !== 1 && version !== 2)
    throw new Error('Unsupported database version.');
  if (version === 0)
    db.exec(`
    BEGIN IMMEDIATE;
    CREATE TABLE players (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
    CREATE TABLE sessions (
      token_hash TEXT PRIMARY KEY,
      player_id TEXT NOT NULL REFERENCES players(id),
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX sessions_expiry ON sessions(expires_at);
    CREATE TABLE saves (
      player_id TEXT PRIMARY KEY REFERENCES players(id),
      revision INTEGER NOT NULL CHECK(revision > 0),
      updated_at INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE save_history (
      player_id TEXT NOT NULL REFERENCES players(id),
      revision INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      data TEXT NOT NULL,
      PRIMARY KEY (player_id, revision)
    );
    PRAGMA user_version = 1;
    COMMIT;
  `);
  if (version === 0 || version === 1)
    db.exec(`
    BEGIN IMMEDIATE;
    CREATE TABLE analytics_events (
      id TEXT PRIMARY KEY,
      installation_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      occurred_at INTEGER NOT NULL,
      received_at INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE INDEX analytics_received ON analytics_events(received_at);
    CREATE INDEX analytics_installation ON analytics_events(installation_hash, received_at);
    PRAGMA user_version = 2;
    COMMIT;
  `);
  return db;
}
