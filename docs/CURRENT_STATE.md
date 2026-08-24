# Xama — Current Project State

Last updated: 2026-08-24

## Current Stage

Active implementation branch:

```text
alpha/screen-share
```

The LiveKit media core is working and has been validated in real rooms: realtime presence, multiple simultaneous screen shares, screen-share audio, Grid, Focus, browser fullscreen, independent per-share volume, desktop viewing, and mobile viewing.

The existing full Xama application shell, communities, channels, adaptive navigation, and favorites remain intact on their existing development routes. They are not the public beta entry point.

## Public-Test Path: Quick Share Beta (QSB1)

```text
/
→ Quick Share landing

/r/:code
→ dedicated Quick Share room
```

Quick Share is the current public-test experience: create a temporary room, share its code/link, then join to watch or publish screens. It has no community/channel shell, authentication, room history, or database-backed rooms.

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

Validate the Quick Share flow over HTTPS with two browsers/devices: create room, share its link, join, then publish two simultaneous shares.
