# Xama — Engineering Roadmap

## Purpose

This document defines the implementation sequence for the initial Xama product.

It exists to keep development incremental, reviewable, and aligned with the approved product, UX, and architecture documentation.

The roadmap should be implemented **one milestone at a time**.

Do not proactively begin later milestones unless explicitly requested.

Each milestone should leave the repository in a working state.

---

## Execution Principles

For every milestone:

1. Read the relevant project documentation before making architectural decisions.
2. Preserve existing approved behavior unless the milestone explicitly changes it.
3. Reuse existing code before introducing new abstractions.
4. Do not implement future roadmap items early merely because they seem related.
5. Keep desktop and mobile web behavior in mind for every UI change.
6. Keep provider-specific code behind the boundaries defined in `ARCHITECTURE.md`.
7. Keep the application runnable at the end of the milestone.
8. Run the repository quality checks required at that stage.
9. Document major architectural changes when they intentionally alter the approved direction.
10. Prefer small, focused changes over broad speculative refactors.

---

# Phase 1 — Product Foundation

The first phase creates a production-quality frontend foundation and validates the complete Xama interaction model using mock data.

No real backend or media provider is required yet.

This allows UX and architecture to stabilize before external integrations increase complexity.

---

## Milestone 0 — Repository Foundation

### Objective

Create the initial production workspace and development environment.

### Scope

Set up:

- `pnpm` workspace;
- React;
- TypeScript;
- Vite;
- Tailwind CSS;
- shadcn/ui foundation where useful;
- React Router;
- TanStack Query;
- strict TypeScript configuration;
- linting;
- formatting;
- test runner foundation;
- build commands;
- environment variable structure;
- initial package boundaries;
- semantic design tokens.

Create the initial workspace structure:

```text
apps/
└── web/

packages/
├── domain/
└── design-tokens/
```

Keep existing:

```text
assets/
docs/
reference/
```

Prepare:

```text
supabase/
```

only if required for repository structure or later CLI initialization.

Do not create database schema yet.

### Branding

Use the official repository references:

```text
assets/brand/xama-symbol.png
assets/brand/xama-lockup.png
```

The implementation may copy or reference appropriate assets inside the web application as needed.

Do not redesign the logo.

### Initial scripts

Provide consistent repository commands for at least:

```text
dev
build
lint
typecheck
test
format
```

### Environment

Provide:

```text
.env.example
```

without real credentials.

### Non-Goals

Do not implement:

- application shell;
- authentication;
- Supabase integration;
- LiveKit integration;
- communities;
- channels;
- chat;
- voice;
- screen sharing;
- native mobile;
- native desktop;
- plugin infrastructure.

### Acceptance Criteria

The milestone is complete when:

- dependencies install successfully;
- `pnpm dev` starts the web application;
- `pnpm build` succeeds;
- `pnpm lint` succeeds;
- `pnpm typecheck` succeeds;
- the initial test command succeeds;
- the workspace structure follows `ARCHITECTURE.md`;
- the app renders a minimal Xama placeholder using the design-token foundation;
- no real backend or media integration exists.

---

## Milestone 1 — Responsive Application Shell

### Objective

Implement the structural Xama interface using mock data.

### Scope

Implement the main responsive application shell.

Desktop structure should support:

```text
Community Rail
|
Community Navigation
|
Primary Content
|
Optional Contextual Panel
```

Implement:

- global/community rail;
- community navigation region;
- primary content region;
- current-user area;
- basic routing;
- mocked communities;
- mocked channels;
- selected-community state;
- selected-channel state;
- workspace-style panel separation;
- responsive mobile presentation.

Use the reference prototype and screenshots under:

```text
reference/prototype/
```

Follow:

```text
docs/PROTOTYPE.md
docs/UX.md
```

### Desktop

The application should visually establish:

- compact community rail;
- community navigation sidebar;
- primary content;
- restrained workspace-style panel boundaries;
- subtle gaps and rounding between major regions.

The community navigation sidebar should support horizontal resizing within sensible bounds.

Persistence is not required yet.

### Mobile Web

Implement an actual responsive layout rather than scaling down the desktop shell.

On narrow layouts:

- primary content receives most of the viewport;
- community/channel navigation becomes temporary;
- permanent desktop sidebars should not consume excessive width;
- touch targets remain usable.

### Non-Goals

Do not implement:

- adaptive navigation logic;
- favorites;
- real messages;
- real member data;
- voice sessions;
- screen sharing;
- backend integration.

### Acceptance Criteria

The user can:

- switch between mocked communities;
- switch between mocked channels;
- resize the desktop community navigation sidebar;
- use the same application on a narrow mobile viewport;
- open and close mobile navigation;
- navigate without layout breakage.

The result should feel related to the prototype without reproducing Discord pixel-for-pixel.

---

## Milestone 2 — Adaptive Navigation and Favorites

### Objective

Implement the main Xama community-navigation differentiator.

### Scope

Implement:

- Simplified navigation;
- Modular navigation;
- Automatic navigation;
- prototype navigation-mode switcher for development;
- mocked favorites;
- favorite/unfavorite interaction;
- favorites section when favorites exist.

### Simplified

Show text and voice channels together in clearly separated sections.

### Modular

Support segmented navigation such as:

```text
Canais
Voz
Atividade
```

Activity may remain a lightweight placeholder.

Do not build a dashboard or activity feed.

### Automatic

Implement a small isolated heuristic that resolves the presentation mode from mocked community complexity.

The heuristic must be easy to replace later.

Do not treat the initial threshold as permanent product logic.

### Favorites

Support mocked user-specific favorite state for:

- text channels;
- voice channels.

Favorites should remain easily accessible when present.

### Responsive Behavior

Adaptive navigation must also work on mobile web.

Do not duplicate navigation business logic between desktop and mobile.

### Acceptance Criteria

The user can:

- switch between Simplified and Modular modes;
- select Automatic mode;
- observe different mock communities resolving differently;
- favorite a channel;
- unfavorite a channel;
- see favorites reflected immediately;
- use all navigation modes on mobile.

---

## Milestone 3 — Text Chat Experience

### Objective

Implement the production-oriented chat interface using mock data.

### Scope

Implement:

- message list;
- message groups;
- timestamps;
- avatars;
- channel header;
- message composer;
- sending local mock messages;
- contextual message actions;
- empty channel state;
- mocked unread state where useful.

Use realistic mock content.

### Desktop

Message secondary actions may appear on hover.

### Mobile

Provide touch-accessible equivalents for actions that rely on hover on desktop.

Ensure the virtual keyboard does not make the composer unusable.

### Performance Preparation

Do not implement premature virtualization unless required.

Structure message rendering so incremental loading and future virtualization remain possible.

### Non-Goals

Do not implement:

- Supabase messages;
- Realtime;
- file uploads;
- threads;
- reactions backend;
- advanced moderation.

### Acceptance Criteria

The user can:

- navigate between channels;
- read different mocked histories;
- compose a message;
- send a message locally;
- access contextual message actions;
- perform the same core flow on mobile.

---

## Milestone 4 — Members and Contextual Panels

### Objective

Implement the approved members-panel behavior.

### Scope

Implement mocked member data and member-list presentation.

### Desktop

On sufficiently wide layouts:

- opening members adds a real layout column;
- primary content resizes;
- existing chat content is not covered.

The panel may later become width-adjustable, but manual resizing is not required unless implementation cost is small and justified.

### Mobile

Display members through a temporary surface such as:

- drawer;
- sheet;
- overlay.

Do not compress the mobile chat into multiple narrow columns.

### Acceptance Criteria

The user can:

- open members;
- close members;
- continue interacting with chat;
- resize the community sidebar while members are visible;
- use members on mobile without hiding essential navigation permanently.

---

## Milestone 5 — Mock Global Voice Session

### Objective

Validate Xama's global voice UX before integrating LiveKit.

### Scope

Implement a mocked global voice-session state.

Support:

- disconnected state;
- connected state;
- mocked participants;
- mocked microphone state;
- mocked audio/deafen state;
- mocked leave action;
- mocked screen-share availability.

Voice session state must exist above route-specific content.

### Desktop Compact Voice Surface

Place the compact voice component:

**at the bottom of the community navigation region, above the current-user area.**

It must:

- remain compact;
- avoid floating over chat;
- remain visible while navigating;
- display room identity;
- display community identity when necessary.

### Expanded Voice Surface

Clicking the compact component should expose expanded controls through a temporary surface.

Do not create a permanent large bottom toolbar.

### Navigation Persistence

The user should be able to:

1. connect to mocked `Xama Lab / Lobby`;
2. navigate to another text channel;
3. navigate to another community;
4. remain connected to `Xama Lab / Lobby`.

### Mobile

Provide a compact persistent mobile voice surface.

Expanded voice controls should use a touch-friendly temporary presentation.

### Acceptance Criteria

Voice-session UI remains active and correct across route changes on both desktop and mobile.

---

## Milestone 6 — Mock Screen-Sharing Experience

### Objective

Validate the complete Xama screen-sharing interaction model before integrating real media.

### Scope

Implement mocked stream state and the following presentation modes:

```text
focus
mini
hidden
```

### Focus Mode

The mocked stream becomes the primary content surface.

Navigation remains available.

### Navigation While Watching

Navigating away from a focused stream should move it to mini-player mode rather than blocking navigation.

### Desktop Mini-player

Implement:

- draggable positioning;
- sensible application bounds;
- proportional corner resizing;
- minimum size;
- maximum size;
- hidden controls when idle;
- hover controls;
- restore-to-focus action;
- hide action.

Free dragging is preferred.

Subtle edge/corner snapping may be added if it improves usability without restricting placement.

Do not persist position or size to backend yet.

### Hidden State

Hiding the stream:

- removes the visible player;
- keeps voice connected;
- keeps subtle stream availability visible through the global voice surface;
- allows the user to reopen the stream.

### Mobile Mini-player

Provide a touch-friendly equivalent.

Mobile does not need arbitrary desktop-style corner resizing.

Prefer predictable touch behavior and limited obstruction.

### Acceptance Criteria

The user can:

- start watching a mocked stream;
- view it in focus mode;
- navigate elsewhere and receive mini-player mode;
- move the desktop mini-player;
- resize it proportionally;
- return it to focus;
- hide it;
- remain connected to mocked voice;
- reopen the hidden stream;
- use an appropriate mobile version of this flow.

---

## Milestone 7 — Mock UX Consolidation

### Objective

Review and stabilize the complete frontend experience before introducing backend complexity.

### Scope

Review together:

- responsive behavior;
- navigation;
- favorites;
- chat;
- members;
- voice;
- screen share;
- design tokens;
- accessibility basics;
- panel resizing;
- workspace-style visual consistency.

Remove obvious prototype-only shortcuts that should not continue into backend integration.

### Required Review

Compare the implementation with:

```text
docs/PRODUCT.md
docs/UX.md
docs/PROTOTYPE.md
docs/ARCHITECTURE.md
```

### Non-Goals

Do not add new product features during this milestone.

### Acceptance Criteria

The application provides a coherent mocked version of the complete initial Xama UX on:

- desktop;
- representative mobile viewport.

All repository checks pass.

---

# Phase 2 — Real Product Data

After the UX foundation is stable, replace mock product data incrementally.

---

## Milestone 8 — Supabase Development Foundation

### Objective

Introduce Supabase without coupling the application directly to it.

### Scope

Set up:

- Supabase project integration;
- Supabase CLI;
- local migration structure;
- generated database types where useful;
- environment configuration;
- browser client adapter;
- server-side function foundation when required.

Create migrations for the first validated schema.

Expected initial concepts may include:

```text
profiles
communities
community_members
channels
channel_favorites
messages
invites
```

The final schema should be designed from actual feature requirements rather than copied blindly from this list.

### Security

Implement Row Level Security from the beginning.

Do not postpone authorization until later.

### Data Access

Introduce feature-level repositories/services according to `ARCHITECTURE.md`.

Do not scatter:

```text
supabase.from(...)
```

through React presentation components.

### Acceptance Criteria

- migrations reproduce the schema;
- RLS exists for protected data;
- environment secrets are handled correctly;
- frontend can reach the development Supabase environment through approved boundaries;
- no service-role secret exists in client code.

---

## Milestone 9 — Authentication and Profiles

### Objective

Replace mocked identity with real authenticated users.

### Scope

Implement:

- authentication flow;
- session restoration;
- logout;
- basic Xama profile;
- protected application routes;
- user display name;
- avatar foundation.

The exact initial authentication providers may be selected at implementation time.

### Acceptance Criteria

A user can:

- authenticate;
- refresh the application and remain authenticated;
- access the protected Xama application;
- log out;
- have a corresponding product profile.

---

## Milestone 10 — Communities, Membership, Channels, and Favorites

### Objective

Replace mocked navigation data with real product data.

### Scope

Implement real:

- communities;
- membership;
- text channels;
- voice channels;
- navigation;
- favorites.

Preserve:

- Simplified;
- Modular;
- Automatic

navigation behavior.

Favorites remain user-specific.

### Acceptance Criteria

A user can:

- access communities they belong to;
- navigate real channels;
- favorite/unfavorite channels;
- observe persisted favorites;
- use adaptive navigation with real data.

---

## Milestone 11 — Real Text Messaging

### Objective

Replace mock chat with persisted messages.

### Scope

Implement:

- message queries;
- message creation;
- paginated/incremental history;
- authorization;
- loading states;
- failure states.

### Non-Goals

Realtime is not required yet.

The first goal is correct persisted messaging.

### Acceptance Criteria

A message sent by a user:

- is persisted;
- survives refresh;
- appears in the correct channel;
- cannot be accessed outside authorization rules.

---

## Milestone 12 — Realtime Messaging

### Objective

Make text chat update across active clients without refresh.

### Scope

Integrate Supabase Realtime with the existing TanStack Query data model.

Realtime should update or invalidate the existing source of truth rather than creating a parallel chat state system.

### Acceptance Criteria

With two authenticated browser sessions in the same channel:

1. user A sends a message;
2. user B receives it without refreshing;
3. histories remain consistent after reload.

---

## Milestone 13 — Invitations and Basic Membership Flow

### Objective

Provide the first practical friend-group onboarding flow.

### Scope

Implement:

- community invite creation;
- invite validation;
- invite acceptance;
- community joining;
- invalid/expired invite handling where applicable.

Keep the flow simple.

### Acceptance Criteria

A user can receive an invite link, authenticate if required, and join the intended community.

---

## Milestone 14 — Basic Moderation Foundation

### Objective

Provide the minimum trusted controls needed before wider testing.

### Scope

Implement only validated MVP moderation requirements, potentially including:

- owner/moderator/member distinction;
- kick;
- ban;
- relevant UI permission states;
- trusted server-side authorization.

Do not implement an enterprise-grade role engine.

### Acceptance Criteria

Privileged operations are protected at trusted backend boundaries and not only by hidden frontend buttons.

---

# Phase 3 — Real Voice and Screen Sharing

Only begin real media integration after the application data model and global media UX are stable.

---

## Milestone 15 — LiveKit Foundation

### Objective

Integrate LiveKit behind the project's media boundary.

### Scope

Implement:

- LiveKit client integration;
- trusted server-side token generation;
- room mapping;
- media adapter/service boundary;
- connection lifecycle;
- error handling.

Do not expose LiveKit secrets to the browser.

### Acceptance Criteria

A development user can securely obtain a scoped token and establish a LiveKit room connection through the intended architecture.

---

## Milestone 16 — Real Voice Rooms

### Objective

Replace mocked voice state with real LiveKit voice sessions.

### Scope

Implement:

- join voice;
- leave voice;
- participants;
- microphone;
- audio/deafen behavior where supported;
- speaking state;
- device handling;
- global route-independent voice session.

Reuse the previously validated voice UI.

Do not redesign the voice experience merely because LiveKit is now real.

### Acceptance Criteria

Two users can:

- join the same voice room;
- communicate;
- observe participant state;
- navigate throughout Xama without losing the active voice session;
- leave correctly.

---

## Milestone 17 — Real Screen Sharing

### Objective

Replace mocked stream media with LiveKit screen sharing while preserving the approved Xama UX.

### Scope

Implement:

- start screen share;
- stop screen share;
- discover active shares;
- choose whether to watch;
- focus mode;
- desktop mini-player;
- hidden mode;
- restore stream;
- route-independent playback behavior.

Reuse the validated presentation-state model.

### Acceptance Criteria

A user can:

1. join voice;
2. another user shares a screen;
3. choose to watch;
4. navigate elsewhere;
5. continue watching through mini-player;
6. hide the player;
7. remain in voice;
8. restore the stream.

---

# Phase 4 — Closed Alpha Readiness

---

## Milestone 18 — Reliability and Security Review

### Objective

Prepare the application for use by a small real test group.

### Review

Validate:

- authentication;
- authorization;
- RLS;
- invite behavior;
- error handling;
- realtime cleanup;
- media cleanup;
- reconnection behavior;
- device permissions;
- responsive layouts;
- mobile browser behavior;
- accessibility basics;
- loading/error states;
- secrets;
- user-generated text rendering.

### Performance

Review:

- unnecessary re-renders;
- message loading;
- realtime subscription scope;
- media component lifecycle;
- mobile CPU/network behavior;
- bundle size.

Optimize only demonstrated issues.

---

## Milestone 19 — Deployment Foundation

### Objective

Create the first controlled production-like deployment.

### Expected Services

Initially:

- Cloudflare for web delivery and domain infrastructure;
- Supabase;
- LiveKit Cloud;
- GitHub.

Exact provider configuration may evolve.

### Scope

Implement:

- deployment configuration;
- production environment variables;
- preview environment where useful;
- basic CI;
- production build validation.

### Acceptance Criteria

A small invited group can access a deployed Xama environment through the browser.

---

## Milestone 20 — Closed Alpha

### Objective

Validate Xama with real friend groups.

### Focus

Observe:

- onboarding friction;
- channel navigation;
- mobile usability;
- voice reliability;
- screen-sharing quality;
- mini-player usefulness;
- adaptive navigation;
- favorite usage;
- interface clarity;
- performance.

Do not respond to every suggestion by immediately adding features.

Collect evidence before expanding scope.

---

# Future Product Phases

The following areas are intentionally outside the implementation roadmap above.

They should receive dedicated planning only after product validation.

Potential future work includes:

- community dashboard/home;
- richer Activity experience;
- advanced permissions;
- notifications;
- PWA installation experience;
- native mobile application;
- native desktop application;
- richer user customization;
- layout configuration;
- command palette;
- configurable shortcuts;
- controlled extension system;
- bots;
- public communities;
- discovery;
- events;
- API platform;
- marketplace;
- payments;
- mini-app ecosystem.

Their presence in documentation does not authorize proactive implementation.

---

# Mobile Strategy Throughout the Roadmap

Mobile web is not a separate late-stage milestone.

Every UI milestone must consider mobile behavior as part of its acceptance criteria.

The implementation sequence should therefore behave conceptually as:

```text
feature
├── shared behavior
├── desktop presentation
└── mobile presentation
```

not:

```text
build desktop application
        ↓
finish everything
        ↓
attempt to convert it to mobile
```

The responsive web product will define the first validated Xama mobile experience.

Native mobile development is a future separate project decision.

---

# Testing Strategy Throughout the Roadmap

Tests should be added when they protect meaningful behavior.

High-value candidates include:

- navigation-mode resolution;
- permissions;
- preference resolution;
- global voice-state transitions;
- stream presentation-state transitions;
- data transformations.

Do not generate large low-value test suites merely to increase coverage.

Critical integration and end-to-end coverage should grow as real backend and media behavior is introduced.

---

# Definition of Done for a Milestone

Unless the milestone explicitly states otherwise, completion requires:

- requested scope implemented;
- no unrelated future scope implemented;
- TypeScript passes;
- lint passes;
- tests relevant to changed behavior pass;
- production build passes;
- responsive behavior checked where UI changed;
- no known critical regression;
- documentation updated if architecture or approved behavior changed.

---

# Roadmap Change Policy

This roadmap is a planning document, not an immutable contract.

It may evolve as:

- implementation reveals better solutions;
- user testing provides evidence;
- provider constraints appear;
- product priorities change.

Changes should remain intentional.

Do not silently expand milestone scope during implementation.