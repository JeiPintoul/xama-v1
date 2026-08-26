# Xama — Current Project State

Last updated: 2026-08-25

## Current Stage

Active implementation branch:

```text
spike/cloudflare-realtime
```

This active infrastructure work is isolated from production. `main` remains on the validated
LiveKit Quick Share implementation; the Cloudflare Realtime App and its control plane are not part
of the production path.

The LiveKit media core is working and has been validated in real rooms: realtime presence, multiple simultaneous screen shares, screen-share audio, Grid, Focus, browser fullscreen, independent per-share volume, desktop viewing, and mobile viewing.

QSB1.2 makes `Assistir` a real selective media subscription. Remote screen-share publications remain visible while their video and screen-share audio are unsubscribed; watching subscribes only the chosen share, and stopping watching unsubscribes and detaches it. LiveKit uses SDK video attachment with adaptive stream/background video pausing and dynacast.

QSB1.3 separates watching from presentation: `Assistir` opens a bounded inline player, Focus is an explicit fixed viewport overlay, browser fullscreen remains separate, and supported remote video can enter native Picture-in-Picture without resubscribing. Available shares use compact rows. Per-share volume is reapplied after resubscription, mute restores each share's last audible level, and the persisted provider-neutral publishing choice targets either 720p30 Balanced or 1080p30 High with simulcast. Focus retains best-effort Screen Wake Lock, and development builds include a compact Xama-styled on-demand diagnostics popover.

QSB1.4 supports watching any number of active shares together. Each watched remote share is independently subscribed, rendered, controlled, represented in viewer presence, and stopped without affecting the others; local preview can remain alongside remote players. Inline, Focus, fullscreen, PiP, volume/mute, and development diagnostics are per player, while only one player may occupy Xama Focus. All media overlays now auto-hide after inactivity, including DEV controls, and the single speaker control supports hover/focus volume plus 5% mouse-wheel adjustment. Quick Share density and interaction feedback account for effective desktop viewports around 1536×864 without overriding display scaling.

The existing full Xama application shell, communities, channels, adaptive navigation, and favorites remain intact on their existing development routes. They are not the public beta entry point.

## Isolated Cloudflare Realtime Spike

The `spike/cloudflare-realtime` branch contains CF0 through CF0.1.1 infrastructure only. Production on
`main` remains on the validated LiveKit Quick Share path.

CF0 proves one Cloudflare screen publisher, discovery without automatic receipt, and one explicit
remote pull through a Worker plus room Durable Object. CF0.1 adds server-generated room-scoped media
capabilities, a strongly consistent singleton Spend Guard Durable Object, short-lived pull leases,
soft/hard/emergency budget states, explicit billing-cycle reset, server resource caps, Worker
control-plane rate limiting, strict origin configuration, an optional server-verified Turnstile
boundary, and an authenticated backend kill switch. CF0.1.1 hardens the one-pull/one-lease invariant,
reserves worst-case exposure before admission, retains accounting through failed provider closure,
adds a strongly consistent global Cloudflare Session cap, validates production configuration
fail-closed, and verifies Turnstile hostname/action during capability issuance.

Spend Guard estimates authorized pull egress pessimistically from lease duration at a configured
accounting envelope; it is not byte-exact Cloudflare billing and does not claim a provider-native
hard spending cap. Media still flows directly browser ↔ Cloudflare Realtime SFU. The current
polling/heartbeat control plane remains temporary; CF0.2 should move room discovery to push events
and add simulcast/layer efficiency without changing LiveKit production.

## Public-Test Path: Quick Share Beta (QSB1)

```text
/
→ Quick Share landing

/r/:code
→ dedicated Quick Share room
```

Quick Share is the current public-test experience: create a temporary room, share its code/link, then join to watch or publish screens. It has no community/channel shell, authentication, room history, or database-backed rooms.

The landing is the single Quick Share entry surface. Joining validates the temporary room and completes the media-session connection before navigating; invalid or expired codes remain inline on the landing. Direct `/r/:code` visits without a matching active session return to `/?room=:code` so the shared code stays prefilled without connecting automatically.

The `quick-room` Supabase Edge Function generates an 8-character code from an unambiguous alphabet, maps it to an ephemeral `quick:` LiveKit room, explicitly creates that room, and issues short-lived join/publish/subscribe tokens. Quick Rooms use a 10-minute empty timeout, 60-second departure timeout, and 12-participant limit. LiveKit credentials stay server-side.

Existing mock-community voice routes and the original access-gated token endpoint remain available only for development. They are intentionally not the Quick Share flow.

## Safety and Capabilities

Quick Share intentionally has no account or shared alpha password for the friend-group beta. Before broad public distribution, add server-side rate limiting, Cloudflare Turnstile (or equivalent), and further room-creation controls if needed.

Mobile web viewers can join, watch, use Grid/Focus/fullscreen, and control supported remote-share volume. Publishing is capability-dependent and commonly unsupported on mobile browsers, so the UI explains this instead of attempting a failing capture. Desktop Chromium remains the primary publishing target.

Remote-share volume remains 0–100%. The future optional >100% direction remains a Web Audio gain stage with limiting/compression, never a publisher-side volume change.

## Deployment Contract

Deploy `supabase/functions/quick-room` with existing server-side `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`, then configure:

```text
VITE_QUICK_ROOM_ENDPOINT=https://your-project.supabase.co/functions/v1/quick-room
```

Do not expose credentials or commit a user-local Quick Tunnel hostname. Tunnel host allowance is handled outside source control with `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS`.

## Next Action

Validate the CF0.1.1 cost-control paths without production credentials or meaningful media traffic,
then perform the real A/B selective-subscription and emergency-stop check using only the development
Realtime App. CF0.2 push coordination and bandwidth-efficiency work starts only after that financial
safety validation. The separate QSB1.4 LiveKit HTTPS validation remains applicable to the production
media path, but it is not the active infrastructure branch's next action.
