# CF0.1.1 — Cloudflare Realtime security and cost-control hardening

CF0 remains an isolated infrastructure spike on `spike/cloudflare-realtime`. The working LiveKit
Quick Share implementation is unchanged. CF0.1/CF0.1.1 harden only the Cloudflare control plane; they do
not add CF1 feature parity or expose the production Realtime App.

## Boundaries and threat model

Anonymous browsers, request bodies, participant IDs, Cloudflare Session IDs, Track IDs, room IDs,
and screen-share IDs are untrusted. Knowing any of those identifiers grants no authority. The
Realtime App Secret, Spend Guard admin secret, and optional Turnstile secret remain Worker-only and
must never use a `VITE_*` variable.

On join, the RoomCoordinator generates the participant ID and a 256-bit opaque Xama media
capability. Only its SHA-256 digest is stored. The stored authority is bound to the room,
participant, Cloudflare Session, expiry, and allowed operations. Every state, heartbeat, publish,
stop, subscribe, unsubscribe, renegotiate, and leave request requires that capability as a bearer
credential. Heartbeats extend its short lifetime; leave, stale cleanup, empty-room deletion, and
participant removal revoke it naturally.

This is anonymous room capability authorization, not account identity. Supabase Auth, moderation,
and persistent rooms remain outside CF0.1.

## Control plane versus media plane

Authorization, rate limits, resource caps, provider routing, Spend Guard admission, and pull-lease
checks run only on Worker/Durable Object control requests. Media is not proxied or inspected:

```text
browser ↔ Cloudflare Realtime SFU
```

The Worker never receives frame-by-frame RTP bytes, so these controls do not add per-frame latency.
The Cloudflare App Secret is used only by the server gateway for Session/Track HTTPS API calls.

## Server-owned provider routing

Provider selection remains a room-level server decision and existing rooms stay pinned. The browser
`providerMode` is ignored by default. `ALLOW_CLIENT_PROVIDER_OVERRIDE=true` enables it only for an
explicit development test such as `/cf0`; production-like deployments must keep it false.

In automatic mode, healthy/enabled LiveKit remains preferred. Cloudflare is excluded from new-room
selection when disabled, degraded, soft-budget-excluded, hard-stopped, or emergency-stopped. A
pinned Cloudflare room does not migrate, although hard/emergency admission can deny new Sessions or
pulls inside it.

## Spend Guard

`SpendGuard` is one SQLite-backed Durable Object per environment/deployment, addressed by the
constant name `environment`. Its transactional, strongly consistent storage owns:

- enabled and emergency-stop state;
- soft- and hard-budget thresholds;
- the explicit billing-cycle identity;
- conservative estimated egress for that cycle;
- active/closing remote-pull leases and the global active-pull count;
- short-lived global Cloudflare Session slots and the environment-wide Session count.

The enforced invariant is one authorized Xama subscription to one Spend Guard lease to at most one
Cloudflare remote pull. A duplicate lease acquisition returns `already-active`; only heartbeat may
renew a lease. Room state also rejects an existing participant/screen-share subscription before the
provider call, while the singleton Spend Guard transaction remains the final protection when room
requests interleave around external awaits.

Every `pullTrack()` first acquires a Spend Guard lease. The default lease is 40 seconds. The existing
10-second participant heartbeat renews active leases; no separate high-frequency renewal request
was added. The 15-second RoomCoordinator alarm checks every lease, closes expired or revoked
provider pulls, removes them from room state, and retries failed `tracks/close` operations from
durable pending-closure state.

Once a provider pull may have been created, its lease is never released first. Later application or
persistence failure moves the lease to `closing`, durably queues the provider closure, and releases
accounting only after `tracks/close` succeeds or Cloudflare authoritatively confirms that no provider
egress can remain. When `tracks/close` fails, the gateway performs the minimum reconciliation through
the documented Session-state endpoint: an HTTP 404 from that endpoint, or a valid Session track list
that does not contain the target `mid`, completes the closure idempotently. A timeout, 5xx, network failure,
malformed response, provider error without conclusive state, or a Session state that still contains
the target track keeps the lease accounted and the durable closure pending for the existing alarm
retry. This also recovers the case where provider close succeeds but local lease release fails: the
retry observes that the track is already absent, then completes the local release. Structured logs
contain counts and outcome categories, not capabilities, authorization headers, SDP, Session IDs, or
secrets.

The default accounting envelope is 12,000,000 bits/second for every authorized remote video pull.
That value is intentionally above expected 1080p30 delivery and is configured with
`CLOUDFLARE_ACCOUNTING_BITS_PER_SECOND_PER_PULL`. It does not configure encoder or stream quality.
Estimated bytes accrue from elapsed server-authorized lease/provider-closure exposure; browser
counters and submitted usage values are never trusted. Admission reports and evaluates:

- `estimatedEgressBytes`: accrued pessimistic usage;
- `reservedEgressBytes`: remaining authorization for active leases, plus a conservative rolling
  closure window for provider pulls still awaiting confirmed closure;
- `projectedWorstCaseEgressBytes`: accrued plus reserved exposure.

Acquisition and renewal must keep the projected worst case below the hard budget. Elapsed lease
time is accrued before remaining authorization is reserved, so it is not double-counted.

Spend Guard is a pessimistic financial circuit breaker, not Cloudflare's authoritative bill. It
cannot be byte exact because the Worker is not in the media packet path.

### Limit behavior

- Soft limit: Cloudflare is excluded for new automatic rooms. Existing valid Cloudflare room pulls
  may continue below the hard limit.
- Hard limit: new Cloudflare Sessions and pulls are denied, renewals fail, and active pulls close on
  the next heartbeat/alarm enforcement pass.
- Emergency stop: Cloudflare becomes immediately ineligible, new operations are denied, leases are
  revoked, and active pulls close on the next enforcement pass (normally within about 15 seconds;
  persisted closure retries continue after transient provider failures).

Cloudflare does not provide a native hard spending cap for this application. No code deletes the
Realtime App or automatically raises a local budget.

## Budgets, reserve, and billing cycle

The checked-in development defaults use a 5 GiB soft limit and 8 GiB hard limit. A reasonable
development envelope is 5–10 GB. For the initial private production alpha, use a deliberately
conservative hard budget around 600 GB (for example, soft near 550 GB and hard at 600 GB) after
creating a separate production Worker configuration.

Cloudflare's current documentation describes an account-level 1,000 GB free tier shared by Realtime
SFU and TURN. It is not a per-App allowance or a product guarantee. The unused capacity is an
intentional reserve for estimate error, delayed billing data, development usage, TURN, protocol
overhead, abuse, and future calibration.

Accounting never resets on the first day of a calendar month. The deployment supplies an explicit
billing-cycle ID/start/end. Changing that configuration does not silently reset stored usage, and
raising configured thresholds does not automatically raise the active cycle thresholds. An admin
must explicitly start/reset a cycle, with no active pull leases, before the new thresholds take
effect.

## Manual administration

The Worker exposes no React admin UI. These backend-only endpoints require
`Authorization: Bearer <REALTIME_ADMIN_SECRET>`, compared using fixed-length SHA-256 digests:

```text
GET  /admin/spend-guard
POST /admin/spend-guard/emergency-stop  { "enabled": true | false }
POST /admin/spend-guard/enabled         { "enabled": true | false }
POST /admin/spend-guard/cycle           { "cycleId", "startedAt", "endsAt"? }
```

The admin secret must be independently generated, high entropy, Worker-only, and never logged.
Cycle reset fails while pull leases are active; use emergency stop, allow enforcement to close
pulls, then reset explicitly.

Status includes enabled/emergency state, accrued/reserved/projected egress, active and closing pull
counts, and active Cloudflare Session slots. Repeated provider-close failures emit a structured
`cloudflare_provider_track_close_pending` log with counts only, so pending closure work is visible
without disclosing media or authorization identifiers. Provider-confirmed idempotent completion emits
`cloudflare_provider_track_close_reconciled` with only the absence category and remaining pending count.

## Resource and abuse limits

The default private-alpha room policy is enforced before provider API calls:

- 12 participants per room;
- 1 active screen-share publication per participant;
- 4 active publications per room;
- 4 remote screen-share pulls per participant;
- 24 remote pulls per room;
- 6 global Cloudflare pulls in development. A private production alpha should begin near 24;
- 16 concurrent Cloudflare Sessions in development, enforced by the Spend Guard singleton. A
  private production alpha should begin conservatively near 64.

A Cloudflare participant reserves a Session slot before `createSession()`. Failed Session creation
releases it immediately; heartbeat renews it; leave and stale cleanup release it. Short expiry
contains crashed clients. LiveKit participants are not counted. Session caps are resource/abuse
containment, while pull leases and projected egress remain the financial admission mechanism.

Cloudflare Workers Rate Limiting bindings apply a generous coarse IP join limit before capability
issuance and a capability-keyed control limit afterwards. These limits cover only control requests;
they are permissive, eventually consistent anti-abuse signals and are never used as accounting or a
financial switch.

Production-like CORS requires exact comma-separated `ALLOWED_ORIGINS`; wildcard/no-origin defaults
are not accepted when Cloudflare is enabled. CORS is only a browser policy and never substitutes for
capability authentication.

With `ENVIRONMENT=production` and Cloudflare enabled, startup requests fail closed unless exact
origins, Realtime credentials, explicit accounting bitrate, soft/hard budgets, pull and Session
caps, 30–45 second lease duration, billing-cycle identity/start, a high-entropy admin secret,
disabled client override, and required Turnstile settings are all intentional. Development defaults
are not silently promoted into a production deployment.

## Human-verification boundary

Capability issuance accepts an optional Turnstile token. When `REQUIRE_TURNSTILE=true`, a missing
secret, expected-hostname list, expected action, token, failed Siteverify request, or invalid token
fails closed. A successful Siteverify response must match `TURNSTILE_EXPECTED_HOSTNAMES` and the
dedicated `TURNSTILE_EXPECTED_ACTION=xama-media-join`. Siteverify is called server-side only. Local
development may leave Turnstile optional and should use a separate development widget. The CF0 UI
does not yet embed a widget; a future Managed, `interaction-only` widget should run once before
anonymous capability issuance, not before every media action.

The abrupt-viewer lifecycle still requires a real re-test against the development Realtime App. The
expected settled Spend Guard state after stale cleanup is one remaining Session, zero pulls, and zero
closing pulls. Local provider mocks validate the close/reconciliation state machine but cannot prove
the live provider's observed timing and response behavior.

## Billing reconciliation

The intended future model has two separate ledgers:

1. Local pessimistic Spend Guard: real-time admission and circuit breaking.
2. Cloudflare authoritative billable usage/analytics: delayed reconciliation and calibration from a
   separate read-only service/token.

Budget Alerts, webhooks, Workers KV, and delayed provider usage cannot replace Ledger A. A future
reconciler may make local estimates more conservative but must never lower a safety state merely
because delayed provider data currently reports less usage. The media Worker has no Cloudflare
account API token.

## CF0 media behavior and follow-up

Selective subscription remains intact: viewers discover publications without pulling media,
`Assistir` acquires a lease and pulls exactly one selected track, and stop-watching closes and
releases it.

Room state still polls about every 1.5 seconds and heartbeats every 10 seconds. This creates many
Worker control-plane requests but is not Realtime media egress accounting. CF0.2 should replace
polling with push/WebSocket room events.

CF0.2/CF1 must also preserve explicit watch intent, add Cloudflare simulcast and size-aware layer
selection, choose high layers for Focus/fullscreen when appropriate, avoid decoding/egress for
hidden or unwatched players, and remain PiP-aware. Publisher quality is not globally reduced by the
financial guard.

## Local development

Copy `apps/realtime/.dev.vars.example` to `.dev.vars`, use only a development Realtime App, set a
separate admin secret, and explicitly enable the client provider override for `/cf0`. Production
Realtime credentials must not be used for this spike.

## Official references

- [Realtime SFU Sessions and Tracks](https://developers.cloudflare.com/realtime/sfu/sessions-tracks/)
- [Realtime SFU pricing](https://developers.cloudflare.com/realtime/sfu/pricing/)
- [Durable Object storage consistency](https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/)
- [Workers Rate Limiting bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Cloudflare billing cycles](https://developers.cloudflare.com/billing/understand/how-billing-works/)

CF0's server gateway/push-pull patterns remain adapted from the Apache-2.0 Cloudflare Meet
reference recorded in `THIRD_PARTY_NOTICES.md`. CF0.1 did not add substantial third-party code.
