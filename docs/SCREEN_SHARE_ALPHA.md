# Xama — Screen Share Alpha

## QSB1 — Quick Share Beta

Quick Share is the current public-test path:

```text
/
→ create a temporary room or enter a code

/r/:code
→ dedicated sharing/viewing surface
```

The existing full Xama application shell, communities, channels, adaptive navigation, and favorites remain intact on their existing routes for continued development. Quick Share deliberately does not show that shell.

Quick Rooms use server-generated 8-character codes from an unambiguous alphabet, mapped to `quick:` LiveKit room names. The `quick-room` Supabase Edge Function explicitly creates rooms with a 10-minute empty timeout, 60-second departure timeout, and 12-person limit, then returns a short-lived join/publish/subscribe token. Rooms are not persisted in the database; an expired code safely fails to join.

The Quick Share landing owns both creation and validated joining. Room routes render only an already connecting/connected matching session; direct links return to the landing with the room code prefilled, and failed or expired joins stay there with an inline error.

QSB1 is account-free for the friend-group beta. Before broad public distribution, add server-side rate limiting, Cloudflare Turnstile or equivalent, and further creation controls if needed.

Mobile web joining and viewing remain supported where browsers allow it. Publishing is capability-dependent and commonly unsupported on mobile web, so Quick Share explains that viewers can still watch rather than attempting capture. Remote share volume remains independently controlled from 0–100%; the future >100% Web Audio gain/limiting direction remains unchanged.

Focused and browser-fullscreen viewing uses temporary, activity-revealed controls over the media rather than permanent bars. Screen-share capture requests `restrictOwnAudio` where browser capability reporting supports it, while falling back cleanly elsewhere.

### QSB1.2 — Quality and efficiency

Remote screen shares are represented from their publications before media subscription. `Assistir` subscribes only the selected screen-share video and optional screen-share audio; stopping watching unsubscribes and detaches both while viewer-presence signaling remains independent of frame delivery.

The LiveKit adapter owns provider tracks and SDK element attachment. Rooms use `adaptiveStream` with background video pausing and `dynacast`; publishing targets 1920×1080 at 30 FPS with the official LiveKit 1080p30 screen-share encoding, simulcast, and official 360p15/720p15 lower layers. Focus requests best-effort Screen Wake Lock, and development builds expose compact on-demand track diagnostics without production UI.

### QSB1.3 — Viewing controls and publishing quality

Watching and presentation are separate product states: available shares are compact unsubscribed rows, `Assistir` opens one bounded inline player, Focus explicitly moves that same player into a fixed viewport overlay, and native fullscreen or Picture-in-Picture do not alter subscription state. Leaving Focus returns inline; only the stop/X action unsubscribes video and audio.

Remote volume remains provider-neutral and per share. Stored volume is reapplied whenever screen-share audio is resubscribed, while mute restores that share's last non-zero level. The persisted publishing preference uses `balanced` or `high` product intent, translated inside LiveKit to the official 720p30 or 1080p30 screen-share presets with simulcast and suitable lower layers. The final capture-source picker remains browser-owned.

### QSB1.4 — Multi-watch and finalized media controls

A participant may watch multiple local or remote screen shares simultaneously. Watched shares form a responsive inline grid, and each remote share independently owns its selective video/audio subscription, volume, mute, PiP, diagnostics, and stop action. Focus and fullscreen select one player for presentation without unsubscribing the other watched players. Viewer presence represents the full watched set per participant and removes individual shares or disconnected viewers independently.

Every player uses one activity-driven media overlay in inline, Focus, and fullscreen modes. The overlay includes development-only diagnostics, stays visible while controls or popovers are active, and otherwise fades after inactivity. Desktop speaker hover/focus exposes the slider and mouse wheel changes that share by 5%; coarse-pointer layouts expose the slider directly without adding a second settings button. Responsive density follows the effective CSS viewport, including approximately 1536×864 at common Windows display scaling.

## Objective

Ship the smallest publicly usable version of Xama that validates the product's core value:

```text
open Xama
→ identify as a guest
→ choose an existing community/voice channel
→ join the real room
→ share a screen
→ watch other participants' screen shares
```

The goal is not to complete the full social platform before testing.

The goal is to let real friend groups use Xama for screen sharing as soon as possible.

---

## Product Scope

The alpha should reuse the existing Xama shell and mock community/channel navigation.

The media layer becomes real.

The alpha must support:

- temporary guest identity;
- joining/leaving a real LiveKit room from an existing voice channel;
- real participant presence;
- starting/stopping local screen sharing;
- viewing remote screen shares;
- multiple simultaneous screen shares in one room;
- responsive multi-stream layout;
- selecting one stream for focused viewing;
- returning from focus to the stream grid;
- screen-share audio where the browser/OS capture API provides it;
- basic connection/error states;
- public deployment behind a temporary alpha access gate.

Microphone voice is optional and must not delay usable screen sharing.

---

## Deliberate Non-Goals

Do not block this alpha on:

- text chat;
- Supabase Auth;
- persistent user accounts;
- database-backed communities;
- channel creation;
- persistent favorites;
- full invitations;
- roles/permissions engine;
- advanced moderation;
- notification system;
- cameras;
- file uploads;
- dashboard/Activity;
- plugin/customization system;
- native desktop/mobile clients;
- the final Focus/Mini/Hidden screen-share UX.

The existing mock communities and channels are acceptable for this alpha.

---

## Infrastructure

### Web client

Use the current React + Vite application.

Deploy the web client to Cloudflare Pages.

### Media

Use LiveKit Cloud.

Use official LiveKit client/React packages rather than implementing WebRTC signaling/media transport directly.

The application must keep LiveKit-specific behavior behind the existing media/provider architecture boundary.

### Token service

Use a minimal Supabase Edge Function to issue LiveKit participant tokens.

The Edge Function is the only Supabase capability required for the first alpha.

No database or Supabase Auth is required yet.

The following values are server-side secrets and must never be exposed to the browser:

```text
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
XAMA_ALPHA_CODE
```

The public LiveKit WebSocket URL may be exposed to the web client.

---

## Room Mapping

Existing mock voice channels map deterministically to LiveKit room names.

Prefer a stable provider-neutral helper rather than scattering string concatenation through the UI.

Conceptually:

```text
community: xama-lab
channel: lobby

→ xama-lab:lobby
```

The exact separator is an implementation detail, but room naming must be deterministic and safe.

Do not allow arbitrary client-supplied room names outside known alpha voice channels unless deliberately required later.

---

## Temporary Guest Identity

The first alpha does not require account creation.

On first entry, collect at least:

```text
Display name
Alpha access code
```

Create a random stable guest identity on the client and persist it locally.

Conceptually:

```text
guest id: UUID
name: João
```

The LiveKit participant identity must use the stable guest identifier rather than display name so duplicate display names are possible.

Display name may also be stored locally for convenience.

Do not treat local guest identity as authentication.

---

## Temporary Alpha Access Gate

The first deployment is intentionally private/limited.

The browser sends the user-provided alpha access code to the token endpoint.

The Edge Function compares it to the server-side `XAMA_ALPHA_CODE` secret before issuing a token.

Important:

- this is a temporary access gate, not production authentication;
- do not embed the expected access code in frontend source or public environment variables;
- return generic authentication failure responses;
- do not log the access code;
- scope issued LiveKit tokens to the requested known room and participant;
- keep token lifetime reasonably short.

This mechanism should be replaced by real application authentication later.

---

## Token Endpoint Contract

Keep the endpoint deliberately small.

Conceptual request:

```json
{
  "room": "xama-lab:lobby",
  "identity": "guest-uuid",
  "name": "João",
  "accessCode": "..."
}
```

Conceptual response:

```json
{
  "token": "...",
  "serverUrl": "wss://..."
}
```

Validate input at the trusted boundary.

Do not expose API secrets in the response.

The server should reject rooms that are not allowed by the current alpha room policy.

---

## Screen Sharing

Use LiveKit screen-share publishing rather than implementing raw `getDisplayMedia` transport.

The user must be able to:

```text
Share screen
Stop sharing
```

If the browser's native capture picker is cancelled or permission is denied, return the application to a stable non-sharing state and provide understandable feedback.

If the user stops sharing from browser-provided capture controls, Xama must detect the ended track and update UI state.

Do not force the user to watch a share automatically if the eventual implementation can preserve explicit viewing choice without unnecessary complexity.

For the first alpha, rendering active room shares in the room content surface is acceptable.

---

## Screen Share Audio

Request screen-share audio when appropriate.

Actual capture availability depends on browser, operating system, and the source selected in the browser's native screen-sharing picker.

The application must not claim that every source/browser can share system audio.

Primary publishing target for the first alpha:

```text
Chrome / Edge on desktop
```

Provide concise guidance when useful, for example that the user may need to enable audio in the browser's share picker.

Do not make unsupported screen-share audio block video sharing.

Viewer volume is local to each participant and screen share. Normal alpha volume ranges from 0% to
100%. A future optional boost above 100% should use a Web Audio gain/limiting stage, never alter the
publisher's audio.

---

## Multiple Simultaneous Shares

Multiple participants may share screens at the same time.

The UI must not assume only one active remote screen-share track exists.

Collect all relevant active screen-share tracks for the current room and render them dynamically.

Initial layout behavior:

```text
0 shares → empty room/share state
1 share  → large single tile
2 shares → two-up layout
3–4      → responsive grid
5+       → responsive grid/scroll that remains usable
```

Exact CSS geometry may evolve through testing.

Do not hardcode the application to a fixed participant count.

---

## Focused Stream

A user should be able to click/tap an active stream to enter a focused presentation.

Focused mode should:

- prioritize the selected stream;
- preserve access to basic room controls;
- allow returning to the multi-stream grid;
- not change the publishing state of any participant.

Do not implement draggable mini-player or the complete Focus/Mini/Hidden state model before the alpha is usable.

Those refinements may return after the core media capability is proven.

---

## Voice Channel UX

Existing voice-channel navigation currently behaves as route navigation only.

For the alpha, a voice-channel route becomes the room surface.

Before joining, show a simple room state with a clear action such as:

```text
Entrar na chamada
```

After joining, expose at least:

- connection state;
- participant count/list at a useful minimal level;
- share screen;
- stop sharing when active;
- leave room.

Do not introduce a large permanent bottom call toolbar.

Reuse the approved compact Xama interaction philosophy.

---

## Route and Media Lifetime

Joining a LiveKit room is media state, not merely route state.

For the first alpha, it is acceptable to leave the active room when the user explicitly selects another voice room if that keeps implementation simple.

However, do not tightly couple LiveKit objects to leaf presentation components in a way that prevents the previously approved future global voice-session behavior.

Keep the provider/session boundary capable of being lifted to application-global state later.

---

## Mobile

Mobile web remains part of Xama.

For the first Screen Share Alpha:

- joining and watching streams should remain usable on supported mobile browsers;
- the stream grid/focus UI must remain responsive;
- touch interactions must be usable;
- mobile publishing is best-effort and must not delay the desktop Chromium publishing target.

Do not redesign the whole mobile shell for this alpha.

---

## SS0 — Infrastructure Foundation

### Scope

- create/configure LiveKit Cloud project;
- create/configure Supabase project;
- implement token Edge Function;
- add required frontend LiveKit dependencies;
- add safe environment-variable contracts/examples;
- add provider/service boundary required for requesting tokens and connecting rooms.

### Acceptance

A local development client can obtain a valid scoped token without exposing LiveKit secrets.

No room UI is required beyond what is necessary to prove the token flow.

---

## SS1 — Real Room Connection

### Scope

- guest name/id flow;
- alpha access code input;
- map voice channel to room;
- join room;
- leave room;
- connection state;
- real participant presence.

### Acceptance

Two different browsers/devices can join the same selected Xama voice channel and see real participant presence through LiveKit.

---

## SS2 — Real Screen Share

### Scope

- start screen sharing;
- stop screen sharing;
- render active remote screen-share tracks;
- detect externally-ended capture;
- basic permission/cancellation errors;
- screen-share audio when available.

### Acceptance

Two different computers can join the same Xama room and one can watch the other's real shared screen through Xama.

This is the first major product-success checkpoint.

---

## SS3 — Multi-Stream + Focus

### Scope

- multiple simultaneous published shares;
- responsive stream grid;
- focus one stream;
- return to grid;
- cleanup when a share/participant disappears.

### Acceptance

At least three test participants can publish/consume multiple simultaneous shares and select which stream to focus without destabilizing the room.

---

## SS4 — Deployment

### Scope

- deploy web to Cloudflare Pages;
- deploy token function;
- configure production secrets/environment;
- verify HTTPS/browser permissions;
- test from separate networks/devices where practical.

### Acceptance

A friend can receive the public Xama URL and alpha access code, open Xama without local development tools, join the intended room, and participate in screen-share testing.

---

## SS5 — Minimum Hardening

### Scope

Address real alpha blockers only, especially:

- reconnection/disconnection UI;
- stale participant/share cleanup;
- duplicate/invalid requests;
- permission denial;
- share cancellation;
- token endpoint abuse basics;
- unsupported-browser guidance;
- mobile viewing regressions;
- critical accessibility regressions.

Do not expand this stage into general application polish.

---

## Testing Strategy

Tests should protect high-risk state behavior, not inflate coverage.

Prioritize:

- room-name mapping;
- token request validation where testable;
- guest identity persistence logic;
- media presentation state transformations;
- share cleanup behavior;
- meaningful UI regressions.

Do not mock the entire LiveKit implementation into a parallel fake application.

Use official SDK abstractions and test project-owned logic around the provider boundary.

Real multi-browser manual testing is required before public alpha use.

---

## Definition of Success

The Screen Share Alpha succeeds when this flow works from a public HTTPS URL:

```text
Friend A opens Xama
Friend B opens Xama
        ↓
both enter the alpha gate
        ↓
both navigate to the same voice channel
        ↓
both join the same LiveKit room
        ↓
Friend A shares a desktop/window/tab
        ↓
Friend B sees the live share
```

Stretch success:

```text
A, B, and C share simultaneously
        ↓
Xama displays multiple streams
        ↓
users can focus whichever stream they want
```

Everything else can follow after this core loop is proven.
