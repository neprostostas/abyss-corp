# Abyss Corp

A bright underwater idle/tycoon game, built in small milestones. **Current scope: Milestone 2 — Multi-stage production.** One crystal vein, one submarine, a parallel refinery, bounded storage, manual sales, four upgrade categories, and local saves.

Read [ABYSS_CORP_PROJECT_SPEC.md](ABYSS_CORP_PROJECT_SPEC.md) completely before making changes. It is the persistent specification.

## Run locally

Use Node.js 22.13+ on the 22.x line, or Node.js 24+, and npm.

```sh
npm ci
npm run dev
```

Open the local URL Vite prints. No external art/font requests are needed.

## Play and verify

1. **Start operation.** At level one, extraction takes four seconds and delivery takes 2.5 seconds. Delivery now supplies the refinery, not credits.
2. The refinery consumes three raw crystals and produces three refined crystals in six seconds, independently of the submarine. From a fresh game the first refined cargo arrives after 12.5 seconds.
3. Click **Sell refined** to receive eight credits per stored crystal. No credits arrive before selling.
4. Leave the operation running without sales. At level one, the warehouse fills to six, the refinery holds a finished batch, intake fills to six, and the submarine eventually waits at the dock. Counters must never overflow.
5. Sell or upgrade **Cargo warehouse**. Completed cargo moves into the freed space and production resumes without lost material or free elapsed work. Upgrade **Crystal refinery** to shorten refining time.
6. Pause, **Save now**, refresh, and confirm credits, all levels, stock and machine progress are preserved. Existing Milestone 1 saves migrate automatically without losing credits/upgrades.
7. Check desktop/mobile layout and keyboard focus. Switching away and returning must not grant hidden-time production.

```sh
npm run check
npm run build
npm run preview
```

`check` runs strict TypeScript, ESLint, Vitest and formatting checks. `npm test` runs domain, persistence and session tests. `build` type-checks and creates `dist`; `preview` serves that build locally.

Use `npm run format` to format project files. The persistent specification is excluded.

## Persistence and limits

Use one game tab at a time. Progress belongs to this browser/origin in `abyss-corp.save`. Autosave runs every two seconds and on actions/hide/exit; an abrupt crash can lose the latest unsaved interval. Port changes use a different save.

Save version 2 adds refinery/storage state. Before replacing a version 1 save, the original is backed up to `abyss-corp.save.v1-backup`. Returning legacy cargo was already paid and is not rewarded again; loaded legacy cargo now goes through refining. Invalid or unsupported saves are not overwritten. Restore a valid backup or allow browser storage, then **Retry loading**. Write failures retain the session in memory and offer **Retry saving**.

One resource/depth only. Selling is manual; income shown in the HUD is potential with regular sales. No managers, offline income, deeper layers or backend yet. See [architecture notes](docs/architecture.md). Next: **Milestone 3 — Depth progression**.
