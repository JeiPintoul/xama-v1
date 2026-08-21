# Xama — UX and Interaction Guidelines

## Purpose

This document defines the current UX and interaction direction for Xama.

It complements `PRODUCT.md` and `PROTOTYPE.md`.

The prototype is a visual reference, while this document defines the intended behavior behind the interface.

When prototype visuals and these UX rules differ, prefer the behavior described here unless explicitly instructed otherwise.

---

## Core UX Principle

The primary UX principle is:

**Familiar to Discord users. Obvious to newcomers.**

Xama should preserve a familiar communication mental model:

**communities → community navigation → content**

The objective is not to reproduce Discord's interface.

Familiarity should come from recognizable concepts and efficient navigation, while differentiation should come from:

- cleaner hierarchy;
- lower default visual density;
- adaptive navigation;
- less intrusive voice controls;
- more flexible screen sharing;
- progressive disclosure;
- workspace-like panel organization;
- user-controlled customization.

---

## Responsive Web Product

The initial Xama product is a responsive web application.

Desktop is the primary design environment because it provides the richest experience for:

- multitasking;
- text chat;
- voice;
- screen sharing;
- multiple navigation regions;
- resizable workspace panels.

However, mobile browser support is part of the initial product rather than a deferred future feature.

The web application must remain fully usable on phones for core flows such as:

- authentication;
- joining communities;
- browsing channels;
- reading and sending messages;
- joining and leaving voice rooms;
- controlling microphone and audio;
- viewing participants;
- watching screen shares;
- basic community navigation;
- invitations;
- favorites.

Responsive behavior should adapt interaction patterns to the device rather than simply shrink the desktop interface.

Do not create a separate mobile application during the initial web implementation.

Desktop and mobile web should share the same product model, domain logic, services, state, and backend.

---

## Desktop Application Structure

On desktop, the application may be conceptually divided into:

1. global/community rail;
2. community navigation sidebar;
3. primary content area;
4. optional contextual panels.

A typical layout may resemble:

```text
┌─────────┬────────────────────┬──────────────────────────────────┐
│ Global  │ Community          │ Primary content                  │
│ rail    │ navigation         │                                  │
│         │                    │                                  │
│         │                    │                                  │
└─────────┴────────────────────┴──────────────────────────────────┘
```

Contextual panels such as members may temporarily add another layout column.

The exact pixel dimensions are not fixed by this document.

---

## Workspace-Like Visual Structure

Xama should move away from the appearance of one continuous Discord-like surface.

Major application regions may use a restrained workspace-style presentation inspired by modern desktop tools and IDEs.

This may include:

- subtle spacing between major regions;
- slightly rounded panel boundaries;
- distinct but low-contrast surfaces;
- clear containment between navigation and content;
- minimal separators;
- visually stable panel geometry.

This should apply primarily to large structural regions.

Do not turn every message, channel, control, or small component into a floating card.

The desired result is:

**structured panels, not card-heavy UI.**

Avoid:

- excessive gaps;
- excessive shadows;
- glassmorphism;
- strong glow;
- highly decorative borders;
- RGB/gamer visual noise.

On narrow mobile layouts, structural gaps and panel rounding may be reduced when they waste useful screen space.

---

## Global Community Rail

The outer community rail should remain compact and predictable on desktop.

It represents global navigation rather than community-specific content.

It may contain:

- Xama/home access;
- community icons;
- add/join community action;
- future global destinations when explicitly introduced.

The rail should not be user-resizable in the initial implementation.

Community icons should remain visually compact and easy to scan.

### Mobile

The desktop community rail should not remain permanently visible on narrow mobile screens.

Community switching should instead be available through a compact mobile navigation surface such as:

- a temporary drawer;
- a navigation sheet;
- a dedicated community selector.

The exact visual solution may evolve through implementation and testing.

The important requirement is that community switching remains quick without permanently consuming scarce horizontal space.

---

## Community Navigation Sidebar

The desktop community sidebar contains navigation related to the currently selected community.

It should be horizontally resizable by the user on desktop.

### Resizing behavior

The user should be able to drag the boundary between the community sidebar and the primary content area.

The sidebar must have:

- a sensible minimum width;
- a sensible maximum width;
- smooth resizing;
- no layout breakage;
- enough remaining room for primary content.

The preferred width should eventually be persisted per user.

Do not couple content behavior to one hardcoded sidebar width.

### Mobile

The community sidebar should become a temporary navigation surface on narrow screens.

The current chat or content should normally occupy the available viewport.

Opening community navigation may use:

- a drawer;
- a sheet;
- another temporary full-height navigation layer.

Do not implement desktop-style sidebar resizing on touch-oriented mobile layouts.

---

## Adaptive Navigation

Community navigation supports three conceptual modes:

- Automatic
- Simplified
- Modular

### Simplified Mode

Optimized for smaller communities and friend groups.

Text and voice channels remain visible together in clearly separated sections.

Example:

```text
TEXT
# geral
# memes
# setup

VOICE
Lobby
Ranked
AFK
```

The objective is to minimize unnecessary clicks.

---

## Modular Mode

Optimized for larger or more complex communities.

Navigation is separated into focused surfaces, for example:

```text
[ Channels ] [ Voice ] [ Activity ]
```

The initial labels in the Portuguese interface may be:

```text
[ Canais ] [ Voz ] [ Atividade ]
```

### Channels

Primarily exposes text channels, categories, and related navigation.

### Voice

Primarily exposes voice rooms, active participants, and voice-related context.

### Activity

Reserved for future community activity features.

Activity does not need to be fully implemented in the MVP.

Do not introduce unnecessary dashboard or social-feed functionality merely to fill this section.

### Mobile

Modular navigation may be especially useful on mobile because it prevents very large mixed lists from becoming difficult to browse.

The same resolved navigation mode should remain conceptually consistent across devices, although presentation may adapt to available space.

---

## Automatic Mode

Automatic navigation resolves whether Simplified or Modular is more appropriate for the community.

The initial implementation may use a simple heuristic based on community complexity.

The heuristic is experimental.

Do not encode a prototype threshold as permanent domain logic.

The architecture should allow the resolution strategy to evolve independently.

Eventually, navigation resolution may consider:

- number of channels;
- number of categories;
- number of voice rooms;
- community activity;
- other proven complexity signals.

Avoid rapid switching caused by trivial changes such as adding or removing a single channel.

---

## Navigation Preferences

The intended precedence is conceptually:

```text
user override
    ↓
community preference
    ↓
automatic resolution
```

The exact persistence model will be defined during backend implementation.

Do not implement speculative preference infrastructure before it is needed.

---

## Favorites

Users should be able to favorite both text and voice channels.

Favorites are user-specific.

A favorite should not modify the channel for other community members.

Favorited channels should be easy to access, especially in larger communities.

A compact favorites section may appear above regular channel navigation when favorites exist.

Example:

```text
★ FAVORITES

# geral
# desenvolvimento
🔊 Lobby
```

Do not show an empty favorites section when the user has no favorites.

Favoriting should be available through a lightweight interaction such as:

- contextual menu;
- hover action on desktop;
- long-press or equivalent accessible mobile action;
- command action.

The architecture should allow favorite channels to later appear in future dashboard or home surfaces.

---

## Primary Content Area

The primary content area represents the current user task.

Examples:

- text channel;
- focused screen share;
- future community home;
- settings.

It should receive the majority of available space.

The application should avoid permanently occupying primary content space with secondary controls.

On mobile, the primary content area should normally occupy almost the entire available width.

---

## Text Chat

Text chat should prioritize readability and available content space.

Avoid excessive persistent controls.

Secondary message actions should appear contextually.

On desktop this may occur through:

- hover actions;
- overflow menus.

On mobile this may occur through:

- long press;
- contextual menus;
- other touch-friendly interaction patterns.

Important actions should remain understandable to inexperienced users.

Do not rely exclusively on ambiguous icon-only controls for important actions.

The message composer should remain clearly identifiable and easy to reach.

Mobile layouts must account for:

- virtual keyboard behavior;
- safe areas;
- limited viewport height;
- touch-sized interaction targets.

---

## Member Panel

The member list should remain hidden by default.

Opening the member list should behave differently depending on available space.

### Desktop

On sufficiently large desktop layouts, the member panel should become a real layout column.

Example:

```text
Community rail
    |
Community navigation
    |
Primary content
    |
Members
```

It should reduce the width of the primary content area rather than cover existing chat content.

This prevents messages and controls from being hidden underneath an overlay.

### Mobile and smaller layouts

When there is insufficient horizontal space, the member list should become a temporary surface such as:

- a drawer;
- a sheet;
- an overlay.

It should not attempt to compress the chat into multiple narrow columns.

---

## Global Voice Session

Voice-session state is application-global.

It must not depend on the currently displayed channel or community route.

Example:

```text
Connected:
Xama Lab / Lobby

User navigates to:
Game On / #geral

Voice connection remains active.
```

Routing must not accidentally mount or unmount the active voice session.

---

## Compact Voice Component

The default connected voice UI should be compact.

It should not float over the center of chat content and should not permanently consume a large bottom toolbar.

### Desktop placement

Preferred placement:

**bottom of the community navigation/sidebar region, directly above the current-user controls.**

This location keeps voice status visible while avoiding interference with primary content.

Conceptual example:

```text
┌──────────────────────────┐
│ ● Lobby · 5 people       │
│ 🎙  🎧  Share  Leave     │
└──────────────────────────┘

┌──────────────────────────┐
│ João                     │
│ User controls            │
└──────────────────────────┘
```

The final component may be more compact than this representation.

Important voice controls may include:

- microphone;
- audio/deafen;
- screen sharing;
- leave.

The compact component must remain visible even when navigating to another community.

It should clearly communicate the community and voice room when necessary.

### Mobile placement

Mobile voice state should remain persistent without blocking chat content.

A compact voice bar or chip may be positioned close to the lower navigation/composer region while respecting:

- safe areas;
- the message composer;
- the virtual keyboard;
- other persistent mobile navigation.

It should remain significantly smaller than a full call screen.

Tapping it may open expanded voice controls.

---

## Expanded Voice Controls

Selecting the compact voice component may open an expanded temporary surface.

The expanded state may show:

- current voice room;
- community;
- participants;
- speaking state;
- microphone controls;
- audio controls;
- screen-sharing controls;
- leave action.

### Desktop

Prefer a popover or compact temporary panel.

Opening it should not permanently resize or restructure the entire application.

### Mobile

Prefer a touch-friendly temporary surface such as a bottom sheet or dedicated voice panel.

The user should be able to dismiss it and return immediately to the previous content while remaining connected.

---

## Voice Channel Navigation While Connected

Being connected to one voice room must not prevent the user from browsing:

- other text channels;
- other voice rooms;
- other communities.

Viewing another voice room is not the same as joining it.

The UI must preserve the distinction between:

- currently connected voice room;
- currently viewed content;
- another voice room being inspected.

This behavior applies on both desktop and mobile.

---

## Screen Sharing Model

Voice connection and screen consumption are separate states.

A user may remain connected to voice without watching a stream.

When someone starts sharing, the application should not force permanent stream playback into the interface.

The user should be able to explicitly choose whether to watch.

---

## Screen Share States

The intended presentation states are:

- Focus
- Mini-player
- Hidden

### Focus

The stream becomes the primary content surface.

Navigation remains accessible.

### Mini-player

The stream remains visible while the user navigates elsewhere.

The mini-player must not block normal navigation.

### Hidden

The visible stream disappears completely while the voice connection continues.

The voice interface should still provide a subtle indication that a stream is available and allow it to be reopened.

---

## Transition From Focus to Mini-player

If a user is watching a focused stream and navigates to another channel or community, the stream may automatically transition to mini-player mode.

Navigation must never be blocked merely because a stream is being watched.

---

## Desktop Mini-player Interaction

The desktop screen-share mini-player should provide substantial user control while remaining visually clean.

### Hover controls

Controls should remain hidden when the mini-player is idle.

Hovering the player may reveal:

- return to focused view;
- hide/close stream;
- other essential stream controls when justified.

Clicking the stream itself may also return it to focused mode when this does not conflict with another interaction.

---

## Desktop Mini-player Position

The mini-player should be draggable on desktop.

The user should be able to move it to a preferred position inside the safe application content area.

Do not permanently constrain it to only one predefined corner.

A hybrid behavior is preferred:

- free dragging;
- optional or subtle snapping near useful edges/corners;
- prevent positioning outside usable application bounds.

The user's preferred position may eventually be persisted.

Avoid implementing persistence before the appropriate preference infrastructure exists.

---

## Desktop Mini-player Resizing

The mini-player should be resizable from its corners.

Resize should:

- preserve the stream aspect ratio;
- support diagonal resizing;
- define sensible minimum dimensions;
- define sensible maximum dimensions;
- remain inside usable application bounds;
- prevent accidental domination of the entire interface.

The stream should remain usable at all supported sizes.

---

## Mobile Mini-player

Touch interaction should not mechanically reproduce desktop drag-and-resize behavior.

On mobile, the mini-player should remain compact and easy to manipulate.

It may support:

- dragging;
- repositioning;
- edge or corner snapping;
- focused-view restoration;
- hiding.

Arbitrary diagonal resize is not required on mobile if it creates poor touch usability.

A small number of responsive size presets may be preferable.

The final mobile behavior should favor:

- predictable touch interactions;
- one-handed usability;
- minimal obstruction of chat content.

---

## Mini-player Cleanliness

The default mini-player appearance should prioritize the stream itself.

Avoid permanent visual chrome.

Controls should mostly appear during hover, focus, tap, or active interaction.

The player may use only the minimum visual structure required to:

- distinguish it from underlying content;
- support movement;
- support resizing where appropriate;
- expose essential controls.

---

## Reopening Hidden Streams

When a watched stream is hidden, users must have an obvious but unobtrusive way to restore it.

The compact global voice component may indicate:

```text
Maya is sharing
```

or equivalent state.

An action such as:

```text
Watch
```

may restore the stream.

The exact wording may evolve.

---

## Future Stream Pop-Out

Opening a stream in a separate window may be considered in a later stage.

This could be valuable for multi-monitor desktop users.

It is not required for the initial implementation unless explicitly requested later.

Do not proactively implement it now.

---

## Progressive Disclosure

Progressive disclosure is a core interaction rule.

The interface should show:

- common actions immediately;
- secondary actions contextually;
- advanced controls only when requested.

Examples:

- member list hidden until opened;
- message actions shown contextually;
- advanced voice controls inside expanded voice UI;
- mini-player controls shown on interaction;
- advanced creation options behind additional options.

This principle should reduce default visual density without reducing capability.

---

## Important Actions

Important or potentially ambiguous actions should prefer:

**icon + text**

when space allows.

Examples:

- Compartilhar tela
- Sair
- Convidar pessoas

Pure icon-only actions are acceptable when:

- the symbol is widely understood;
- space is constrained;
- accessible tooltip or label behavior exists.

Mobile layouts may rely more heavily on recognizable icons when necessary, but accessibility labels remain required.

---

## Resizable Layout Philosophy

User-adjustable layout dimensions are desirable where they improve real usability.

Initial desktop candidate:

- community navigation sidebar width.

Future desktop candidates may include:

- member panel width;
- other major workspace panels.

Do not make every component resizable.

Resizable regions should have:

- explicit minimums;
- explicit maximums;
- accessible handles;
- stable layout behavior;
- eventual preference persistence.

Mobile layouts should generally use responsive layout rules instead of manually resizable structural panels.

---

## Responsive Layout Philosophy

Responsive behavior is part of the MVP.

Do not treat mobile as an afterthought or as a scaled-down desktop screenshot.

Major desktop concepts should adapt according to available space.

Conceptual examples:

```text
DESKTOP

Community rail | Community navigation | Chat | Optional members
```

```text
MOBILE

Chat/content fills viewport

Community and channel navigation open temporarily when requested.
```

Another example:

```text
DESKTOP
Members → layout column
```

```text
MOBILE
Members → temporary drawer/sheet
```

Another example:

```text
DESKTOP
Voice controls → sidebar-integrated compact component
```

```text
MOBILE
Voice controls → compact persistent mobile voice surface
```

The responsive implementation should share behavior and state rather than maintaining unrelated desktop and mobile products.

---

## Mobile Navigation Principles

Mobile navigation should optimize for quick transitions between:

- communities;
- channels;
- current chat;
- active voice session.

Avoid requiring multiple unnecessary screens for common actions.

The current content should normally remain the visual priority.

Temporary navigation surfaces should close naturally after a destination is selected.

Back-navigation behavior should remain predictable.

Adaptive navigation concepts such as Simplified and Modular should remain available, but their presentation may differ from desktop.

---

## Touch Interaction

Mobile interactions must be designed for touch rather than hover.

Where desktop uses hover, mobile should expose equivalent functionality through an appropriate alternative such as:

- tap;
- long press;
- contextual action menu;
- explicit overflow action.

No essential feature may depend exclusively on hover.

Touch targets should remain reasonably sized and separated.

---

## Mobile Screen Sharing

Watching a screen share on mobile should prioritize the shared content.

Focused mode may use most of the available viewport.

The user must still be able to:

- return to navigation;
- minimize the stream;
- hide the stream;
- remain connected to voice.

Mini-player behavior should avoid covering critical mobile controls such as:

- message composer;
- navigation actions;
- voice controls.

---

## Mobile Web First, Native Later

The initial mobile experience should be delivered through the responsive Xama web application.

Do not create a separate native mobile application during the initial milestones.

A native mobile application may be considered later if real product usage demonstrates meaningful advantages or browser limitations around areas such as:

- operating-system integration;
- background behavior;
- notifications;
- media behavior;
- performance;
- distribution;
- device-specific capabilities.

The shared backend and domain model should make a future native client possible without changing core product semantics.

---

## Progressive Web App Readiness

The responsive web application may later become installable as a Progressive Web App.

PWA capabilities are useful but should not distract from establishing the core communication experience.

The architecture should avoid unnecessary decisions that would prevent later support for:

- installable web app metadata;
- app icons;
- standalone display mode;
- service-worker capabilities where justified.

Do not build complex offline behavior for real-time communication features without a proven need.

---

## Customization Readiness

The initial application should be structured so future customization can evolve beyond simple color themes.

Potential future customization includes:

### Visual theme

- colors;
- typography;
- radius;
- borders;
- surfaces;
- spacing;
- shadows.

### Layout preferences

Potentially:

- panel widths;
- compact/comfortable density;
- call-component placement;
- selected navigation presentation.

### Visibility preferences

Potentially:

- show/hide optional interface elements;
- show/hide secondary navigation features;
- show/hide additional status information.

### Commands and shortcuts

Potentially:

- configurable keyboard shortcuts;
- command palette integration;
- actions triggered from different UI surfaces.

These capabilities are future-facing.

Do not implement a full customization engine now.

---

## Stable Command Concepts

Important product actions should avoid being unnecessarily tied to one specific button implementation.

Examples of conceptual command identifiers that may eventually exist:

```text
voice.toggle-microphone
voice.toggle-audio
voice.share-screen
voice.leave

channel.open
channel.favorite

navigation.search
navigation.open-members
```

A full plugin or command framework is not required during the initial foundation.

The implementation should merely avoid architectural choices that make future command routing unnecessarily difficult.

---

## Extension and Plugin Safety

Future extensions, shortcuts, or community-created functionality must not be assumed to have unrestricted execution access.

If Xama eventually supports user-created functionality, it will require deliberate architecture around:

- permissions;
- sandboxing;
- manifests;
- controlled APIs;
- review or trust mechanisms;
- versioning.

This is not MVP scope.

Do not implement arbitrary custom-code execution.

---

## Design Tokens

Production UI must use design tokens or equivalent semantic variables for visual primitives.

Prefer semantic values such as:

```text
background
surface
surface-raised
text-primary
text-secondary
accent
border
success
warning
danger
radius
spacing
```

Avoid scattering raw colors and arbitrary repeated visual constants throughout components.

The token system should support future themes without coupling domain logic to visual styling.

---

## Accessibility

Accessibility is part of production quality.

Interactive elements should support:

- keyboard interaction where applicable;
- visible focus;
- meaningful labels;
- tooltips where appropriate;
- screen-reader semantics when feasible;
- sufficient contrast;
- reasonable hit targets.

Drag and resize interactions should not make core functionality inaccessible to users who cannot use them.

Alternative interaction paths should exist for important actions.

Touch interactions should provide equivalent access to capabilities that use hover on desktop.

---

## Performance

Minimal visual design does not automatically mean performant implementation.

Avoid unnecessary:

- large blur effects;
- expensive visual filters;
- excessive re-renders;
- oversized DOM trees;
- unbounded message rendering;
- heavy animation.

Interactions should feel immediate.

Animations should be restrained, short, and functional.

Long chat histories should eventually support incremental loading and/or virtualization when necessary.

Mobile performance and battery usage should be considered when implementing persistent real-time and media behavior.

---

## UX Anti-Patterns

Avoid:

- reproducing Discord pixel-for-pixel;
- forcing the user to watch a screen share;
- tying an active call to the current route;
- permanent large call toolbars;
- floating controls covering important chat content;
- opening desktop member panels over readable content when space is available;
- excessive icon-only actions;
- unnecessary navigation clicks in small communities;
- huge mixed channel lists in large communities;
- making every region a card;
- treating mobile as a scaled-down desktop layout;
- relying on hover for essential mobile functionality;
- implementing future complexity before proven need.

---

## Prototype Relationship

The reference prototype remains available at:

`https://xama-desktop.joaopauloescola212.chatgpt.site/`

Static screenshots are stored under:

`reference/prototype/`

Use those materials to understand the intended hierarchy and interactions.

They are not immutable pixel specifications.

The current prototype is primarily a desktop design reference.

Mobile behavior should follow the product and UX principles in this document even where the prototype does not yet contain equivalent mobile screens.

When implementing the production interface, improve structural consistency, maintainability, accessibility, responsiveness, and performance where appropriate while preserving the approved product behavior.

---

## Current UX Status

These guidelines represent the approved UX direction for the initial production implementation.

They may evolve based on:

- implementation discoveries;
- internal testing;
- user testing;
- performance constraints;
- mobile browser behavior;
- real community behavior.

Changes to major interaction rules should be reflected in this document.