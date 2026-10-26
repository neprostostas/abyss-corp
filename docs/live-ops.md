# Live game systems · Milestone 7

## Scope

This milestone adds a remotely configured expedition bulletin, one timed grant event, opt-in first-party gameplay analytics and a stable presentation experiment. Payments, ads, push notifications, external analytics providers and public deployment are outside this implementation. Events and grants use the existing client-owned economy; no competitive or monetized rewards are introduced.

## Operator configuration

`server/config/live-ops.json` is read and validated for every `GET /api/v1/live-ops` request. Set `ABYSS_LIVE_OPS_PATH` to use another file. The API returns the configuration plus server time. Clients refresh at startup, once a minute while visible, on returning to the tab and through **Refresh bulletin**. Updates do not require a frontend build or API restart.

The strict version 1 schema allows a revision, a short announcement, a nullable event, an analytics kill switch and a presentation experiment. Configurations cannot inject HTML, script, arbitrary URLs or economy formulas. Unknown fields and invalid schedules are rejected. Operators should increment `revision` for each change and replace the file atomically. Setting `event` to null removes the event; setting `analyticsEnabled` to false disables both client queueing and server ingestion. A failed configuration request disables event claims and usage collection while regular gameplay continues. No stale config is applied from local storage.

The provided **Founders expedition** runs from October 26, 2026 at 00:00 UTC until November 2, 2026 at 00:00 UTC. Its grant requires two unlocked outposts and one installed sales module, rewarding 250 credits. The UI shows progress, a countdown, upcoming/ended states and claimed status. The countdown and eligibility use a server time anchor advanced with the monotonic clock. Event availability never changes production durations, capacity or offline simulation.

Grant claims are domain commands. They require the active time window, completed requirements, an unclaimed content ID and enough safe-integer credit headroom. The credit award and claim marker update together. Save version 6 persists unique `claimedEvents`; prior save versions migrate with empty event history, preserving all earlier progress. The local adapter preserves the original version 5 save under `abyss-corp.save.v5-backup` before upgrading. Claim history is capped at 1,000 entries; reaching that limit prevents new claims rather than dropping old markers. Keep event IDs immutable and use a new ID for a genuinely new event.

Like the rest of the current economy, claims are not server-authoritative. Restoring an older save can also restore older claim history. Do not use this client-side mechanism for payments, premium currency or leaderboard rewards.

## Presentation experiment

The `expedition-focus-v1` experiment compares two bulletin links: a research-focused prompt and a mission-focused prompt. Both lead to the existing corporate progression panel. `challengerPercent` controls allocation from zero to 100. Disabling the experiment restores the research prompt. It does not alter prices, storage, upgrade costs or progress.

A browser installation UUID and experiment ID determine a stable FNV-style hash bucket. The UUID is stored locally under `abyss-corp.installation-id`; it is not sent during config retrieval. Changing the experiment ID reassigns cohorts; changing rollout percentage may move installations across the cutoff. With analytics off, no experiment exposure or action is sent. Storage failure uses an in-memory cohort and leaves analytics off. The client records at most one exposure per experiment/variant per running page, with a fresh exposure if a new opt-in starts.

## Analytics consent and transport

Usage sharing defaults off. The game's checkbox saves the choice under `abyss-corp.analytics-consent`. Turning it on enables future event collection; turning it off clears the queue, aborts the current client request and stops new requests. Requests already received by the server cannot be recalled. No events are replayed from before consent, and queues are not persisted.

The allowlist contains session start, operation toggles, successful purchases/upgrades, manual sales, depth unlocks, mission/event claims and experiment exposure. Failed/no-op commands are not recorded. Automatic production ticks are not tracked. Events contain a random UUID, action name, timestamp, optional depth/content/item IDs and experiment assignment. They contain no wallet balance, raw save, name, email or free-form text. They are pseudonymous installation-level data, not proof of an identified player or an economy transaction.

The client buffers at most 100 events and sends batches of up to 20 every ten seconds. Delivery is best effort, times out after eight seconds and never blocks gameplay or saving. Transient failures can retry the same event IDs; server primary keys deduplicate them. Browser exit, timeout, disabled collection or queue overflow may drop events. Analytics is not an accounting system.

`POST /api/v1/telemetry` requires an explicit `consent: true`, an installation UUID and an allowlisted batch. Existing origin/header checks apply. No guest session is created for analytics, and telemetry requests omit cookies. The server stores only a SHA-256 hash of the installation UUID, limits a hash to 120 received events per minute and rejects invalid/oversized bodies. The kill switch rejects ingestion as well as disabling the client. Consent cannot be established cryptographically from a client flag; the UI is the consent boundary for this local product.

## Storage and operator inspection

SQLite schema version 2 adds `analytics_events`, indexed by receipt time and installation hash. Unique event IDs deduplicate retries. Retention cleanup runs at API startup, hourly and when accepting a batch; records older than 30 days are deleted. With a stopped server, cleanup resumes at its next startup. The database remains excluded from Git. No analytics dashboard or public analytics-read endpoint is exposed.

For operator inspection, use a SQLite client against the local database:

```sql
SELECT name, COUNT(*) AS events
FROM analytics_events
GROUP BY name
ORDER BY events DESC;

SELECT json_extract(data, '$.experimentId') AS experiment,
       json_extract(data, '$.variant') AS variant,
       name, COUNT(*) AS events
FROM analytics_events
GROUP BY experiment, variant, name;
```

These are raw event counts, not unique-player conversion rates or statistically validated experiment results. No data is collected from a player who has not opted in through this client.

## Development preference

No tests are added or run. `npm run build` compiles frontend and backend and creates the production client bundle. `npm run dev` runs both local services. The existing gameplay, research, offline calculation and manual server backup remain available independently of the live bulletin.
