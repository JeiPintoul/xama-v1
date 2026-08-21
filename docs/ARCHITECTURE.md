# Xama — Architecture Guidelines

## Purpose

This document defines the architectural direction for the initial Xama implementation.

The objective is to build a maintainable and scalable product foundation without prematurely implementing infrastructure or abstractions for hypothetical future requirements.

The architecture should support the current responsive web application while keeping reasonable migration paths open for:

- native desktop clients;
- native mobile clients;
- backend evolution;
- infrastructure migration;
- richer user customization;
- future extension mechanisms.

Future readiness must not become speculative complexity.

The primary rule is:

**build clear boundaries now; introduce complex infrastructure only when real requirements justify it.**

---

## Engineering Principles

Xama should follow these engineering principles:

1. Prefer simple, explicit architecture over clever abstractions.
2. Keep domain concepts independent from UI frameworks and external providers.
3. Keep external services behind clear integration boundaries.
4. Keep server state separate from client UI state.
5. Keep global media state independent from routing.
6. Use semantic design tokens rather than scattered visual constants.
7. Prefer feature-oriented organization over technical-layer sprawl.
8. Avoid premature generalization.
9. Make important architectural decisions reversible where practical.
10. Optimize for maintainability, correctness, performance, and iteration speed.

---

## Initial Technology Stack

### Language

TypeScript.

TypeScript should use strict compiler settings.

Avoid `any` unless integration constraints make it genuinely necessary.

Prefer explicit domain types and validated external data.

---

## Package Manager and Workspace

Use a `pnpm` workspace.

The initial repository should remain a small workspace rather than a complex monorepo platform.

Do not introduce Turborepo, Nx, or similar orchestration unless build complexity later justifies it.

Initial conceptual structure:

```text
xama/
├── apps/
│   └── web/
│
├── packages/
│   ├── domain/
│   └── design-tokens/
│
├── supabase/
├── assets/
├── docs/
├── reference/
├── AGENTS.md
├── package.json
└── pnpm-workspace.yaml
```

Do not create empty native mobile or desktop applications merely to anticipate future clients.

Create additional applications only when their implementation begins.

---

## Web Application

The initial production client lives under:

```text
apps/web/
```

Technology:

- React;
- TypeScript;
- Vite;
- Tailwind CSS;
- shadcn/ui where useful;
- React Router;
- TanStack Query.

The application is responsive.

Desktop provides the richest workspace experience, but mobile browser support is part of the initial product.

Do not maintain independent desktop-web and mobile-web applications.

Responsive presentation should reuse product behavior, feature logic, services, and state.

---

## React Architecture

The web application should primarily use feature-oriented organization.

A conceptual structure may resemble:

```text
apps/web/src/
├── app/
│   ├── providers/
│   ├── router/
│   └── layout/
│
├── features/
│   ├── auth/
│   ├── communities/
│   ├── channels/
│   ├── favorites/
│   ├── chat/
│   ├── members/
│   ├── voice/
│   ├── screen-share/
│   └── settings/
│
├── components/
│   └── ui/
│
├── infrastructure/
│   ├── supabase/
│   └── livekit/
│
├── shared/
│   ├── hooks/
│   ├── utils/
│   └── types/
│
├── styles/
└── main.tsx
```

This is a direction, not a requirement to create every directory immediately.

Only create modules that have real content.

Avoid directories whose only purpose is satisfying an architectural diagram.

---

## Feature Organization

Features should own behavior specific to their product area.

For example:

```text
features/chat/
├── components/
├── hooks/
├── queries/
├── services/
└── types/
```

The exact structure may remain smaller until complexity requires subdivision.

Avoid giant global directories such as:

```text
components/
hooks/
services/
types/
utils/
```

containing unrelated code from the entire application.

Shared code should become shared only when there is demonstrated reuse.

Do not move code into `shared` merely because it could theoretically be reused someday.

---

## Domain Package

Pure product/domain concepts that can reasonably be shared across clients belong in:

```text
packages/domain/
```

Examples may include:

- User;
- Community;
- CommunityMember;
- Channel;
- ChannelType;
- Message;
- Role;
- Invite;
- NavigationMode;
- navigation resolution rules;
- other provider-independent product concepts.

The domain package must not depend on:

- React;
- browser APIs;
- Supabase;
- LiveKit;
- Tailwind;
- shadcn/ui;
- web-specific routing.

The goal is not to implement full Domain-Driven Design.

The goal is to prevent core product concepts from becoming unnecessarily coupled to one client or provider.

---

## Design Tokens Package

Semantic design primitives should live in:

```text
packages/design-tokens/
```

This package exists to establish a stable vocabulary for the visual system.

Examples:

```text
background
surface
surfaceRaised

textPrimary
textSecondary
textMuted

accent
border

success
warning
danger

radiusSmall
radiusMedium
radiusLarge

spacingSmall
spacingMedium
spacingLarge
```

The implementation may expose tokens in formats appropriate for the current web application.

Do not assume CSS variables are the only representation the project will ever need.

Future native clients may consume equivalent token definitions through another representation.

---

## Styling

The web application should use semantic design tokens.

Avoid scattering repeated raw values such as:

```css
color: #ffffff;
background: #111318;
border-radius: 13px;
```

through unrelated components.

Tailwind may consume CSS variables backed by the token system.

Component-specific values remain acceptable where they genuinely belong to one component.

Do not attempt to make every numeric value globally configurable.

---

## Customization Architecture

Future customization is expected to evolve beyond color themes.

Potential future areas include:

- visual themes;
- density;
- panel dimensions;
- component visibility;
- navigation preferences;
- voice component placement;
- keyboard shortcuts;
- command surfaces;
- eventually controlled extensions.

The initial implementation must not build a full customization engine.

Instead, it should preserve clean boundaries that allow future preferences to be declarative.

Conceptually, future user preferences may resemble:

```json
{
  "navigationMode": "automatic",
  "showFavorites": true,
  "density": "comfortable",
  "communitySidebarWidth": 280
}
```

This example is illustrative only.

Do not establish a permanent preference schema before real requirements exist.

---

## Layout Customization

Major layout regions should be implemented compositionally rather than as one monolithic page.

For example, the application shell may conceptually compose:

```text
AppShell
├── CommunityRail
├── CommunityNavigation
├── PrimaryContent
├── MembersPanel
└── GlobalVoiceSurface
```

This enables responsive presentation and future layout preferences without coupling unrelated behavior.

Do not allow users to arbitrarily rearrange the application during the MVP.

Future layout customization should use controlled, validated layout options rather than unrestricted DOM manipulation.

---

## Command Readiness

Important actions should not become unnecessarily dependent on one visual button.

Examples of conceptual actions include:

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

The initial implementation does not require a complete command framework.

When useful, actions should be implemented through reusable feature functions or hooks rather than duplicated event logic across multiple UI components.

This leaves room for future:

- keyboard shortcuts;
- command palette;
- alternative layouts;
- accessible interaction surfaces;
- controlled extensions.

Do not implement speculative plugin infrastructure.

---

## Future Extension Model

If Xama eventually supports community-created functionality, custom shortcuts, or extensions, arbitrary JavaScript execution must not be assumed.

A future extension architecture would require deliberate work around:

- permissions;
- sandboxing;
- manifests;
- capability APIs;
- version compatibility;
- review and trust;
- security boundaries.

None of this is MVP scope.

The current architecture only needs to avoid making such future work unnecessarily impossible.

---

## Server State

Remote/server state should primarily be managed through TanStack Query.

Examples:

- communities;
- channels;
- messages;
- members;
- favorites;
- user profiles;
- invites.

Do not duplicate TanStack Query server state into a separate global client store without a concrete reason.

Query keys should be consistent and feature-owned.

Mutations should update or invalidate relevant query state deliberately.

---

## Local UI State

State that belongs only to a component or small subtree should remain local whenever practical.

Examples:

- open dropdown;
- temporary modal state;
- hover state;
- local form interaction;
- temporary expanded section.

Do not move ordinary local state into a global store merely for convenience.

---

## Global Client State

Global client state is appropriate when state must survive navigation or coordinate distant application regions.

Examples include:

- active voice session;
- watched screen share;
- screen-share presentation mode;
- mini-player position during the current session;
- globally relevant UI preferences.

Use a small dedicated client-state solution when these requirements appear.

A lightweight store such as Zustand is acceptable for truly global client state.

Do not use the global store as a replacement for TanStack Query.

---

## Voice Session State

Voice session state is application-global.

It must live above route-specific community or channel content.

Conceptually:

```text
Application
├── GlobalVoiceSession
└── Router
    ├── Community A
    ├── Community B
    └── Settings
```

Navigating between routes must not destroy the media session.

The active voice room and the currently viewed route are separate concepts.

---

## Screen Share State

Watching a screen share is also independent from routing.

The state should distinguish at least:

- active voice connection;
- available streams;
- currently watched stream;
- presentation mode.

Presentation mode may conceptually include:

```text
focus
mini
hidden
```

Changing presentation mode must not alter voice connection state.

---

## Responsive Architecture

Desktop and mobile web must share business behavior.

Avoid patterns such as:

```text
DesktopChatPage
MobileChatPage
```

containing duplicated feature logic.

Prefer responsive composition where presentation changes while feature behavior remains shared.

For example:

```text
MembersContent
    ↓
Desktop → MembersPanel
Mobile  → MembersSheet
```

The underlying members behavior remains shared.

The same principle applies to navigation and voice controls.

---

## Responsive Breakpoints

Do not encode product semantics around one arbitrary screen width.

Responsive breakpoints should represent layout capability rather than device brands.

Prefer deciding based on whether the available space can support:

- persistent community navigation;
- members as a permanent column;
- workspace panel spacing;
- other layout structures.

CSS media queries and container-aware behavior may both be used where appropriate.

---

## Supabase Boundary

Supabase is the initial backend platform.

It provides:

- PostgreSQL;
- authentication;
- Realtime;
- storage;
- server-side functions.

React presentation components must not scatter direct Supabase queries throughout the application.

Avoid:

```text
Component
    ↓
supabase.from(...)
```

throughout the UI.

Prefer feature-level data access boundaries such as:

```text
Component
    ↓
feature hook/query
    ↓
repository/service
    ↓
Supabase adapter
```

This boundary makes:

- provider migration;
- testing;
- authorization reasoning;
- query reuse;
- API evolution

significantly easier.

Do not create unnecessary repository abstractions for code that does not interact with external data.

---

## Supabase Client

The browser should use only credentials intended for public client usage.

Never expose privileged Supabase service-role credentials in frontend code.

Environment variables must be managed through local environment files and deployment configuration.

Commit an `.env.example`.

Never commit real secrets.

---

## Database Migrations

Database structure must be versioned through migrations stored in:

```text
supabase/migrations/
```

Do not rely on undocumented manual production-dashboard changes.

Schema evolution should be reproducible from the repository.

---

## Database Design

Prefer relational modeling for clearly relational product data.

Initial product concepts may eventually include tables such as:

```text
profiles
communities
community_members
channels
channel_favorites
messages
invites
```

This list is illustrative and will be refined when backend implementation begins.

Avoid large unstructured JSON columns when relational constraints provide a clearer model.

Use indexes according to actual query patterns.

Do not add speculative indexes without understanding their cost and purpose.

---

## Row Level Security

RLS is a required part of the Supabase security model.

User-owned or community-scoped data should not rely solely on frontend checks.

Authorization rules must be enforced at the database/server boundary.

Examples include ensuring that:

- only community members can access private community content;
- users can modify only allowed resources;
- membership roles govern privileged actions.

Frontend permission checks exist for UX.

They are not the security boundary.

---

## Privileged Operations

Sensitive operations should execute in trusted server-side contexts.

Examples may eventually include:

- LiveKit token generation;
- privileged moderation operations;
- sensitive invitation workflows;
- administrative actions.

Use Supabase Edge Functions or another server-side layer where appropriate.

Never embed provider secrets in the browser.

---

## Input Validation

Data entering trusted application boundaries should be validated.

Do not assume TypeScript compile-time types validate runtime external data.

Validation is especially important for:

- form submissions;
- server-function input;
- URL parameters;
- external API responses;
- persisted configuration;
- future customization data.

A runtime schema validation library may be introduced when actual validation needs justify it.

Avoid adding validation libraries merely for unused infrastructure.

---

## LiveKit Boundary

LiveKit is the initial media provider for:

- voice;
- participants;
- screen sharing.

LiveKit-specific APIs should remain behind dedicated media integration code.

Avoid exposing LiveKit objects throughout unrelated presentation components.

Conceptually:

```text
Voice UI
    ↓
voice feature/service
    ↓
LiveKit adapter
```

This allows media behavior and UX state to remain understandable even if provider details change.

---

## LiveKit Authentication

LiveKit secrets must never be exposed to the web client.

Participant access tokens should be produced by a trusted server-side function.

The web client receives only the scoped token necessary to join the intended room.

---

## Realtime Messaging

Initial realtime text updates may use Supabase Realtime.

Realtime subscriptions should be scoped to the data currently required.

Avoid opening unnecessary global subscriptions.

Realtime events should integrate with TanStack Query state rather than creating a second unrelated source of truth.

A typical pattern may be:

```text
initial query
    ↓
TanStack Query cache

Realtime event
    ↓
update/invalidate relevant cache
```

The exact strategy may differ by feature.

---

## External Provider Independence

Initial providers are implementation choices, not permanent domain concepts.

Examples:

```text
Supabase
LiveKit
Cloudflare
```

Domain and presentation code should avoid unnecessary provider-specific assumptions.

However, do not create elaborate generic provider frameworks before more than one implementation exists.

Use focused boundaries around provider interactions.

---

## Authentication

Authentication should be managed at application level.

Route protection and session restoration should not be duplicated across individual features.

User authentication and product profile data should remain conceptually distinct.

Provider authentication identity may map to a Xama profile.

Authorization remains enforced server-side.

---

## Error Handling

Expected failures should have structured application handling.

Avoid leaking raw provider errors directly into user-facing interfaces.

Infrastructure errors should be normalized into meaningful feature-level errors where useful.

User-facing messages should be understandable and localized appropriately.

Unexpected application failures should be catchable through appropriate error boundaries.

Do not expose secrets or internal implementation details in error messages.

---

## Logging

Development logging should remain useful and intentional.

Avoid uncontrolled `console.log` usage throughout production code.

Sensitive values must never be logged.

A dedicated observability platform may be introduced when deployment maturity justifies it.

Do not add heavyweight monitoring infrastructure before the product needs it.

---

## Performance

Performance should be treated as an architectural concern without premature micro-optimization.

Important principles include:

- avoid unnecessary React re-renders;
- scope global state carefully;
- lazy-load heavy functionality when useful;
- avoid mounting media components unnecessarily;
- paginate or incrementally load message history;
- virtualize very large lists when proven necessary;
- optimize images and avatars;
- scope realtime subscriptions;
- avoid excessive blur and expensive visual effects;
- keep mobile CPU, network, and battery cost in mind.

Do not add memoization everywhere without evidence.

Measure before performing low-level optimization.

---

## Code Splitting

Large or infrequently used feature surfaces may be lazy-loaded.

Candidates may eventually include:

- settings;
- advanced administration;
- future dashboard;
- heavy media surfaces.

Do not fragment trivial components into unnecessary network chunks.

---

## Accessibility

Architecture should allow equivalent interaction paths across input methods.

Desktop hover must not be the only way to access important actions.

Keyboard-accessible controls and visible focus are expected.

Mobile touch interactions should expose equivalent capabilities.

Resizable or draggable components must not make essential product functionality inaccessible.

---

## Testing Strategy

Testing should focus on valuable behavior rather than arbitrary coverage percentages.

### Unit tests

Prioritize pure logic with meaningful behavior, such as:

- automatic navigation resolution;
- permission logic;
- domain transformations;
- preference resolution.

### Component/integration tests

Use when interaction complexity or regressions justify them.

Examples may include:

- adaptive navigation;
- voice-state presentation;
- favorites behavior;
- responsive members presentation.

### End-to-end tests

Before broader release, critical product flows should eventually receive end-to-end coverage.

Examples:

```text
authenticate
→ enter community
→ open channel
→ send message
```

and later:

```text
join voice
→ navigate elsewhere
→ remain connected
```

Do not chase 100% coverage.

Tests should protect meaningful behavior.

---

## Static Quality Checks

The project should provide commands for at least:

```text
lint
typecheck
test
build
```

Production changes should not knowingly leave these checks broken.

Formatting should be automated.

Use one consistent formatting strategy across the repository.

---

## Continuous Integration

GitHub Actions should eventually run core validation on pull requests.

At minimum:

```text
install
lint
typecheck
test
build
```

Deployment automation may be added when hosting is configured.

Avoid complex CI pipelines before they provide actual value.

---

## Dependency Management

Add dependencies only for concrete requirements.

Before introducing a package, consider:

- whether the platform already provides the capability;
- maintenance quality;
- bundle impact;
- security;
- ecosystem stability;
- whether a small local implementation is clearer.

Do not reimplement complex solved problems merely to avoid dependencies.

Do not install libraries speculatively.

---

## Version Pinning

Use the package manager lockfile.

The project runtime version should be explicitly documented and preferably pinned using an appropriate repository mechanism.

Use an actively supported Node.js LTS release.

Do not rely on undocumented developer-machine runtime versions.

---

## Environment Configuration

Environment-specific values should be separated from source code.

The repository should include:

```text
.env.example
```

with required variable names but no secrets.

Local development, preview, and production environments should remain distinguishable.

---

## Security Principles

Security must be treated as a server-enforced property.

Important initial principles include:

- RLS for protected database resources;
- least privilege;
- no privileged secrets in clients;
- server-generated media tokens;
- validated inputs;
- safe handling of user-generated content;
- permission checks at trusted boundaries;
- secure authentication flows;
- careful future file-upload handling.

Security-sensitive behavior should not depend solely on hidden buttons.

---

## User-Generated Content

Messages and future user-generated content should be treated as untrusted input.

Rendering must avoid unsafe HTML execution.

Future uploads will require deliberate rules around:

- allowed content types;
- size limits;
- storage permissions;
- moderation;
- malware or abuse considerations.

Unrestricted uploads are not required for the initial implementation.

---

## Scalability Philosophy

Scalability should come primarily from clear boundaries and data design rather than premature distributed infrastructure.

Initial managed services are appropriate while product usage is uncertain.

The intended progression is:

```text
managed infrastructure
        ↓
measure real bottlenecks
        ↓
optimize targeted components
        ↓
migrate only where justified
```

Potential future migrations may include:

```text
Supabase → dedicated API + PostgreSQL

Supabase Realtime
→ dedicated realtime infrastructure

Supabase Storage
→ object storage such as Cloudflare R2 or S3

LiveKit Cloud
→ self-hosted LiveKit or another media architecture
```

These are migration options, not scheduled tasks.

---

## Future Backend Evolution

If Xama eventually requires its own backend API, clients should not depend directly on provider-specific concepts more than necessary.

A future API may serve:

- web;
- desktop;
- mobile.

The initial domain and data-access boundaries should reduce migration cost.

Do not build this API before there is a real reason to replace the managed backend approach.

---

## Future Native Desktop Client

No native desktop client is part of the current implementation.

When required, it should prioritize:

- low resource usage;
- media reliability;
- operating-system integration;
- responsiveness;
- reuse of backend/domain contracts.

Potential technology choices should be evaluated when requirements are real.

Do not make Electron a mandatory architectural destination.

Do not create desktop application code now.

---

## Future Native Mobile Client

No native mobile application is part of the initial implementation.

The responsive web product defines and validates the mobile UX first.

A future native client should share:

- backend semantics;
- domain concepts;
- authentication model;
- API contracts;
- design-system concepts where practical.

Web-specific React components should not be treated as universally reusable native UI.

Do not force artificial UI sharing between fundamentally different rendering platforms.

Share behavior and contracts where valuable.

---

## API Contracts

When the backend boundary becomes more explicit, stable client/server contracts should use an appropriate machine-readable representation when useful.

Possible future options include:

- generated TypeScript database types;
- runtime schemas;
- OpenAPI;
- JSON Schema.

Do not introduce contract-generation infrastructure before a real API boundary exists.

---

## Architecture Decision Records

Important architectural decisions that are expensive or consequential to reverse may eventually be documented as ADRs under:

```text
docs/adr/
```

Do not create ADRs for trivial implementation choices.

Use them when a decision affects the long-term architecture and future contributors need to understand why it was made.

---

## Documentation Maintenance

Architecture documentation is part of the codebase.

If implementation intentionally changes a major rule in this document, update the documentation in the same change.

Avoid documentation that describes a system that no longer exists.

---

## Anti-Patterns

Avoid:

- premature microservices;
- speculative plugin frameworks;
- speculative native apps;
- provider calls scattered through presentation components;
- server state duplicated into global UI stores;
- global state for ordinary local component behavior;
- monolithic application pages;
- framework-dependent domain logic;
- unrestricted user-supplied code execution;
- frontend-only authorization;
- manual unversioned database changes;
- secrets committed to source control;
- arbitrary hardcoded visual constants everywhere;
- abstraction layers with only hypothetical benefits;
- optimizing for enormous scale before measuring actual usage.

---

## Definition of Architectural Success

The architecture is successful if the initial team can ship the MVP quickly while preserving the ability to evolve the system without widespread rewrites.

A new developer or coding agent should be able to determine:

- where a feature belongs;
- where remote data is accessed;
- where domain logic belongs;
- where global media state lives;
- where visual tokens are defined;
- where external providers are integrated;
- which future features are intentionally not implemented.

The architecture should make the correct path easy rather than relying on contributors remembering unwritten conventions.

---

## Current Architecture Status

The project is currently establishing its implementation foundation.

No architectural choice should be considered permanent merely because it appears in the first implementation.

Changes should be driven by:

- real requirements;
- measured performance;
- maintainability;
- security;
- product feedback;
- operating cost.

Use managed infrastructure and simple abstractions while development speed matters more than infrastructure control.

Evolve deliberately when scale or product requirements justify it.