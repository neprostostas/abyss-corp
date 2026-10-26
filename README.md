# Abyss Corp

A bright underwater idle/tycoon game, built in small milestones. **Current scope: Milestone 1 — First playable vertical slice.** One crystal vein, one submarine, an earning loop, two upgrade categories, and local saves.

Read [ABYSS_CORP_PROJECT_SPEC.md](ABYSS_CORP_PROJECT_SPEC.md) completely before making changes. It is the persistent product and engineering specification.

## Run locally

Use Node.js 22.13+ on the 22.x line, or Node.js 24+, and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. No external art or font requests are needed.

## Play and verify

1. Click **Start operation**. The submarine extracts three crystals in four seconds, delivers them in 2.5 seconds, and returns empty in 2.5 seconds.
2. Confirm credits increase by **15 only on delivery**, while cargo appears during the loaded trip.
3. After two deliveries (about 16 seconds), buy either **30 CR** upgrade. Its level increases, credits are deducted, and the corresponding stage gets faster. Both categories have five levels.
4. Pause, click **Save now**, and refresh. Credits, levels, phase progress, and paused state should remain. Resume to continue the same cycle.
5. Switch away from the tab, then return. Hidden/closed time should grant no income. Check desktop and narrow mobile widths, keyboard focus, and the browser console.

```sh
npm run check
npm run build
npm run preview
```

`check` runs strict TypeScript, type-aware ESLint, Vitest, and formatting checks. `npm test` runs only the domain, persistence, and session tests. `build` also type-checks before creating `dist`; `preview` serves that production build locally.

Use `npm run format` to format project files. The product specification is excluded so tooling does not rewrite it.

## Save behavior and limits

Progress stays in this browser and origin, under the versioned `abyss-corp.save` localStorage key. Use one game tab at a time. Autosave runs every two seconds and on actions/hide/exit; an abrupt crash can lose the latest unsaved interval. Changing the port or clearing browser data changes/removes the available save.

An invalid or future-version save blocks loading without overwriting it. Restore a valid backup or enable browser storage, then select **Retry loading**. A write failure displays **Retry saving** while keeping the current session in memory. No reset/delete action is provided.

There is no offline income, processing/storage system, depth unlocking, manager system, or backend in this milestone. See [architecture notes](docs/architecture.md) for boundaries and simulation details. The next step is **Milestone 2 — Multi-stage production**.
