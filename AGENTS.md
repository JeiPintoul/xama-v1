# Xama — Agent Engineering Instructions

## Purpose

This file contains permanent engineering instructions for coding agents working on Xama.

Read this file before changing the repository.

Also read the documentation relevant to the requested work:

- `docs/PRODUCT.md` — product scope and priorities;
- `docs/UX.md` — interaction and responsive UX rules;
- `docs/PROTOTYPE.md` — visual and interaction references;
- `docs/ARCHITECTURE.md` — architectural boundaries and technical direction;
- `docs/ROADMAP.md` — milestone scope and implementation sequence.

Do not reinterpret the project from scratch when these documents already define the intended direction.

---

## Scope Discipline

Implement only the requested milestone or task.

Do not proactively implement later roadmap items.

Do not add speculative infrastructure merely because it may be useful someday.

Future-readiness should come from good boundaries and maintainable design, not from building unused systems.

If a future requirement is documented but explicitly outside the current scope, preserve a reasonable path toward it without implementing it.

Follow YAGNI:

**You Aren't Gonna Need It until there is a concrete requirement.**

---

## Engineering Priorities

Optimize for, in this order when practical:

1. correctness;
2. clarity;
3. maintainability;
4. security;
5. user experience;
6. performance;
7. scalability;
8. implementation simplicity.

Do not sacrifice correctness or maintainability for cleverness.

Prefer the simplest solution that fully satisfies the real requirement.

Simple does not mean careless.

---

## KISS

Follow KISS:

**Keep It Simple.**

Avoid:

- unnecessary architectural layers;
- unnecessary indirection;
- pattern-heavy solutions to simple problems;
- generalized frameworks created for one use case;
- configuration systems before configuration is needed;
- defensive logic for states that cannot realistically occur;
- abstractions whose only justification is hypothetical future reuse.

Complexity must earn its place.

---

## DRY

Follow DRY where duplication represents the same stable concept or behavior.

Do not use DRY dogmatically.

A small amount of local duplication is preferable to a premature abstraction that:

- hides intent;
- couples unrelated features;
- requires excessive configuration;
- exists only because two pieces of code currently look similar.

Extract shared behavior when the shared concept is real and sufficiently stable.

Do not create generic abstractions merely to eliminate a few repeated lines.

---

## Object-Oriented Design

Use object-oriented principles when they improve encapsulation, domain modeling, or maintainability.

Apply concepts such as:

- encapsulation;
- clear responsibilities;
- dependency inversion;
- cohesive modules;
- explicit contracts.

Do not force object-oriented patterns where simpler TypeScript functions, modules, or composition are clearer.

In React code, prefer composition and functional components.

Prefer composition over inheritance.

Avoid deep inheritance hierarchies.

Do not create classes solely to satisfy an abstract idea of OOP.

---

## SOLID

Treat SOLID as design guidance rather than mandatory ceremony.

Especially preserve:

- Single Responsibility;
- Interface Segregation;
- Dependency Inversion.

A module should have a clear reason to change.

External providers should depend on project boundaries rather than spreading provider-specific behavior throughout the application.

Do not create interfaces for every class or function when there is only one implementation and no meaningful boundary.

---

## Separation of Concerns

Keep these concerns conceptually separate:

```text
domain
behavior
presentation
infrastructure
visual styling
```

Examples:

- domain concepts should not depend on React;
- React presentation should not contain raw Supabase data-access logic;
- LiveKit details should not leak into unrelated UI;
- visual preferences should not alter domain semantics;
- route changes must not own the lifetime of global voice sessions.

Respect the boundaries documented in `ARCHITECTURE.md`.

---

## Feature-Oriented Design

Prefer feature ownership over large global technical folders.

Code related to a product capability should generally live near that feature.

Examples:

```text
features/chat/
features/channels/
features/voice/
features/screen-share/
```

Do not create every possible subdirectory before it is needed.

A feature with two files does not need ten architectural folders.

Allow structure to grow with real complexity.

---

## TypeScript

Use strict TypeScript.

Avoid `any`.

If an external integration forces an unsafe value:

- narrow it as soon as possible;
- validate it where appropriate;
- do not allow unsafe typing to propagate through the application.

Prefer:

- explicit domain types;
- discriminated unions where useful;
- narrow types;
- immutable values where practical;
- meaningful type names.

Avoid:

- excessive type gymnastics;
- extremely generic conditional types without real benefit;
- duplicating runtime logic only to satisfy complex type abstractions.

Types should make code easier to understand.

---

## React

Use functional React and composition.

Prefer local state when state is local.

Do not move state into global stores unnecessarily.

Keep:

- server state in TanStack Query;
- local interaction state locally;
- truly application-global client state in the appropriate global layer.

Avoid:

- giant components;
- unnecessary effects;
- effect chains used to derive state that could be computed directly;
- duplicated state;
- unnecessary context providers;
- premature memoization.

Use `useMemo`, `useCallback`, and memoization only when they solve a real problem or preserve required referential behavior.

Do not add them mechanically.

---

## State Ownership

State should live at the lowest level that can correctly own it.

Do not maintain two independent sources of truth for the same data.

Examples:

```text
remote communities
→ TanStack Query

open dropdown
→ local component state

active voice session
→ global client state

stream presentation mode
→ global media/UI state
```

Do not duplicate query data into a global store without a concrete reason.

---

## External Services

Keep provider-specific code behind focused boundaries.

For example:

```text
UI
↓
feature logic
↓
repository/service
↓
Supabase
```

and:

```text
Voice UI
↓
voice/media boundary
↓
LiveKit
```

Do not over-generalize these boundaries into complex provider frameworks before multiple implementations exist.

The purpose is isolation, not abstraction for abstraction's sake.

---

## Error Handling

Handle errors that can realistically happen.

Do not write elaborate branches for impossible states merely to appear defensive.

At trusted boundaries, validate assumptions that come from:

- users;
- network responses;
- URLs;
- persisted data;
- external providers;
- future customization data.

Internal invariants may be treated as invariants when the architecture genuinely guarantees them.

Fail clearly when an impossible internal state indicates a programming error.

Do not silently swallow failures.

Do not expose raw infrastructure errors or secrets to users.

---

## Edge Cases

Consider realistic edge cases.

Prioritize cases that may occur because of:

- user behavior;
- asynchronous operations;
- network failures;
- permissions;
- race conditions;
- responsive layout;
- browser behavior;
- external providers.

Do not spend significant complexity supporting states that are impossible under established invariants.

Avoid speculative defensive programming.

If handling an edge case requires substantial complexity, verify that the case is actually possible or important before implementing it.

---

## Comments

Prefer self-explanatory code over comments.

Do not add comments that merely restate the code.

Avoid comments such as:

```ts
// Set the user
setUser(user)
```

Comments are appropriate when they explain something that cannot reasonably be expressed by code alone, such as:

- a non-obvious external constraint;
- an important workaround;
- a security reason;
- a browser/provider limitation;
- an architectural invariant.

TODO comments are acceptable when they represent a concrete, actionable follow-up.

Prefer:

```ts
// TODO: Persist sidebar width once user preferences are backed by Supabase.
```

Avoid vague TODOs.

Do not generate large explanatory comment blocks inside production code.

---

## Documentation

Do not over-document implementation details.

Code should remain the primary explanation of ordinary behavior.

Update project documentation when a change intentionally alters:

- product scope;
- approved UX;
- architecture;
- milestone expectations;
- important long-term decisions.

Do not create additional documentation files unless they serve a concrete purpose.

---

## Naming

Use clear, explicit, domain-oriented names.

Prefer:

```text
favoriteChannel
activeVoiceSession
resolveNavigationMode
communityMembership
```

over vague names such as:

```text
data
handler
thing
manager
helper
misc
```

Avoid redundant names that repeat unnecessary context.

Do not abbreviate important domain concepts merely to save characters.

---

## Functions

Functions should have a clear responsibility.

Prefer small, cohesive functions when decomposition improves readability.

Do not mechanically split every function into tiny fragments.

A longer function with one coherent responsibility may be clearer than many one-line wrappers.

Avoid boolean-parameter APIs when they make behavior ambiguous.

Prefer explicit domain concepts when behavior meaningfully differs.

---

## Components

Components should have clear responsibilities.

Extract a component when doing so improves:

- reuse;
- readability;
- isolation;
- interaction ownership;
- responsive composition.

Do not extract components merely to reduce line count.

Avoid monolithic application components containing unrelated features.

Avoid excessive wrapper components with no meaningful behavior or semantics.

---

## Reuse

Reuse domain behavior and stable UI primitives.

Do not reuse components merely because two screens currently look similar if their semantics and future evolution differ.

Prefer composition over highly configurable "do everything" components.

Avoid components with dozens of boolean props controlling unrelated modes.

---

## Dependencies

Add a dependency only for a concrete requirement.

Before installing a package, evaluate:

- whether the platform already solves the problem;
- whether existing project dependencies already solve it;
- implementation complexity without the dependency;
- maintenance quality;
- ecosystem maturity;
- security;
- bundle impact;
- long-term suitability.

Do not implement complex solved problems from scratch without reason.

Do not install libraries speculatively.

---

## Performance

Write reasonably efficient code by default.

Prioritize architectural performance issues such as:

- unnecessary global state;
- unnecessary subscriptions;
- repeated network requests;
- unbounded lists;
- expensive rendering;
- media lifecycle;
- large bundles.

Do not perform premature micro-optimization.

Measure before introducing complex optimizations.

Do not add memoization everywhere.

---

## Responsive Development

Mobile web is part of the product.

Do not implement desktop functionality in a way that requires rewriting the feature for mobile.

Share:

- domain behavior;
- feature behavior;
- data access;
- state.

Adapt presentation to available space.

Do not duplicate full feature implementations into separate desktop and mobile versions unless there is a strong technical reason.

No essential interaction may depend only on hover.

---

## Accessibility

Accessibility is part of implementation quality.

Use semantic HTML where possible.

Interactive controls should have:

- accessible names;
- keyboard support where appropriate;
- visible focus;
- reasonable hit targets.

Provide non-hover alternatives for essential actions.

Do not implement inaccessible custom controls when native semantics can solve the problem cleanly.

---

## Security

Never trade security for frontend convenience.

Never expose privileged credentials to clients.

Do not rely on hidden UI elements for authorization.

Respect:

- Supabase RLS;
- trusted server-side operations;
- scoped LiveKit tokens;
- runtime validation at trust boundaries;
- safe user-generated-content rendering.

Do not log secrets or sensitive tokens.

---

## Database

Database changes must use versioned migrations.

Do not depend on undocumented manual dashboard modifications.

Model relational data relationally when appropriate.

Add indexes for known query patterns.

Do not add speculative indexes or denormalization before query requirements justify them.

Authorization belongs at trusted backend/database boundaries.

---

## Testing

Tests should protect meaningful behavior.

Prioritize tests for:

- domain rules;
- permission rules;
- navigation resolution;
- state transitions;
- complex interactions;
- regressions.

Do not generate trivial tests solely to increase coverage.

Do not test implementation details when observable behavior provides a better contract.

Do not pursue arbitrary 100% coverage.

When fixing a meaningful regression, add a regression test when practical.

---

## Testability

Do not distort simple production architecture solely to make trivial code easier to mock.

Use dependency boundaries where they already make architectural sense.

Prefer testing pure logic directly.

Prefer integration-style testing for behavior spanning meaningful modules.

Mock external boundaries when appropriate.

---

## Code Quality

Before considering a task complete, run the quality checks relevant to the repository.

The final project is expected to provide commands equivalent to:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Do not knowingly leave the repository in a failing state.

Do not suppress lint or TypeScript errors merely to make checks pass unless there is a documented and justified reason.

Fix the underlying problem.

---

## Formatting

Use the repository formatter.

Do not manually fight automated formatting.

Do not introduce another competing formatting convention.

Keep formatting-only changes out of unrelated files when possible.

---

## File Changes

Keep changes focused on the requested task.

Do not refactor unrelated areas merely because improvements are possible.

When a necessary refactor is required to implement the task correctly, keep it targeted and explain it briefly in the completion summary.

Avoid large formatting churn.

---

## Backward Compatibility

During early development, do not preserve unused internal APIs solely for hypothetical compatibility.

Once persisted data, public APIs, or released client behavior depend on a contract, treat compatibility deliberately.

Do not create migration machinery before there is something real to migrate.

---

## Abstractions

Every abstraction should solve a current problem.

Avoid abstractions created because:

- a second implementation might exist someday;
- a provider might hypothetically change;
- a feature might theoretically need more options.

Provider boundaries documented by the architecture are intentional.

Beyond those boundaries, wait for evidence.

A good abstraction should reduce cognitive load.

If it makes the code harder to understand than the duplicated implementation it replaces, reconsider it.

---

## Design Patterns

Use design patterns when the problem naturally matches them.

Do not implement patterns for their own sake.

Patterns are vocabulary, not objectives.

Prefer idiomatic TypeScript and React before introducing enterprise patterns borrowed from unrelated ecosystems.

---

## Future Customization

Preserve the ability to support future:

- themes;
- design tokens;
- layout preferences;
- component visibility;
- navigation preferences;
- configurable shortcuts;
- commands;
- controlled extensions.

Do not implement the full customization system now.

Keep future customization declarative and validated where possible.

Do not design future customization around arbitrary direct DOM manipulation.

Do not allow arbitrary user JavaScript execution without a dedicated future security architecture.

---

## Future Clients

The current implementation is the responsive web application.

Do not create native desktop or mobile applications until requested.

Do not assume web UI components will be reusable in native clients.

Prioritize reuse of:

- domain concepts;
- contracts;
- backend semantics;
- business rules;
- design-token concepts.

Avoid web-specific assumptions in shared domain packages.

---

## Git Practices

Keep commits conceptually focused.

Use conventional, descriptive commit messages when practical, for example:

```text
feat: add adaptive community navigation
fix: preserve voice session during navigation
refactor: isolate Supabase channel repository
docs: update screen-sharing UX
```

Do not combine unrelated changes into one large commit when avoidable.

Do not rewrite shared history unless explicitly requested.

---

## Dependency and Lockfile Discipline

Use `pnpm`.

Commit the lockfile.

Do not mix npm, Yarn, and pnpm lockfiles.

Avoid unnecessary dependency upgrades during unrelated tasks.

Do not perform broad package upgrades without explicit reason.

---

## Secrets

Never commit:

- API secrets;
- service-role keys;
- LiveKit secrets;
- production credentials;
- private tokens.

Use environment variables.

Maintain `.env.example` containing variable names and safe descriptions only.

---

## Agent Communication

Keep task-completion responses concise.

Do not provide long tutorials or explain obvious implementation details unless explicitly requested.

At completion, report primarily:

- what changed;
- important implementation decisions only when necessary;
- validation/checks performed;
- blockers or unresolved issues.

Do not narrate every step taken.

Do not dump chain-of-thought or internal reasoning.

---

## Decision Making

Do not ask for clarification when:

- the documentation already defines the answer;
- an idiomatic low-risk solution clearly satisfies the requirement;
- the decision is easily reversible and not product-significant.

Ask before proceeding when ambiguity materially affects:

- product behavior;
- architecture;
- security;
- data loss;
- compatibility;
- significant dependencies;
- irreversible decisions.

When multiple approaches are similarly valid, prefer the simpler and more idiomatic one.

---

## Existing Code

Before implementing something new:

1. inspect the existing relevant code;
2. understand the established local patterns;
3. reuse appropriate existing behavior;
4. avoid creating duplicate competing systems.

Do not refactor good existing code solely because another style is possible.

Improve patterns when there is a concrete reason.

---

## Prototype Use

The Xama prototype is a UX reference, not production source code.

Use:

```text
docs/PROTOTYPE.md
reference/prototype/
```

and the interactive prototype when useful.

Preserve:

- intended information hierarchy;
- interaction behavior;
- major UX states.

Do not mechanically reproduce:

- exact dimensions;
- incidental prototype implementation;
- Discord-specific styling;
- prototype mock architecture.

Production quality takes precedence over pixel-level imitation.

---

## Roadmap Discipline

Before starting a roadmap milestone:

1. read its complete scope;
2. read its non-goals;
3. read its acceptance criteria;
4. inspect the current repository state.

Do not start the next milestone early.

If the current milestone reveals an issue relevant to a later milestone, note it without implementing that later scope unless necessary for correctness.

---

## Definition of Done

A task is complete when:

- requested behavior is implemented;
- scope remains focused;
- code follows project architecture;
- realistic error states are handled;
- relevant tests exist and pass;
- lint passes;
- TypeScript passes;
- build passes;
- responsive behavior is considered where relevant;
- accessibility is considered where relevant;
- documentation is updated only when the approved design changed;
- no unrelated speculative functionality was added.

---

## Final Rule

Prefer code that another competent engineer can understand and safely change six months later.

The best solution is usually not the most abstract, most defensive, or most sophisticated one.

It is the simplest solution that correctly solves the real problem while preserving the boundaries the product genuinely needs.