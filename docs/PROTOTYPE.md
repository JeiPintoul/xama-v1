# Xama — UX Prototype Reference

## Purpose

The current Xama prototype is the primary visual and interaction reference for the initial web application.

It defines the intended:

- information architecture;
- navigation model;
- interaction patterns;
- major UI states;
- voice-session behavior;
- screen-sharing behavior;
- overall visual direction.

The prototype is not production code and must not be copied mechanically.

Production implementation should preserve the intended UX while following the project's architecture, maintainability, accessibility, responsiveness, performance, and scalability requirements.

---

## Interactive Prototype

Current prototype:

https://xama-desktop.joaopauloescola212.chatgpt.site/

Use the interactive prototype when browser access is available.

The repository screenshots provide stable references for important states and should be used when the interactive prototype is unavailable or when a fixed visual reference is preferable.

---

## Reference Screenshots

All prototype screenshots are stored under:

`reference/prototype/`

### `01-simplified-navigation.png`

Simplified community navigation intended primarily for smaller communities and friend groups.

Text and voice channels remain directly accessible in the same navigation surface to minimize unnecessary interactions.

### `02-modular-navigation-channels.png`

Modular navigation with the Channels section selected.

This mode is intended for communities whose complexity makes a single mixed channel list harder to navigate.

### `03-modular-navigation-voice.png`

Modular navigation with the Voice section selected.

Voice spaces are separated from text channels and may expose additional context such as active participants or ongoing sessions.

### `04-call-connected.png`

Compact persistent voice-session state.

A connected voice session must remain available globally while the user navigates between channels and communities.

The voice UI should not permanently consume a large horizontal section of the application.

### `05-call-expanded.png`

Expanded voice-session controls.

The compact call component may expand temporarily to expose participants and additional controls without restructuring or resizing the main application layout.

### `06-screen-share-focus.png`

Focused screen-sharing experience.

When the user explicitly chooses to watch a stream, the stream may become the primary content surface while the surrounding application navigation remains available.

### `07-screen-share-mini-player.png`

Screen share minimized into a compact player while the user navigates elsewhere.

Watching a stream and remaining connected to the voice session are separate states.

The user must be able to minimize or completely hide the stream without leaving the voice session.

### `08-members-drawer.png`

Community member list displayed on demand.

The member list should not permanently consume horizontal space in the default layout.

---

## Core UX Direction

Xama should preserve a familiar mental model for users coming from Discord:

**communities → community navigation → content**

Familiarity should come from the overall mental model rather than from reproducing Discord's interface or visual details.

The product should differentiate itself through:

- cleaner information hierarchy;
- lower visual density;
- adaptive navigation;
- progressive disclosure;
- less intrusive voice controls;
- flexible screen-sharing behavior;
- clearer actions for inexperienced users;
- efficient navigation for experienced users.

The intended principle is:

**Familiar to Discord users. Obvious to newcomers.**

---

## Adaptive Community Navigation

The prototype explores three navigation modes:

- Automatic
- Simplified
- Modular

### Simplified

Designed primarily for smaller communities.

Text and voice channels are presented together in clearly separated sections.

The priority is minimizing navigation overhead.

### Modular

Designed primarily for larger or more complex communities.

Navigation may be divided into surfaces such as:

- Channels
- Voice
- Activity

The objective is to prevent large mixed channel lists from becoming difficult to scan.

Activity is not a required MVP feature.

### Automatic

The application may choose between Simplified and Modular presentation based on community complexity.

The prototype's thresholds are experimental and must not be treated as permanent product rules.

Users or communities should eventually be able to override the automatic behavior.

---

## Favorites

Users should be able to favorite channels.

Favorites are a user-specific preference rather than a community-wide property.

Favorited text or voice channels should remain easy to reach, particularly in large communities.

The architecture should allow favorites to later appear in additional surfaces such as a future community or personal dashboard.

---

## Voice Sessions

Voice-session state is global application state and must not be coupled to the currently displayed channel or community route.

A user connected to a voice room must be able to:

- navigate to text channels;
- navigate to other voice channels;
- navigate to other communities;
- continue the active voice session;
- access essential voice controls from a compact persistent component.

The default voice UI should remain compact.

More detailed controls should appear through progressive disclosure.

---

## Screen Sharing

Joining a voice session and watching a screen share are separate states.

Screen sharing should support at least the following presentation states:

- Focus
- Mini-player
- Hidden

Closing or hiding a stream must not disconnect the user from the voice session.

If a stream is hidden, the application should still provide a subtle indication that someone is sharing and allow the stream to be reopened easily.

Navigating away from a focused stream may automatically minimize it rather than interrupting navigation.

---

## Members

The community member panel is hidden by default.

It should be accessible on demand through a drawer or equivalent temporary surface.

This preserves content space and reduces default visual density.

---

## Visual Direction

The current prototype establishes direction rather than immutable pixel specifications.

Maintain:

- dark-first interface;
- restrained visual hierarchy;
- generous content space;
- clear typography;
- minimal permanent controls;
- contextual actions;
- progressive disclosure;
- strong visibility for important actions such as screen sharing.

Avoid:

- excessive glow;
- excessive glass effects;
- unnecessary borders;
- RGB-style gamer aesthetics;
- visual clutter;
- blindly reproducing Discord dimensions or component styling.

Visual styling must remain compatible with a future token-based customization system.

---

## Production Implementation Guidance

When implementing production components:

1. Use this prototype to understand behavior and hierarchy, not as code to copy.
2. Do not depend on prototype-specific mock structures.
3. Do not hardcode layout assumptions that prevent future customization.
4. Keep domain behavior separate from presentation.
5. Keep global voice and stream state independent from page routing.
6. Use design tokens instead of scattered hardcoded visual values.
7. Prefer reusable composition over monolithic page components.
8. Do not implement future dashboard, plugin, marketplace, or social-platform features merely because the architecture may eventually support them.
9. Preserve accessibility and keyboard navigation.
10. Optimize for maintainability and performance rather than pixel-perfect reproduction of the prototype.

---

## Status

This prototype represents the current approved UX direction for the initial Xama implementation.

It may evolve as the application is implemented and tested with real users.