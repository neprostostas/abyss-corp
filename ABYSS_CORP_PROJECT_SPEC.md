# Abyss Corp — Project Brief & Engineering Guide

> **Purpose of this file**
>
> This document is the persistent product + engineering context for **Abyss Corp**.
> It is not a request to build the entire game at once.
>
> Any coding agent working on this project should read this file first, preserve its principles, and implement the game **incrementally in small, testable milestones**.

---

## 1. Product vision

**Abyss Corp** is a polished underwater idle / tycoon game inspired by the satisfying progression loop of games such as idle mining managers, but with its own world, visual identity, systems, and progression.

The player runs an underwater corporation that expands deeper into the ocean, extracts resources, automates production, upgrades infrastructure, and gradually turns a small outpost into a huge multi-layer underwater industrial network.

The game should feel:

- immediately understandable;
- visually satisfying even when the player is not interacting;
- clean and readable;
- playful, premium, and polished;
- scalable from a tiny MVP into a much larger live game;
- easy to extend with new depths, resources, buildings, workers, research, missions, and events.

The project should **not** try to reproduce another game's exact UI, assets, balancing, map, or progression.

---

## 2. Visual direction

The current visual north star is:

- bright stylized underwater sci-fi;
- cute but not childish;
- large readable shapes;
- clear industrial silhouettes;
- white / blue / yellow machinery;
- colorful corals and sea life;
- glowing resources;
- friendly submarines, drones, robots, and workers;
- satisfying conveyor belts and visible resource movement;
- strong vertical depth;
- progressively darker / more mysterious environments as the player descends;
- polished mobile-game readability;
- clean cards, upgrade buttons, resource counters, and status indicators.

### Core visual idea

The world should be readable as a **vertical industrial ecosystem**.

At the top:
- headquarters;
- storage;
- docks;
- global controls;
- corporate identity.

Below:
- individual depth layers;
- mining zones;
- resource veins;
- transport systems;
- processing machinery;
- elevators;
- conveyors;
- drones;
- submarines;
- unlock gates.

The deeper the player goes, the more exotic the environment and resources become.

### Early resource fantasy

Possible early resources:

1. Crystals
2. Gold
3. Pearls
4. Rare minerals
5. Bioluminescent compounds
6. Abyssal artifacts

Do not implement all of them immediately.

---

## 3. Core gameplay loop

The main loop is:

**Extract → Transport → Process → Store/Sell → Earn → Upgrade → Automate → Unlock deeper layer**

The loop must remain easy to understand.

The player should always have at least one obvious answer to:

- What is producing money?
- What is currently the bottleneck?
- What can I upgrade?
- What will the next unlock give me?
- How far am I from the next meaningful milestone?

---

## 4. Primary game systems

These systems are part of the long-term design, but they must be implemented gradually.

### 4.1 Mining

Each depth layer can contain one or more resource nodes.

A node may define:

- resource type;
- base extraction speed;
- base output;
- capacity;
- unlock cost;
- upgrade level;
- visual state.

### 4.2 Transport

Resources must move from extraction to processing or storage.

Possible transport systems:

- worker drones;
- mini submarines;
- elevators;
- conveyor belts;
- cargo pods.

Transport should eventually become a gameplay bottleneck that can be upgraded independently.

### 4.3 Processing

Raw resources may be converted into higher-value resources.

Example:

`Raw Crystal → Refined Crystal → Corporate Credits`

The MVP does not need complex crafting.

### 4.4 Storage

Storage can cap how much material can accumulate before production slows or pauses.

This creates another upgrade dimension.

### 4.5 Upgrades

Main categories:

- Mining
- Transport
- Processing
- Storage

Later:

- Energy
- Automation
- Research
- Drone efficiency
- Corporate bonuses
- Global multipliers

### 4.6 Depth progression

The ocean is divided into layers.

Example progression:

- Surface Base
- Shallow Zone
- Crystal Shelf
- Golden Trench
- Pearl Caverns
- Deep Zone
- Abyssal Layer

Each depth should feel like a meaningful new stage rather than only a number increase.

### 4.7 Automation

Automation is an important long-term progression mechanic.

The player starts with more manual involvement and gradually unlocks:

- auto mining;
- auto transport;
- auto processing;
- automatic upgrades;
- managers;
- research bonuses.

Do not add every automation feature in the first milestone.

### 4.8 Offline progress

Eventually the player should earn resources while away.

Basic model:

1. store last valid session timestamp;
2. calculate elapsed time;
3. cap offline duration;
4. calculate production using deterministic domain logic;
5. show a clear offline earnings summary.

Later, a backend may provide authoritative time for cloud saves and anti-cheat purposes.

---

## 5. MVP philosophy

The MVP is **not** the full game.

The first playable version should prove only that the main loop feels good.

### MVP should contain

- one main base screen;
- one depth layer;
- one mineable resource;
- one extraction system;
- one transport step;
- one earning loop;
- a small number of upgrades;
- visible production;
- simple progression;
- local persistence;
- clean UI structure;
- enough visual feedback to feel like a game rather than an admin dashboard.

### MVP should NOT contain

- multiplayer;
- large backend;
- authentication;
- guilds;
- complex live ops;
- dozens of resources;
- 20+ depth layers;
- monetization store;
- ad integrations;
- advanced research trees;
- complex achievements;
- full analytics pipeline;
- server-authoritative economy.

These can be added after the core loop is proven.

---

## 6. Development philosophy

### The most important rule

**Never attempt to build Abyss Corp in one giant implementation pass.**

Work in small milestones.

Each milestone should:

1. have one clear goal;
2. touch a limited number of systems;
3. leave the project runnable;
4. avoid unnecessary rewrites;
5. include a quick verification step;
6. preserve future extensibility.

Prefer:

- simple;
- explicit;
- typed;
- testable;
- modular;
- boring-but-reliable architecture.

Avoid:

- premature abstractions;
- giant components;
- global mutable state;
- duplicated business logic;
- magic numbers;
- tightly coupling UI with economy calculations;
- deeply nested conditional logic;
- creating infrastructure for features that may never exist;
- rewriting stable code without strong reason.

---

## 7. Recommended technical direction

The exact stack may be adjusted if the repository already uses something else, but the preferred direction is:

### Client

- **TypeScript**
- **React**
- **Vite**
- **Phaser** or another lightweight 2D rendering/game layer when the world scene needs it
- React for HUD, menus, modals, upgrade panels, settings, and standard UI
- game renderer for the animated world when appropriate

### State

Prefer a small predictable state solution.

Recommended:

- Zustand for client/application state

Do not put the entire game simulation directly into UI state.

### Validation

- Zod or equivalent schema validation where runtime validation matters

### Local persistence

For early development:

- localStorage for tiny simple settings;
- IndexedDB for structured save data when save complexity grows.

Persistence must sit behind an abstraction so it can later be replaced or synchronized with a backend.

### Testing

- Vitest for domain/unit tests;
- React Testing Library where useful;
- Playwright later for critical end-to-end flows.

### Quality

- ESLint
- Prettier
- strict TypeScript
- no unexplained `any`
- no swallowed errors

---

## 8. Architecture principles

The project should keep four concerns conceptually separated.

### 8.1 Domain

Pure game rules.

Examples:

- production calculations;
- upgrade costs;
- resource rates;
- layer unlock rules;
- offline progress;
- economy formulas.

Domain code should have minimal dependency on React, Phaser, browser APIs, or storage.

### 8.2 Application

Coordinates game actions and use cases.

Examples:

- upgrade building;
- collect earnings;
- unlock layer;
- load game;
- save game;
- apply offline progress.

### 8.3 Infrastructure

Technical integrations.

Examples:

- local save adapter;
- IndexedDB adapter;
- API client;
- analytics adapter;
- backend repository;
- clock implementation.

### 8.4 Presentation

What the player sees.

Examples:

- React components;
- HUD;
- mine cards;
- world scene;
- animations;
- modals;
- buttons;
- tooltips.

The presentation layer should not become the source of truth for economy logic.

---

## 9. Suggested folder structure

Do not create empty folders only for appearance. Introduce them when required.

```text
src/
  app/
    bootstrap/
    providers/
    routing/

  domain/
    economy/
    resources/
    upgrades/
    layers/
    progression/
    offline/

  application/
    commands/
    queries/
    services/

  game/
    scene/
    entities/
    animation/
    rendering/

  ui/
    components/
    hud/
    panels/
    screens/
    modals/

  state/
    stores/
    selectors/

  data/
    resources/
    upgrades/
    layers/
    balancing/

  infrastructure/
    persistence/
    api/
    analytics/
    clock/

  shared/
    types/
    utils/
    constants/
    errors/

  tests/
```

If the project is still very small, keep the real structure smaller and grow toward this shape naturally.

---

## 10. Data-driven design

Game content should gradually move toward configuration instead of duplicated code.

Good candidates for data-driven definitions:

- resource types;
- layer definitions;
- upgrade definitions;
- unlock requirements;
- base production rates;
- visual metadata;
- balancing coefficients.

Example conceptual shape:

```ts
type ResourceDefinition = {
  id: string;
  name: string;
  baseValue: number;
  icon: string;
};

type LayerDefinition = {
  id: string;
  name: string;
  depthMeters: number;
  unlockCost: number;
  primaryResourceId: string;
};
```

Do not make every behavior configurable just because it can be.

---

## 11. Economy rules

Idle game economy must remain deterministic and inspectable.

### Important rules

- one function should own each important formula;
- do not duplicate upgrade calculations across components;
- do not hardcode balancing values inside JSX;
- keep balancing values centralized;
- avoid uncontrolled floating-point drift where it could break progression;
- use clear rounding rules;
- show formatted numbers separately from the internal value.

For very large numbers, introduce a dedicated large-number representation only when actually necessary.

Possible future formatting:

- 1.2K
- 4.8M
- 2.3B
- 7.1T

Display formatting should never change the stored economic value.

---

## 12. Save architecture

From the beginning, saving should have an explicit boundary.

Conceptually:

```ts
interface SaveRepository {
  load(): Promise<GameSave | null>;
  save(data: GameSave): Promise<void>;
}
```

Early implementation:

`LocalSaveRepository`

Future implementations:

- `IndexedDbSaveRepository`
- `CloudSaveRepository`
- `SyncedSaveRepository`

Game rules should not care where the save lives.

### Save data should include

Eventually:

- save version;
- player progression;
- currencies;
- unlocked layers;
- upgrade levels;
- automation states;
- last active timestamp;
- settings;
- tutorial state.

Do not persist derived values that can safely be recalculated.

---

## 13. Save versioning and migrations

Every persisted save should have a version.

Example:

```ts
type GameSave = {
  version: number;
  player: PlayerSave;
  progression: ProgressionSave;
  lastActiveAt: string;
};
```

When data structures change, create explicit migrations.

Never silently assume an old save matches the current schema.

---

## 14. Future backend architecture

Do not build the backend at the start.

The client should nevertheless be structured so a backend can be introduced without rewriting the entire game.

### Likely future backend responsibilities

- authentication;
- player profile;
- cloud save;
- server time;
- purchase validation;
- remote configuration;
- event/live-ops data;
- analytics ingestion;
- leaderboards if added;
- anti-cheat checks;
- cross-device synchronization.

### Recommended future backend direction

A pragmatic future stack could be:

- TypeScript backend;
- Node.js;
- Fastify / NestJS depending on complexity;
- PostgreSQL;
- Prisma or Drizzle;
- Redis only if a real need appears;
- object storage/CDN for remote content when necessary.

Do not introduce Redis, queues, microservices, Kubernetes, or distributed architecture without a concrete need.

---

## 15. Future database model

Conceptual entities:

### Player

- id
- createdAt
- updatedAt

### PlayerProfile

- playerId
- displayName
- settings
- tutorialState

### PlayerProgress

- playerId
- currentDepth
- unlockedLayers
- progressionVersion

### PlayerCurrency

- playerId
- currencyId
- amount

### PlayerUpgrade

- playerId
- upgradeId
- level

### PlayerLayerState

- playerId
- layerId
- unlocked
- state

### PlayerAutomation

- playerId
- automationId
- enabled
- level

### PlayerSaveSnapshot

Useful later for:

- backup;
- recovery;
- migration;
- conflict handling.

Do not create all tables until the backend actually exists.

---

## 16. Cloud save strategy

When cloud saves are introduced, define an explicit conflict strategy.

Possible approach:

- revision number;
- updated timestamp;
- device identifier;
- server-side validation;
- deterministic merge only where safe.

Avoid naive "last write always wins" if it can destroy progression.

For the first versions, local save is enough.

---

## 17. Security model

Anything entirely client-side can eventually be modified by the player.

Therefore:

### Fine to trust locally in MVP

- visual state;
- temporary UI state;
- local test progression;
- non-monetized offline calculations.

### Later needs server validation

- purchases;
- premium currency;
- competitive leaderboards;
- valuable rewards;
- limited-time event rewards;
- economy states that affect monetization.

Do not build anti-cheat before it is needed.

---

## 18. Time abstraction

Idle/offline games depend heavily on time.

Avoid spreading `Date.now()` everywhere.

Prefer a small clock abstraction:

```ts
interface Clock {
  now(): number;
}
```

This allows:

- deterministic tests;
- offline progress testing;
- future server-time integration.

---

## 19. UI architecture

The UI should remain reusable.

Build shared primitives for:

- resource counters;
- upgrade buttons;
- panels;
- badges;
- progress bars;
- tooltips;
- modal shells;
- section headers.

Do not create a separate one-off component for every tiny visual variation.

### Visual hierarchy

The player should easily see:

1. current money/resources;
2. current production;
3. current bottleneck;
4. available upgrades;
5. next unlock.

---

## 20. World architecture

The underwater base should feel alive.

Even in the MVP, prefer visible motion such as:

- bubbles;
- conveyor movement;
- drones moving;
- resource particles;
- elevator motion;
- simple machine cycles;
- small idle animations.

Animation should communicate production, not merely decorate the screen.

---

## 21. Performance principles

Do not optimize prematurely, but avoid obvious traps.

### Good practices

- keep React rerenders localized;
- derive state using selectors;
- do not update the entire app 60 times per second;
- game animation loop and UI state loop can run separately;
- batch economic updates;
- prefer deterministic ticks for economy;
- use object pooling only when proven necessary;
- lazy-load large art/assets later.

The economy does not need to run at render-frame frequency.

---

## 22. Game simulation model

Prefer a fixed or scheduled economic tick.

Example:

- world animation: normal frame loop;
- economy simulation: 4–10 ticks/second or less;
- UI display updates: throttled where appropriate.

The exact rate should be chosen based on feel, not habit.

Production formulas should support calculating elapsed time without simulating every frame.

This is important for:

- offline progress;
- background tabs;
- mobile performance;
- deterministic testing.

---

## 23. Error handling

Errors should be visible during development.

Do not:

- silently catch everything;
- ignore failed saves;
- ignore invalid configuration;
- continue with corrupted data without fallback.

Prefer:

- typed errors where useful;
- defensive validation at boundaries;
- logging in development;
- safe fallback save behavior;
- recoverable UI when persistence fails.

---

## 24. Testing priorities

Do not chase 100% coverage.

Prioritize tests around business logic.

### High-value tests

- production calculations;
- upgrade cost formulas;
- upgrade effects;
- unlock requirements;
- offline earnings;
- save migrations;
- serialization/deserialization;
- caps and rounding;
- invalid state handling.

UI snapshots are much lower priority than domain correctness.

---

## 25. Milestone roadmap

The agent must not implement later milestones unless explicitly asked.

### Milestone 0 — Foundation

Goal:
Create the technical skeleton.

Include:

- project setup;
- TypeScript strictness;
- linting/formatting;
- base folder structure;
- minimal app shell;
- basic theme tokens;
- one placeholder game screen;
- architecture notes.

Do not build the game economy yet beyond what is needed to prove structure.

### Milestone 1 — First playable vertical slice

Goal:
Prove the core loop.

Include:

- one resource;
- one depth;
- mining;
- transport;
- earnings;
- one or two upgrade categories;
- visible production;
- local save;
- basic animation/feedback.

### Milestone 2 — Multi-stage production

Add:

- mining;
- transport;
- processing;
- storage;
- bottlenecks;
- clearer production flow.

### Milestone 3 — Depth progression

Add:

- multiple layers;
- unlock costs;
- layer configuration;
- navigation/scrolling;
- new resources.

### Milestone 4 — Automation

Add:

- managers or automation modules;
- automation upgrades;
- better offline loop.

### Milestone 5 — Progression systems

Possible:

- research;
- global bonuses;
- missions;
- achievements;
- prestige/reset mechanic if it fits the game.

Do not assume prestige is required.

### Milestone 6 — Backend readiness

Only when needed:

- API boundary;
- authentication design;
- cloud save;
- database;
- synchronization.

### Milestone 7 — Live game systems

Only after the core game works:

- analytics;
- remote config;
- events;
- monetization;
- notifications;
- experiments.

---

## 26. Working protocol for coding agents

For every task:

### Before coding

Return a concise plan containing:

1. goal of this step;
2. files/systems likely to change;
3. what will intentionally NOT be implemented;
4. risks or architectural decisions, only if relevant.

Then implement the step.

Do not produce a huge essay.

### During implementation

- inspect existing code first;
- preserve working behavior;
- reuse existing patterns where good;
- refactor only when there is a clear benefit;
- keep changes focused;
- keep types strict;
- avoid unrelated cleanup.

### After implementation

Return:

1. what changed;
2. how to verify it;
3. known limitations;
4. recommended next step.

Do not automatically implement the next milestone.

---

## 27. Definition of done for a milestone

A milestone is complete only if:

- project runs;
- no obvious TypeScript errors;
- no obvious console errors;
- main path works;
- important domain rules are testable;
- implementation does not depend on accidental UI state;
- new values are not scattered as magic numbers;
- persistence changes are backward-safe or explicitly versioned;
- the code remains understandable.

---

## 28. Code review checklist

Before considering a task finished, check:

### Architecture

- Is business logic outside presentation components?
- Is state ownership clear?
- Are persistence boundaries respected?
- Is the code simpler than the problem requires, not more complex?

### Type safety

- Any unnecessary `any`?
- Any unsafe casts?
- Are nullable states handled explicitly?

### Economy

- Are formulas centralized?
- Are costs and multipliers deterministic?
- Are rounding rules clear?

### UI

- Is the player-facing state readable?
- Does the UI communicate production?
- Are reusable elements actually reused?

### Persistence

- Can the save fail safely?
- Is save schema versioned?
- Are derived values being unnecessarily persisted?

### Performance

- Any high-frequency global state updates?
- Any React component rerendering the whole game unnecessarily?

### Maintainability

- Is naming clear?
- Are functions reasonably small?
- Are responsibilities obvious?
- Is there duplicated logic?

---

## 29. Product principles to protect

Do not lose these while adding features.

### Principle 1 — Satisfying motion

The game should visibly show its economy working.

### Principle 2 — Strong progression

Every meaningful upgrade should be felt or seen.

### Principle 3 — Readable complexity

The game may become deep, but the current player decision should remain clear.

### Principle 4 — Layered expansion

Going deeper should visually and mechanically transform the world.

### Principle 5 — Build systems, not hacks

New content should mostly be added through configuration and reusable systems.

### Principle 6 — No premature backend

Build boundaries now; build infrastructure when it is actually needed.

### Principle 7 — Quality over speed

A smaller stable milestone is better than a large fragile implementation.

---

## 30. Current starting objective

The project should begin with **Milestone 0**, unless the repository already has a solid foundation.

The first coding agent should:

1. inspect the repository;
2. compare the existing structure with this document;
3. avoid destructive rewrites;
4. propose the smallest useful foundation step;
5. implement only that step;
6. leave the project running;
7. report the recommended next task.

The agent must **not** implement the entire roadmap automatically.

---

## 31. First playable target

The first meaningful playable target should eventually look like this:

- a single bright underwater mining layer;
- one visible resource node;
- one cute worker/drone/submarine extracting resource;
- visible resource movement;
- one destination/storage/processor;
- credits increasing;
- one or two obvious upgrade buttons;
- production visibly speeding up after upgrades;
- state preserved after refresh;
- clean, polished HUD;
- architecture already capable of supporting more layers later.

That is enough to validate the foundation.

---

## 32. Non-goals for early development

Do not spend time on these before the core loop is fun:

- complicated authentication;
- multiplayer;
- social systems;
- advanced cloud infrastructure;
- excessive analytics;
- elaborate admin tools;
- deep monetization;
- content management systems;
- microservices;
- complicated procedural generation;
- overbuilt ECS architecture unless the project proves it needs one.

---

## 33. Final engineering rule

When there is a choice between:

**A)** a huge flexible architecture for hypothetical future features

and

**B)** a small clean architecture with explicit extension points

choose **B**.

Abyss Corp should grow through disciplined milestones, not speculative complexity.
