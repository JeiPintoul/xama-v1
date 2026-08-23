# Xama — Current Project State

Last updated: 2026-08-23

## Purpose

This file is the short operational source of truth for the current state of Xama.

Use it to resume work in a new ChatGPT or Codex session without relying on conversation history. Long-term product and architecture rules still live in `PRODUCT.md`, `UX.md`, `ARCHITECTURE.md`, and `AGENTS.md`.

When the tactical sequence in this file conflicts with the older milestone ordering in `ROADMAP.md`, follow this file and `SCREEN_SHARE_ALPHA.md` until the Screen Share Alpha is completed or this document is updated again.

---

## Current Stage

Milestone 2 has been validated and merged into `main`.

Active implementation branch:

```text
alpha/screen-share
```

The LiveKit Cloud project and Supabase project required for the Screen Share Alpha have already been created. The project owner has the required provider credentials/secrets locally and must never place API secrets in chat, frontend code, or source control.

Implemented foundation:

- pnpm workspace;
- React + TypeScript + Vite;
- Tailwind and semantic design tokens;
- responsive desktop/mobile web shell;
- community rail;
- resizable community navigation sidebar;
- route-driven mock communities and channels;
- Simplified, Modular, and Automatic navigation;
- user-specific mocked channel favorites;
- custom application menus/context menus;
- desktop and mobile navigation behavior;
- compact default navigation density;
- GitHub Actions CI for lint, typecheck, tests, and build.

No production database, authentication, realtime chat, or media integration exists yet.

---

## Immediate Product Priority

The immediate priority is a **publicly deployable Screen Share Alpha**.

The target is deliberately narrower than the original roadmap:

```text
open Xama
→ identify as a temporary guest
→ select an existing mock community/voice channel
→ join the real LiveKit room
→ share a screen
→ watch other participants' screen shares
```

The alpha exists to validate the core reason Xama currently matters: simple screen sharing for friend groups.

Chat, persistent communities, database-backed favorites, full authentication, and advanced moderation are temporarily deferred.

---

## Screen Share Alpha Architecture

Use:

- current React/Vite web application;
- current mock communities/channels as navigation data;
- LiveKit Cloud for realtime media;
- a minimal Supabase Edge Function for secure LiveKit token generation;
- Cloudflare Pages for the public web deployment;
- temporary guest identity stored locally in the browser;
- a shared alpha access code validated only by the server-side token function.

The LiveKit API secret must never be exposed to the browser.

Detailed scope and acceptance criteria live in `docs/SCREEN_SHARE_ALPHA.md`.

---

## Tactical Sequence

### SS0 — Infrastructure foundation

- implement the Supabase LiveKit-token Edge Function;
- configure server-side secrets;
- add required frontend LiveKit dependencies;
- define safe frontend environment-variable contract;
- define the provider boundary for token requests and room connections.

### SS1 — Real room connection

- temporary guest identity;
- alpha access code input;
- join/leave a LiveKit room from an existing voice-channel route;
- connection state;
- real participants.

### SS2 — Real screen sharing

- start/stop local screen share;
- render remote screen-share tracks;
- handle browser cancellation/permission failures;
- screen-share audio where the browser supports it.

### SS3 — Multiple simultaneous shares

- support multiple published screen-share tracks in the same room;
- responsive stream grid;
- click/tap a stream to focus it;
- return from focus to grid.

### SS4 — Public preview deployment

- Cloudflare Pages deployment;
- HTTPS;
- production environment configuration;
- deployed Supabase token function;
- real multi-device test.

### SS5 — Minimum alpha hardening

- disconnected/reconnecting states;
- participant/share cleanup;
- permission-denied feedback;
- unsupported-browser guidance;
- desktop/mobile viewing sanity checks;
- focused security review of the temporary token endpoint.

---

## Alpha Non-Goals

Do not block the first usable alpha on:

- text chat;
- Supabase Auth;
- persistent profiles;
- database-backed communities/channels;
- persistent favorites;
- full invite system;
- role engine;
- advanced moderation;
- notifications;
- cameras;
- plugin/customization engine;
- dashboard/Activity;
- native applications.

Microphone voice is a stretch goal only if it does not delay usable screen sharing.

---

## Current UX Decisions

- Favorites remain visible in their normal channel lists and also appear in the Favorites shortcut area.
- The small blue star is the approved current favorite indicator.
- In Modular mode, the Favorites module is hidden when there are no favorites.
- Favorite state and notification state are separate concepts. Favoriting must never implicitly alter notification behavior.
- Future notification controls should allow community defaults, per-channel overrides, and exceptions.
- Community-level actions belong in the menu opened from the community header; navigation mode selection currently lives there.
- The default interface density should be relatively compact, while future customization may expose density/layout preferences.
- Product-facing dropdowns and context menus should use Xama-owned UI rather than generic browser-native presentation when practical.

---

## Alpha Browser Target

Primary publishing target:

**desktop Chromium browsers (Chrome/Edge).**

Screen-share audio capabilities depend on browser/OS capture support. Mobile web remains important to Xama, but mobile screen-share publishing must not block the initial desktop alpha. Mobile viewing/joining should remain usable where technically supported.

---

## Alpha Room Policy

Only existing mocked voice channels are valid alpha rooms.

Current voice channels are:

```text
xama-lab:lobby
xama-lab:cafe
game-on:lobby
game-on:ranked
game-on:afk
clube-do-livro:sala-de-leitura
```

The token endpoint must not grant access to arbitrary caller-supplied room names outside this alpha allowlist.

This duplication is acceptable for the temporary alpha security boundary and should disappear when communities/channels become server-backed.

---

## Engineering Workflow

Use Codex selectively for high-complexity implementation and debugging.

Prefer ChatGPT + GitHub for:

- planning;
- documentation;
- review;
- small focused patches;
- minor UI changes;
- CI/configuration.

For the next Codex task, use a fresh session and read only:

- `AGENTS.md`;
- `docs/CURRENT_STATE.md`;
- `docs/SCREEN_SHARE_ALPHA.md`;
- relevant LiveKit/Supabase sections of `docs/ARCHITECTURE.md`.

Do not make Codex re-read all historical documentation unless necessary.

---

## Next Action

Implement SS0 + SS1 on `alpha/screen-share`, then validate two separate browser sessions/devices joining the same real LiveKit room before proceeding to screen publishing.
