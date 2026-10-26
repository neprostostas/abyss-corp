# Abyss Corp

A full-screen underwater idle/tycoon game with a hand-drawn 2.5D outpost. **Current scope: Milestone 7 — Live game systems.** The underwater game includes a server-driven expedition bulletin, timed grant events, opt-in gameplay analytics and a presentation experiment, alongside research, automation and server backups.

Read [ABYSS_CORP_PROJECT_SPEC.md](ABYSS_CORP_PROJECT_SPEC.md) completely before making changes. It is the persistent specification.

## Run locally

Use Node.js 22.13+ on the 22.x line, or Node.js 24+, and npm.

```sh
npm ci
npm run dev
```

The command starts the game on `http://127.0.0.1:5173/` and the local API on port 4318. No external art/font requests are needed. For client-only work, use `npm run dev:client`.

## Playing

Start the Crystal shallows operation at 50 m. The submarine extracts and delivers raw crystals to the refinery; sell refined stock to earn corporate credits. Upgrade mining, transport, processing and storage to relieve bottlenecks.

Use the depth markers on the left to open the Golden trench at 180 m for 250 CR, then the Pearl caverns at 420 m for 900 CR. The previous depth must be unlocked first. Before research bonuses, gold sells for 20 CR per refined unit; pearls sell for 45 CR. Deeper outposts have slower production and more expensive upgrades.

Each outpost starts paused and owns its machines, materials and upgrades. Started operations continue while you view another depth. Credits are shared, so sales at one outpost can fund another. Full warehouses block production until you sell or expand storage.

Open **Crew** and hire the **Cargo pilot** at each outpost to automate sales. Three levels sell every 12, 6 or 2 seconds, costing 120, 240 and 480 CR in Crystal shallows; deeper layers apply their upgrade cost multiplier. Installation enables auto sales. You can disable the module while retaining its level and timer. Pausing an outpost pauses its module too. Upgrading preserves the fraction of the sale timer.

Use **Research** and **Missions** in the bottom dock to develop your whole network:

- **Deep-sea trade:** three levels add 25%, 50% and 75% to base refined sale values. Costs: 180, 450 and 900 CR. Prices round down to whole credits per unit. Bonuses apply to manual, automatic and offline sales.
- **Modular warehousing:** three levels add 3, 6 and 9 slots to both raw and refined buffers at every outpost. Costs: 120, 300 and 650 CR. Bonuses also apply to depths unlocked later.
- **Seven expedition missions:** improve production, install modules, unlock depths and research technologies. Each completed mission offers a one-time credit reward through its credit reward button. Existing progress counts when migrating an older save. Claimed rewards stay claimed after refresh.

Research spends shared credits and takes effect immediately. The navigation, production panels, sale buttons and scene all reflect active bonuses. No reset is required.

**Settings → Save now** preserves all outposts, sales modules and the selected depth. Started operations continue for up to four hours while the tab is hidden or closed. Without a sales module, finite storage eventually blocks production. On return, an offline report shows credited time and automatic sales earnings. Earnings are applied and saved immediately; dismissing the report does not claim them again.

```sh
npm run build
npm run preview
```

`build` type-checks the frontend and backend and creates `dist`; `preview` serves that build locally. Per the current development preference, do not add or run tests or use the aggregate `check` command. Existing test files are retained. Use `npm run format` to format project files; the persistent specification is excluded.

## Persistence and limits

Use one game tab at a time. Progress belongs to this browser/origin in `abyss-corp.save`. Autosave runs every two seconds and on actions/hide/exit; an abrupt crash can lose the latest unsaved interval. Port changes use a different save.

Save version 6 adds unique timed-event claim IDs alongside corporate research levels and claimed mission IDs. Versions 1–5 migrate without losing production, credits, unlocked depths or installed modules; research starts at zero and completed mission requirements count immediately. Before replacing an older save, its original is backed up to `abyss-corp.save.v1-backup`, `abyss-corp.save.v2-backup`, `abyss-corp.save.v3-backup`, `abyss-corp.save.v4-backup` or `abyss-corp.save.v5-backup`. Returning version 1 cargo was already paid and receives no duplicate reward.

Invalid or unsupported saves are not overwritten. Restore a valid backup or allow browser storage, then **Retry loading**. Write failures retain the session in memory and offer **Retry saving**.

Offline time uses the device clock, ignores negative elapsed time and caps each absence at four hours. Use one game tab at a time. No backend or cloud synchronization yet. See [architecture notes](docs/architecture.md). The backend is local in this milestone; account sign-in and cross-device recovery require future work. See [backend setup and authentication design](docs/backend.md). See [live game systems](docs/live-ops.md) for the new bulletin, events, consent and configuration.

## Server backups

Choose **Settings → Server backup → Sync** to connect a guest browser profile and store a server copy. Local autosave keeps working independently. Server revisions prevent stale uploads from silently replacing newer copies. If progress diverges, choose **Keep this device** or **Use server**. Restoring first saves the current local progress under `abyss-corp.save.before-server-restore`.

The backend stores data in `.data/abyss.sqlite`, excluded from Git, retaining ten preceding server revisions. Guest sessions use HttpOnly cookies and expire after 30 days. Clearing cookies loses access to that guest server profile; it does not remove local saves. Server sync is manual, and this local setup is not a hosted cloud service.

Use `npm run dev:api` or `npm run start:api` when running the API separately. Preview mode requires the API to be running as well. No tests are run by these commands.

## Live bulletin and timed events

Open **Events** in the bottom dock for the timed event from the local API. The Founders expedition runs October 26–November 2, 2026 (UTC): unlock two outposts and install one sales module to collect a one-time 250 CR grant. The panel shows requirements and time remaining. A missing server leaves regular play available.

**Settings → Share gameplay usage** is off by default. Opt in only if you want allowlisted game actions and a presentation experiment group sent to this game's local server. Turn it off to clear queued actions and stop new sharing. No external analytics service, payments or push notifications are integrated.

Operators can edit `server/config/live-ops.json` without rebuilding the frontend. The server validates the file on every request, and the client refreshes once a minute. See [operator and analytics notes](docs/live-ops.md).

## Game interface

The ocean occupies the viewport. Corporate credits and depth are in the HUD; production stock and **Sell cargo** sit above the four upgrade buttons. Select a machine in the scene to highlight its upgrade. The depth rail changes outposts or unlocks the next one. **Start/Pause** controls the selected operation.

Research, missions, crew and events open from the bottom dock. The gear opens local/server saves and usage-sharing preferences. Dialogs support Escape, backdrop dismissal and native keyboard focus. The main board has no page sections, footer or explanatory paragraphs.

Artwork is made from reusable SVG models in `WorldModels.tsx`: shaded machinery, a glass-domed refinery, a warehouse and cargo submarine. Each biome has its own water palette, reef and resources. Motion reflects production, with ambient fish, bubbles and lighting; reduced-motion preferences are respected. These are lightweight 2.5D illustrations, not downloaded 3D models. The interface adapts to smaller viewports without changing saved progress.
