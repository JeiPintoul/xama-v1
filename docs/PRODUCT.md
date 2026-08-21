# Xama — Product Definition

## Product Summary

Xama is a communication platform initially focused on small Brazilian friend groups and communities that need a fast, lightweight, and intuitive alternative for voice communication and screen sharing.

The initial product goal is not to replace Discord completely.

The immediate objective is to solve the core use case that matters most in the first stage:

**join a community, enter voice, share screen, and keep navigating chats and communities without friction.**

---

## Current Product Positioning

At its initial stage, Xama should be treated as:

**a lightweight communication product centered on communities, voice presence, and screen sharing.**

It is not yet a general social platform, super app, marketplace, or plugin ecosystem.

The first implementation should focus on a narrow and useful product slice that can become real, testable, and publishable quickly.

---

## Initial Audience

The initial audience is primarily:

- Brazilian users;
- friend groups;
- gaming groups;
- small private communities;
- users already familiar with Discord;
- users who find Discord powerful but sometimes visually dense or confusing.

The product should remain attractive to experienced Discord users while being easier for less experienced users to understand and use.

---

## Core Product Principle

The main product principle is:

**Familiar to Discord users. Obvious to newcomers.**

Xama should preserve the familiar community-based communication model while reducing friction, visual density, and intrusive interface behavior.

---

## Initial Core Flow

The initial product flow is:

**Create or join a community → open a channel → enter a voice room → share or watch a screen → continue navigating freely.**

The most important user experience in the first stage is:

- low-friction entry;
- easy navigation;
- clear voice presence;
- simple screen-sharing behavior;
- freedom to keep browsing while remaining connected.

---

## MVP Scope

The MVP should include only the features required to validate the initial communication experience.

### MVP Features

- authentication;
- user profile basics;
- communities;
- community membership;
- text channels;
- voice channels;
- messages;
- voice-session UI;
- screen-sharing UI;
- adaptive community navigation;
- channel favorites;
- member list;
- community invites;
- basic moderation surfaces;
- responsive desktop-first web application.

### MVP UX Priorities

- compact persistent global voice session;
- screen sharing as a separate state from voice connection;
- focus / mini-player / hidden stream states;
- simplified and modular navigation modes;
- automatic navigation mode selection;
- hidden-by-default members panel;
- clear, compact, low-noise interface;
- strong support for future customization via design tokens.

---

## Explicit Non-Goals for the Current Stage

The following items are not part of the initial implementation and must not be proactively built now:

- public discovery system;
- large public community platform features;
- bots platform;
- plugin system;
- full theme marketplace;
- payments;
- marketplace;
- creator monetization;
- advanced event systems;
- full activity feed platform;
- complete dashboard experience;
- mobile app;
- desktop app;
- native desktop client;
- mini-app ecosystem;
- public API platform;
- advanced social feed features.

The architecture may keep future expansion in mind, but the codebase must not implement speculative product scope without explicit request.

---

## Product Differentiation

Xama should differentiate itself through:

- cleaner information hierarchy;
- lower default visual density;
- adaptive navigation depending on community complexity;
- less intrusive voice-session presence;
- better screen-sharing flexibility;
- more freedom while staying connected to voice;
- a more workspace-like and modern interface direction;
- future-ready support for customization.

Xama should not attempt to differentiate itself by discarding the community/channel mental model that users already understand.

---

## Navigation Philosophy

Xama should preserve the general structure:

**communities → community navigation → content**

However, community navigation should adapt to complexity.

The expected navigation modes are:

- Automatic
- Simplified
- Modular

### Simplified

Optimized for smaller friend groups.

Text and voice channels appear together in one clear navigation surface with separated sections.

### Modular

Optimized for larger communities.

Navigation may be segmented into surfaces such as:

- Channels
- Voice
- Activity

Activity is not required as a fully developed MVP feature.

### Automatic

Automatically chooses between Simplified and Modular depending on community complexity.

Thresholds are experimental and may evolve.

Users or communities should be able to override the automatic behavior in the future.

---

## Voice Philosophy

Voice presence must be global application state, not route-local UI state.

A user connected to voice must be able to keep browsing channels and communities without losing context or having the interface dominated by a large voice toolbar.

The default voice-session representation should remain compact and persistent.

Expanded controls should appear only when needed.

---

## Screen Sharing Philosophy

Screen sharing and voice connection are related but distinct states.

A user should be able to:

- remain in a voice room without watching any stream;
- watch a stream in focused mode;
- minimize a stream into a mini-player;
- hide the stream completely while remaining connected;
- reopen the stream easily.

This behavior is a core part of the intended Xama experience.

---

## Favorites

Users should be able to mark text or voice channels as favorites.

Favorites are a personal preference, not a community-wide property.

The MVP should support favorites in navigation.

The architecture should allow favorites to later be reused by future surfaces such as dashboards.

---

## Future-Readiness Requirements

The codebase should be prepared for future expansion without implementing those future features now.

The main future-readiness goals are:

- multi-platform expansion;
- design-token-based customization;
- user layout preferences;
- richer personalization;
- future command/shortcut extensibility;
- eventual desktop and mobile clients.

Future readiness must not justify premature complexity or speculative implementation.

---

## Technical Implementation Mindset

The first implementation should optimize for:

- maintainability;
- clarity;
- scalability;
- modularity;
- low friction for iteration;
- clear domain boundaries;
- future platform reuse where reasonable.

The project should not optimize for theoretical future use cases at the expense of shipping the first real usable version.

---

## Current Product Status

Xama is currently in the early implementation planning stage.

The prototype and documentation define the approved direction for the first real implementation.

The next engineering objective is to establish the project foundation and begin implementing the web application in milestones.