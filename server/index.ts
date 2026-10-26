import { readLiveOpsConfig, ingestTelemetry, pruneTelemetry } from './liveOps';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { openDatabase } from './database';
import { validateSave } from '../src/infrastructure/persistence/saveSchema';

const port = z.coerce
  .number()
  .int()
  .min(1)
  .max(65535)
  .parse(process.env.ABYSS_API_PORT ?? 4318);
const db = openDatabase(
  process.env.ABYSS_DATABASE_PATH ?? '.data/abyss.sqlite',
);
pruneTelemetry(db);
const retentionTimer = setInterval(() => pruneTelemetry(db), 60 * 60 * 1000);
retentionTimer.unref();
const cookieName = 'abyss_session';
const lifetimeMs = 30 * 24 * 60 * 60 * 1000;
const allowedOrigins = new Set(
  (
    process.env.ABYSS_ALLOWED_ORIGINS ??
    'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173,http://localhost:4173'
  )
    .split(',')
    .map((value) => value.trim()),
);
const secureCookie = process.env.ABYSS_SECURE_COOKIE === 'true';
const rowSchema = z.object({
  revision: z.number().int().positive(),
  updated_at: z.number().int().nonnegative(),
  data: z.string(),
});
const writeSchema = z
  .object({
    expectedRevision: z
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER - 1),
    save: z.unknown(),
  })
  .strict();
class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
function respond(response: ServerResponse, status: number, data: unknown) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(data));
}
async function readBody(request: IncomingMessage): Promise<unknown> {
  if (request.headers['content-type']?.split(';')[0] !== 'application/json')
    throw new HttpError(415, 'Expected JSON.');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 128 * 1024) throw new HttpError(413, 'Save is too large.');
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new HttpError(400, 'Invalid JSON.');
  }
}
function playerId(request: IncomingMessage): string | null {
  const value = request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  if (!value || !/^[a-f0-9]{64}$/.test(value)) return null;
  const hash = createHash('sha256').update(value).digest('hex');
  const row = db
    .prepare(
      'SELECT player_id FROM sessions WHERE token_hash = ? AND expires_at > ?',
    )
    .get(hash, Date.now());
  return typeof row?.player_id === 'string' ? row.player_id : null;
}
function getSave(id: string) {
  const raw = db
    .prepare('SELECT revision, updated_at, data FROM saves WHERE player_id = ?')
    .get(id);
  if (!raw) return null;
  const row = rowSchema.parse(raw);
  return {
    revision: row.revision,
    updatedAt: row.updated_at,
    save: validateSave(JSON.parse(row.data)),
  };
}
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const method = request.method ?? 'GET';
    if (method === 'POST' || method === 'PUT') {
      if (
        !request.headers.origin ||
        !allowedOrigins.has(request.headers.origin) ||
        request.headers['x-abyss-client'] !== '1'
      )
        throw new HttpError(403, 'Request origin is not allowed.');
    }
    if (url.pathname === '/api/v1/health' && method === 'GET') {
      respond(response, 200, {
        status: 'ok',
        apiVersion: 1,
        serverTime: Date.now(),
      });
      return;
    }
    if (url.pathname === '/api/v1/live-ops' && method === 'GET') {
      respond(response, 200, {
        config: readLiveOpsConfig(),
        serverTime: Date.now(),
      });
      return;
    }
    if (url.pathname === '/api/v1/telemetry' && method === 'POST') {
      if (!readLiveOpsConfig().analyticsEnabled)
        throw new HttpError(403, 'Analytics is disabled by the operator.');
      if (!ingestTelemetry(db, await readBody(request)))
        throw new HttpError(429, 'Analytics rate limit reached.');
      respond(response, 202, { accepted: true });
      return;
    }
    if (url.pathname === '/api/v1/session' && method === 'POST') {
      let id = playerId(request);
      if (!id) {
        const token = randomBytes(32).toString('hex');
        const hash = createHash('sha256').update(token).digest('hex');
        id = randomUUID();
        const now = Date.now();
        db.exec('BEGIN IMMEDIATE');
        try {
          db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
          db.prepare('INSERT INTO players (id, created_at) VALUES (?, ?)').run(
            id,
            now,
          );
          db.prepare(
            'INSERT INTO sessions (token_hash, player_id, expires_at) VALUES (?, ?, ?)',
          ).run(hash, id, now + lifetimeMs);
          db.exec('COMMIT');
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
        response.setHeader(
          'Set-Cookie',
          `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${lifetimeMs / 1000}${secureCookie ? '; Secure' : ''}`,
        );
      }
      respond(response, 200, { playerId: id, serverTime: Date.now() });
      return;
    }
    if (url.pathname !== '/api/v1/save')
      throw new HttpError(404, 'Endpoint not found.');
    const id = playerId(request);
    if (!id)
      throw new HttpError(401, 'Your server session expired. Connect again.');
    if (method === 'GET') {
      respond(response, 200, { snapshot: getSave(id) });
      return;
    }
    if (method !== 'PUT') throw new HttpError(405, 'Method not allowed.');
    const body = writeSchema.parse(await readBody(request));
    let save;
    try {
      save = validateSave(body.save);
    } catch {
      throw new HttpError(400, 'Save data is invalid or unsupported.');
    }
    db.exec('BEGIN IMMEDIATE');
    let committed = false;
    try {
      const current = getSave(id);
      if ((current?.revision ?? 0) !== body.expectedRevision) {
        db.exec('ROLLBACK');
        committed = true;
        respond(response, 409, {
          error: 'The server copy changed.',
          snapshot: current,
        });
        return;
      }
      const revision = body.expectedRevision + 1;
      const updatedAt = Date.now();
      if (current)
        db.prepare(
          'INSERT INTO save_history (player_id, revision, updated_at, data) VALUES (?, ?, ?, ?)',
        ).run(
          id,
          current.revision,
          current.updatedAt,
          JSON.stringify(current.save),
        );
      db.prepare(
        'INSERT INTO saves (player_id, revision, updated_at, data) VALUES (?, ?, ?, ?) ON CONFLICT(player_id) DO UPDATE SET revision = excluded.revision, updated_at = excluded.updated_at, data = excluded.data',
      ).run(id, revision, updatedAt, JSON.stringify(save));
      db.prepare(
        'DELETE FROM save_history WHERE player_id = ? AND revision NOT IN (SELECT revision FROM save_history WHERE player_id = ? ORDER BY revision DESC LIMIT 10)',
      ).run(id, id);
      db.exec('COMMIT');
      committed = true;
      respond(response, 200, { snapshot: { revision, updatedAt, save } });
    } finally {
      if (!committed) db.exec('ROLLBACK');
    }
  } catch (error) {
    if (error instanceof HttpError)
      respond(response, error.status, { error: error.message });
    else if (error instanceof z.ZodError)
      respond(response, 400, { error: 'Save data is invalid or unsupported.' });
    else {
      console.error(
        'Abyss API request failed.',
        error instanceof Error ? error.message : 'Unknown error',
      );
      respond(response, 500, {
        error: 'Server could not complete this request.',
      });
    }
  }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(port, '127.0.0.1', () =>
  console.log(`Abyss API listening at http://127.0.0.1:${port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    clearInterval(retentionTimer);
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
