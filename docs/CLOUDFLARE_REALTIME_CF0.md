# CF0 — Cloudflare Realtime foundation

CF0 is an isolated infrastructure spike on `spike/cloudflare-realtime`. It does not replace the
working LiveKit Quick Share implementation and does not provide feature parity.

## Boundaries

`packages/media-core` contains only provider- and platform-neutral concepts: participant and
screen-share state, requested screen-share quality, watch intent, provider identifiers, provider
availability, a small room-level selection result, and a minimal performance signal. It contains no
React, DOM, browser WebRTC, LiveKit, Worker, Durable Object, or Cloudflare API types.

Browser capture, `RTCPeerConnection`, media-element attachment, and provider adapters remain in
`apps/web`. Cloudflare Session/Track request models remain in the Cloudflare web adapter and Worker
gateway. `apps/realtime` owns the deployable Worker, Durable Object coordinator, routing decision,
Cloudflare credentials, and Realtime SFU HTTPS calls.

## CF0 flow

The development surface is available at `/cf0` or becomes the root surface when
`VITE_MEDIA_PROVIDER=cloudflare`.

1. A browser joins an ephemeral room through the Worker.
2. The room Durable Object selects and pins the provider, creates one Cloudflare Realtime Session
   per participant, and stores only the minimum participant/track/subscription state.
3. A publisher captures one screen-video track, creates a browser offer, and asks the Worker to push
   the track through `tracks/new`.
4. Other browsers poll the neutral room registry and can see the published share without receiving
   its media.
5. `Assistir` explicitly asks the Worker to pull that one remote track. The browser answers the SFU
   offer through `renegotiate` and only then attaches received media.
6. Stopping watch calls `tracks/close` for the pull. Stopping publication closes the publisher track,
   removes it from discovery, and closes registered pulls.

The App Secret is read only by `apps/realtime`. It is never returned by the Worker and must never use
a `VITE_*` name.

## Provider routing

Provider selection is a room-level server decision. A selected room stays pinned for its lifetime;
health changes do not trigger cross-provider migration.

For a new room in `automatic` mode, the initial policy is deliberately small:

- eligible, healthy LiveKit is preferred;
- disabled, degraded, quota-exhausted, or budget-excluded LiveKit may fall back to Cloudflare;
- if neither provider is eligible, room creation fails clearly.

CF0 does not collect quota or budget data. The routing types reserve explicit exclusion reasons so a
later trusted backend signal can supply them without moving the decision into React. The
`VITE_MEDIA_PROVIDER` setting is only a development/test override; `automatic` remains a backend
policy concept.

## Performance and future P2P

P2P is not implemented. A future P2P candidate must consider topology and performance, not only
infrastructure cost. Relevant signals may include viewer count, required outbound bitrate, uplink
headroom, packet loss/RTT, encoder or CPU limits, dropped frames, and hardware-encoding availability.

Unknown or constrained device capacity must bias selection toward an SFU. Browser WebRTC statistics
may later provide runtime quality, CPU, and bandwidth evidence. Native desktop/mobile clients may
later provide richer hardware and encoder telemetry. No large hardware model is justified in CF0.

## Native-client split

- Web retains browser capture, browser WebRTC, PiP, and fullscreen.
- A future Desktop client may use native screen/game capture, native WebRTC bindings, and hardware
  encoder integration while sharing Xama provider-routing and protocol concepts.
- A future Mobile client may use Android MediaProjection, iOS ReplayKit (or equivalents), and native
  WebRTC while sharing the same backend/provider concepts.

`media-core` intentionally has no browser assumption so these clients do not inherit DOM contracts.

## CF1 gaps

CF0 deliberately leaves authentication/authorization, rate limiting, durable product persistence,
moderation, screen audio, sophisticated reconnect/resume, push-based room events, production TURN
policy, multi-track parity, and quota/budget collection for later work. Participant cleanup uses a
heartbeat plus a short stale timeout; room state is discarded after the empty-room lifetime.

## Local configuration

Copy `apps/realtime/.dev.vars.example` to `.dev.vars`, set the Realtime SFU App ID and App Secret,
then run `pnpm --filter @xama/realtime dev`. Configure the web app with:

```text
VITE_MEDIA_PROVIDER=cloudflare
VITE_REALTIME_ENDPOINT=http://localhost:8787
```

Open the same room in two browser profiles. Publish in A, verify B sees an available share without a
received track, select `Assistir`, verify playback, then stop watching and stop publication.
