import { selectMediaProvider, type MediaProviderMode } from '@xama/media-core';

import {
  CloudflareRealtimeGateway,
  type CloudflareSessionDescription,
  type CloudflareTracksResponse,
} from './cloudflare-realtime-gateway';
import {
  getResourceLimits,
  getRoutingSignals,
  isClientProviderOverrideAllowed,
  parseBoolean,
  resolveProviderMode,
  type RealtimeEnv,
} from './runtime-config';
import {
  getJoinLimitViolation,
  getPublicationLimitViolation,
  getPullLimitViolation,
  type ResourceLimitViolation,
} from './resource-policy';
import {
  RealtimeRoomState,
  type ProviderTrackClosure,
  type RealtimeParticipantState,
  type StoredRealtimeRoom,
} from './room-state';
import {
  constantTimeSecretEquals,
  createOpaqueCapability,
  hashSecret,
  participantOperations,
  readBearerCapability,
  type ParticipantOperation,
} from './security';
import {
  SpendGuard,
  SpendGuardRequestError,
  acquirePullLease,
  admitCloudflareSession,
  callSpendGuardAdmin,
  enforcePullLeases,
  getSpendGuardStatus,
  releasePullLease,
  renewPullLeases,
} from './spend-guard';
import { verifyCapabilityIssuance } from './turnstile';

export type Env = RealtimeEnv;

type JoinRequest = Readonly<{
  participantName: string;
  providerMode?: MediaProviderMode;
  turnstileToken?: string;
}>;

type RoomRoute = Readonly<{ roomId: string; action: string }>;

const roomStorageKey = 'room';
const pendingClosuresStorageKey = 'pending-provider-closures';
const participantIdleMilliseconds = 30_000;
const capabilityLifetimeMilliseconds = 60_000;
const activeAlarmMilliseconds = 15_000;
const emptyRoomLifetimeMilliseconds = 10 * 60_000;

class ApplicationError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function json(payload: unknown, status = 200): Response {
  return Response.json(payload, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSessionDescription(value: unknown): value is CloudflareSessionDescription {
  return (
    isRecord(value) &&
    (value.type === 'offer' || value.type === 'answer') &&
    typeof value.sdp === 'string' &&
    value.sdp.length > 0
  );
}

function isSafeIdentifier(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

function isProviderMode(value: unknown): value is MediaProviderMode {
  return value === 'automatic' || value === 'livekit' || value === 'cloudflare';
}

function parseJoinRequest(value: unknown): JoinRequest | null {
  if (!isRecord(value)) return null;
  const participantName =
    typeof value.participantName === 'string' ? value.participantName.trim() : '';
  if (
    participantName.length < 1 ||
    participantName.length > 64 ||
    (value.providerMode !== undefined && !isProviderMode(value.providerMode)) ||
    (value.turnstileToken !== undefined &&
      (typeof value.turnstileToken !== 'string' || value.turnstileToken.length > 2_048))
  ) {
    return null;
  }
  return {
    participantName,
    ...(isProviderMode(value.providerMode) ? { providerMode: value.providerMode } : {}),
    ...(typeof value.turnstileToken === 'string' ? { turnstileToken: value.turnstileToken } : {}),
  };
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function getRoomRoute(pathname: string): RoomRoute | null {
  const segments = pathname.split('/').filter(Boolean);
  return segments[0] === 'rooms' && isSafeIdentifier(segments[1]) && typeof segments[2] === 'string'
    ? { roomId: segments[1], action: segments[2] }
    : null;
}

function configuredOrigins(env: Env): readonly string[] {
  return (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0 && origin !== '*');
}

function validateCorsConfiguration(env: Env): ApplicationError | null {
  const development = env.ENVIRONMENT === 'development';
  const cloudflareEnabled = parseBoolean(env.CLOUDFLARE_ENABLED, true);
  if (!development && cloudflareEnabled && configuredOrigins(env).length === 0) {
    return new ApplicationError(
      503,
      'cors-not-configured',
      'Realtime access is unavailable because allowed origins are not configured.',
    );
  }
  return null;
}

function isOriginAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  const origins = configuredOrigins(env);
  if (origins.includes(origin)) return true;
  return (
    env.ENVIRONMENT === 'development' &&
    (origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173')
  );
}

function withCors(response: Response, request: Request, env: Env): Response {
  const requestOrigin = request.headers.get('Origin');
  const headers = new Headers(response.headers);
  if (requestOrigin && isOriginAllowed(request, env)) {
    headers.set('Access-Control-Allow-Origin', requestOrigin);
  }
  headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Vary', 'Origin');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function toErrorResponse(error: unknown): Response {
  if (error instanceof ApplicationError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
  if (error instanceof SpendGuardRequestError) {
    return json({ error: error.message, code: 'spend-guard-request' }, error.status);
  }
  return json({ error: 'The realtime operation could not be completed.' }, 502);
}

function throwLimitViolation(violation: ResourceLimitViolation | null): void {
  if (violation) throw new ApplicationError(violation.status, violation.code, violation.message);
}

async function requireAdmin(request: Request, env: Env): Promise<void> {
  const expectedSecret = env.REALTIME_ADMIN_SECRET;
  const suppliedSecret = readBearerCapability(request);
  if (!expectedSecret) {
    throw new ApplicationError(
      503,
      'admin-not-configured',
      'Spend Guard administration is unavailable.',
    );
  }
  if (!suppliedSecret || !(await constantTimeSecretEquals(suppliedSecret, expectedSecret))) {
    throw new ApplicationError(401, 'unauthorized', 'Administrator authorization is required.');
  }
}

async function handleAdminRequest(request: Request, env: Env): Promise<Response> {
  await requireAdmin(request, env);
  const path = new URL(request.url).pathname;
  if (request.method === 'GET' && path === '/admin/spend-guard') {
    return json(await getSpendGuardStatus(env));
  }
  const payload = await readJson(request);
  if (!isRecord(payload))
    throw new ApplicationError(400, 'invalid-request', 'Invalid admin request.');
  if (request.method === 'POST' && path === '/admin/spend-guard/emergency-stop') {
    if (typeof payload.enabled !== 'boolean') {
      throw new ApplicationError(400, 'invalid-request', 'An enabled boolean is required.');
    }
    return json(await callSpendGuardAdmin(env, '/admin/emergency-stop', payload));
  }
  if (request.method === 'POST' && path === '/admin/spend-guard/enabled') {
    if (typeof payload.enabled !== 'boolean') {
      throw new ApplicationError(400, 'invalid-request', 'An enabled boolean is required.');
    }
    return json(await callSpendGuardAdmin(env, '/admin/enabled', payload));
  }
  if (request.method === 'POST' && path === '/admin/spend-guard/cycle') {
    if (
      typeof payload.cycleId !== 'string' ||
      payload.cycleId.trim().length === 0 ||
      typeof payload.startedAt !== 'string' ||
      payload.startedAt.trim().length === 0
    ) {
      throw new ApplicationError(
        400,
        'invalid-request',
        'An explicit cycle ID and start are required.',
      );
    }
    return json(await callSpendGuardAdmin(env, '/admin/cycle', payload));
  }
  throw new ApplicationError(404, 'not-found', 'Not found.');
}

async function applyControlPlaneRateLimit(
  request: Request,
  route: RoomRoute,
  env: Env,
): Promise<void> {
  if (route.action === 'join') {
    const key = request.headers.get('CF-Connecting-IP') ?? 'local-development';
    const decision = await env.JOIN_RATE_LIMITER?.limit({ key: `join:${key}` });
    if (decision && !decision.success) {
      throw new ApplicationError(429, 'rate-limited', 'Too many join attempts. Try again shortly.');
    }
    return;
  }
  const capability = readBearerCapability(request);
  const fallback = request.headers.get('CF-Connecting-IP') ?? 'local-development';
  const key = capability ? await hashSecret(capability) : `invalid:${fallback}`;
  const decision = await env.CONTROL_RATE_LIMITER?.limit({ key: `control:${key}` });
  if (decision && !decision.success) {
    throw new ApplicationError(429, 'rate-limited', 'Too many realtime control requests.');
  }
}

export class RoomCoordinator {
  private room: RealtimeRoomState | null = null;
  private pendingClosures: ProviderTrackClosure[] = [];
  private readonly ready: Promise<void>;

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {
    this.ready = state.blockConcurrencyWhile(async () => {
      const [storedRoom, storedClosures] = await Promise.all([
        state.storage.get<StoredRealtimeRoom>(roomStorageKey),
        state.storage.get<readonly ProviderTrackClosure[]>(pendingClosuresStorageKey),
      ]);
      if (storedRoom) this.room = new RealtimeRoomState(storedRoom.roomId, storedRoom);
      this.pendingClosures = [...(storedClosures ?? [])];
    });
  }

  async fetch(request: Request): Promise<Response> {
    await this.ready;
    const route = getRoomRoute(new URL(request.url).pathname);
    if (!route) return json({ error: 'Invalid room.' }, 400);

    try {
      if (request.method === 'POST' && route.action === 'join') {
        return await this.join(route.roomId, request);
      }
      if (request.method === 'GET' && route.action === 'state') {
        return await this.getRoom(route.roomId, request);
      }
      if (request.method === 'POST' && route.action === 'heartbeat') {
        return await this.heartbeat(route.roomId, request);
      }
      if (request.method === 'POST' && route.action === 'publish') {
        return await this.publish(route.roomId, request);
      }
      if (request.method === 'POST' && route.action === 'stop-publishing') {
        return await this.stopPublishing(route.roomId, request);
      }
      if (request.method === 'POST' && route.action === 'subscribe') {
        return await this.subscribe(route.roomId, request);
      }
      if (request.method === 'POST' && route.action === 'unsubscribe') {
        return await this.unsubscribe(route.roomId, request);
      }
      if (request.method === 'POST' && route.action === 'renegotiate') {
        return await this.renegotiate(route.roomId, request);
      }
      if (request.method === 'POST' && route.action === 'leave') {
        return await this.leave(route.roomId, request);
      }
      return json({ error: 'Not found.' }, 404);
    } catch (error) {
      return toErrorResponse(error);
    }
  }

  async alarm(): Promise<void> {
    await this.ready;
    if (this.pendingClosures.length > 0) await this.closeProviderTracks([]);
    if (!this.room) return;

    const allLeaseIds = this.room.getAllLeaseIds();
    if (this.room.provider === 'cloudflare' && allLeaseIds.length > 0) {
      let revokedLeaseIds: readonly string[];
      try {
        ({ revokedLeaseIds } = await enforcePullLeases(this.env, allLeaseIds));
      } catch {
        revokedLeaseIds = allLeaseIds;
      }
      if (revokedLeaseIds.length > 0) {
        const closures = this.room.removeSubscriptionsByLeaseIds(revokedLeaseIds);
        await this.persistRoom();
        await this.closeProviderTracks(closures);
      }
    }

    const now = Date.now();
    for (const participantId of this.room.getStaleParticipantIds(
      now,
      participantIdleMilliseconds,
    )) {
      await this.removeParticipant(participantId);
    }
    if (this.room.participantCount === 0 && this.pendingClosures.length === 0) {
      await this.state.storage.deleteAll();
      this.room = null;
      return;
    }
    await this.persistRoom();
    await this.scheduleAlarm();
  }

  private async join(roomId: string, request: Request): Promise<Response> {
    const joinRequest = parseJoinRequest(await readJson(request));
    if (!joinRequest) throw new ApplicationError(400, 'invalid-request', 'Invalid join request.');
    const verification = await verifyCapabilityIssuance(
      joinRequest.turnstileToken,
      request,
      this.env,
    );
    if (verification === 'unavailable') {
      throw new ApplicationError(
        503,
        'verification-unavailable',
        'Human verification is required but unavailable.',
      );
    }
    if (verification !== 'allowed') {
      throw new ApplicationError(403, 'verification-required', 'Human verification is required.');
    }

    const room = this.getOrCreateRoom(roomId);
    const limits = getResourceLimits(this.env);
    throwLimitViolation(getJoinLimitViolation(room, limits));

    const spendStatus = await getSpendGuardStatus(this.env);
    const mode = resolveProviderMode(
      joinRequest.providerMode,
      isClientProviderOverrideAllowed(this.env),
    );
    const selection = selectMediaProvider({
      mode,
      existingProvider: room.provider ?? undefined,
      providers: getRoutingSignals(this.env, spendStatus.cloudflareExcludedForNewRooms),
    });
    if (selection.status === 'unavailable') {
      throw new ApplicationError(
        503,
        'provider-unavailable',
        'The requested media provider is unavailable.',
      );
    }

    const participantId = crypto.randomUUID();
    let realtimeSessionId: string | null = null;
    if (selection.provider === 'cloudflare') {
      this.requireCloudflareEnabled();
      const admission = await admitCloudflareSession(this.env);
      if (!admission.allowed) {
        throw new ApplicationError(
          503,
          'media-budget-unavailable',
          'Media admission is disabled by budget controls.',
        );
      }
      realtimeSessionId = await this.getGateway().createSession(`${roomId}:${participantId}`);
    }

    const capability = createOpaqueCapability();
    const now = Date.now();
    const capabilityExpiresAt = now + capabilityLifetimeMilliseconds;
    room.assignProvider(selection.provider);
    room.addParticipant({
      id: participantId,
      name: joinRequest.participantName,
      realtimeSessionId,
      capabilityHash: await hashSecret(capability),
      capabilityExpiresAt,
      allowedOperations: participantOperations,
      lastSeenAt: now,
    });
    await this.persistRoom();
    await this.scheduleAlarm();
    return json({
      provider: selection.provider,
      selectionReason: selection.reason,
      participantId,
      capability,
      capabilityExpiresAt,
      room: room.toPublicRoom(),
    });
  }

  private async getRoom(roomId: string, request: Request): Promise<Response> {
    const { room } = await this.authorize(roomId, request, 'state');
    return json({ room: room.toPublicRoom() });
  }

  private async heartbeat(roomId: string, request: Request): Promise<Response> {
    const { room, participant } = await this.authorize(roomId, request, 'heartbeat');
    const now = Date.now();
    const capabilityExpiresAt = now + capabilityLifetimeMilliseconds;
    const leaseIds = room.getParticipantLeaseIds(participant.id);
    if (room.provider === 'cloudflare' && leaseIds.length > 0) {
      let revokedLeaseIds: readonly string[];
      try {
        ({ revokedLeaseIds } = await renewPullLeases(this.env, roomId, participant.id, leaseIds));
      } catch {
        revokedLeaseIds = leaseIds;
      }
      if (revokedLeaseIds.length > 0) {
        const closures = room.removeSubscriptionsByLeaseIds(revokedLeaseIds);
        await this.persistRoom();
        await this.closeProviderTracks(closures);
      }
    }
    room.touchParticipant(participant.id, now, capabilityExpiresAt);
    await this.persistRoom();
    return json({ ok: true, capabilityExpiresAt });
  }

  private async publish(roomId: string, request: Request): Promise<Response> {
    const { room, participant } = await this.authorizeCloudflare(roomId, request, 'publish', true);
    const payload = await readJson(request);
    if (
      !isRecord(payload) ||
      !isSafeIdentifier(payload.mid) ||
      !isSessionDescription(payload.sessionDescription)
    ) {
      throw new ApplicationError(400, 'invalid-request', 'Invalid publish request.');
    }
    const limits = getResourceLimits(this.env);
    throwLimitViolation(getPublicationLimitViolation(room, participant.id, limits));
    if (!participant.realtimeSessionId) {
      throw new ApplicationError(404, 'session-not-found', 'Participant media session not found.');
    }

    const screenShareId = crypto.randomUUID();
    const providerTrackName = `screen-${participant.id}-${screenShareId}`;
    const response = await this.getGateway().publishTrack(
      participant.realtimeSessionId,
      payload.sessionDescription,
      payload.mid,
      providerTrackName,
    );
    if (response.sessionDescription?.type !== 'answer') {
      throw new Error('Cloudflare Realtime did not answer the publish offer.');
    }
    room.addScreenShare({
      id: screenShareId,
      ownerParticipantId: participant.id,
      ownerName: participant.name,
      realtimeSessionId: participant.realtimeSessionId,
      providerTrackName,
      publisherMid: payload.mid,
    });
    await this.persistRoom();
    return json({ screenShareId, sessionDescription: response.sessionDescription });
  }

  private async stopPublishing(roomId: string, request: Request): Promise<Response> {
    const { room, participant } = await this.authorizeCloudflare(
      roomId,
      request,
      'stop-publishing',
      false,
    );
    const payload = await readJson(request);
    if (!isRecord(payload) || !isSafeIdentifier(payload.screenShareId)) {
      throw new ApplicationError(400, 'invalid-request', 'Invalid stop request.');
    }
    const screenShare = room.getScreenShare(payload.screenShareId);
    if (!screenShare || screenShare.ownerParticipantId !== participant.id) {
      throw new ApplicationError(404, 'screen-share-not-found', 'Screen share not found.');
    }
    const closures = room.removeScreenShare(payload.screenShareId);
    await this.persistRoom();
    await this.closeProviderTracks(closures);
    return json({ ok: true });
  }

  private async subscribe(roomId: string, request: Request): Promise<Response> {
    const { room, participant } = await this.authorizeCloudflare(
      roomId,
      request,
      'subscribe',
      false,
    );
    const payload = await readJson(request);
    if (!isRecord(payload) || !isSafeIdentifier(payload.screenShareId)) {
      throw new ApplicationError(400, 'invalid-request', 'Invalid subscribe request.');
    }
    const screenShare = room.getScreenShare(payload.screenShareId);
    if (!participant.realtimeSessionId || !screenShare) {
      throw new ApplicationError(404, 'media-not-found', 'Participant or screen share not found.');
    }
    if (screenShare.ownerParticipantId === participant.id) {
      throw new ApplicationError(
        400,
        'self-subscription',
        'A participant cannot pull its own screen share.',
      );
    }
    this.requireCloudflareEnabled();
    const limits = getResourceLimits(this.env);
    throwLimitViolation(getPullLimitViolation(room, participant.id, limits));

    const lease = await acquirePullLease(this.env, {
      roomId,
      participantId: participant.id,
      screenShareId: screenShare.id,
    });
    if (!lease.allowed) {
      const status = lease.reason === 'global-pull-cap' ? 429 : 503;
      throw new ApplicationError(
        status,
        lease.reason === 'global-pull-cap' ? 'media-capacity' : 'media-budget-unavailable',
        'The remote pull was denied by capacity controls.',
      );
    }

    try {
      const response = await this.getGateway().pullTrack(
        participant.realtimeSessionId,
        screenShare.realtimeSessionId,
        screenShare.providerTrackName,
      );
      const remoteTrack = response.tracks[0];
      if (response.sessionDescription?.type !== 'offer' || !remoteTrack?.mid) {
        throw new Error('Cloudflare Realtime did not offer the requested track.');
      }
      room.addSubscription(participant.id, screenShare.id, {
        mid: remoteTrack.mid,
        leaseId: lease.leaseId,
      });
      await this.persistRoom();
      return json({
        screenShareId: screenShare.id,
        mid: remoteTrack.mid,
        sessionDescription: response.sessionDescription,
        requiresImmediateRenegotiation: response.requiresImmediateRenegotiation ?? true,
      });
    } catch (error) {
      await releasePullLease(this.env, lease.leaseId).catch(() => undefined);
      throw error;
    }
  }

  private async unsubscribe(roomId: string, request: Request): Promise<Response> {
    const { room, participant } = await this.authorizeCloudflare(
      roomId,
      request,
      'unsubscribe',
      false,
    );
    const payload = await readJson(request);
    if (!isRecord(payload) || !isSafeIdentifier(payload.screenShareId)) {
      throw new ApplicationError(400, 'invalid-request', 'Invalid unsubscribe request.');
    }
    const closures = room.removeSubscription(participant.id, payload.screenShareId);
    await this.persistRoom();
    let response: CloudflareTracksResponse | undefined;
    if (closures[0]) {
      response = await this.closeProviderTracks(closures);
    }
    return json({ ok: true, sessionDescription: response?.sessionDescription });
  }

  private async renegotiate(roomId: string, request: Request): Promise<Response> {
    const { participant } = await this.authorizeCloudflare(roomId, request, 'renegotiate', true);
    const payload = await readJson(request);
    if (!isRecord(payload) || !isSessionDescription(payload.sessionDescription)) {
      throw new ApplicationError(400, 'invalid-request', 'Invalid renegotiation request.');
    }
    if (!participant.realtimeSessionId) {
      throw new ApplicationError(404, 'session-not-found', 'Participant media session not found.');
    }
    await this.getGateway().renegotiate(participant.realtimeSessionId, payload.sessionDescription);
    return json({ ok: true });
  }

  private async leave(roomId: string, request: Request): Promise<Response> {
    const { participant } = await this.authorize(roomId, request, 'leave');
    await this.removeParticipant(participant.id);
    await this.persistRoom();
    await this.scheduleAlarm();
    return json({ ok: true });
  }

  private getOrCreateRoom(roomId: string): RealtimeRoomState {
    if (this.room && this.room.roomId !== roomId) throw new Error('Room identifier mismatch.');
    this.room ??= new RealtimeRoomState(roomId);
    return this.room;
  }

  private requireRoom(roomId: string): RealtimeRoomState {
    if (!this.room || this.room.roomId !== roomId || !this.room.provider) {
      throw new ApplicationError(404, 'room-not-found', 'Room not found.');
    }
    return this.room;
  }

  private async authorize(
    roomId: string,
    request: Request,
    operation: ParticipantOperation,
  ): Promise<Readonly<{ room: RealtimeRoomState; participant: RealtimeParticipantState }>> {
    const room = this.requireRoom(roomId);
    const capability = readBearerCapability(request);
    if (!capability) {
      throw new ApplicationError(
        401,
        'capability-required',
        'A valid room capability is required.',
      );
    }
    const participant = room.authenticateCapability(
      await hashSecret(capability),
      operation,
      Date.now(),
    );
    if (!participant) {
      throw new ApplicationError(
        401,
        'capability-invalid',
        'The room capability is invalid or expired.',
      );
    }
    return { room, participant };
  }

  private async authorizeCloudflare(
    roomId: string,
    request: Request,
    operation: ParticipantOperation,
    denyWhenSpendGuardStopped: boolean,
  ): Promise<Readonly<{ room: RealtimeRoomState; participant: RealtimeParticipantState }>> {
    const authorized = await this.authorize(roomId, request, operation);
    if (authorized.room.provider !== 'cloudflare') {
      throw new ApplicationError(409, 'wrong-provider', 'Room is not assigned to Cloudflare.');
    }
    if (denyWhenSpendGuardStopped) {
      this.requireCloudflareEnabled();
      const status = await getSpendGuardStatus(this.env);
      if (!status.enabled || status.emergencyStop || status.hardLimitActive) {
        throw new ApplicationError(
          503,
          'media-budget-unavailable',
          'Media operations are disabled by budget controls.',
        );
      }
    }
    return authorized;
  }

  private requireCloudflareEnabled(): void {
    if (!parseBoolean(this.env.CLOUDFLARE_ENABLED, true)) {
      throw new ApplicationError(503, 'cloudflare-disabled', 'Cloudflare media is disabled.');
    }
  }

  private getGateway(): CloudflareRealtimeGateway {
    const appId = this.env.CLOUDFLARE_REALTIME_APP_ID;
    const appSecret = this.env.CLOUDFLARE_REALTIME_APP_SECRET;
    if (!appId || !appSecret) {
      throw new ApplicationError(
        503,
        'cloudflare-not-configured',
        'Cloudflare Realtime credentials are not configured.',
      );
    }
    return new CloudflareRealtimeGateway({ appId, appSecret });
  }

  private async removeParticipant(participantId: string): Promise<void> {
    if (!this.room) return;
    const closures = this.room.removeParticipant(participantId);
    await this.persistRoom();
    if (this.room.provider === 'cloudflare') await this.closeProviderTracks(closures);
  }

  private async closeProviderTracks(
    closures: readonly ProviderTrackClosure[],
  ): Promise<CloudflareTracksResponse | undefined> {
    for (const closure of closures) {
      if (
        !this.pendingClosures.some(
          (pending) => pending.sessionId === closure.sessionId && pending.mid === closure.mid,
        )
      ) {
        this.pendingClosures.push(closure);
      }
    }
    await this.persistClosures();
    if (this.pendingClosures.length === 0) return undefined;

    const gateway = this.getGateway();
    let requestedResponse: CloudflareTracksResponse | undefined;
    for (const closure of [...this.pendingClosures]) {
      try {
        const response = await gateway.closeTrack(closure.sessionId, closure.mid);
        if (
          closures.some(
            (requested) =>
              requested.sessionId === closure.sessionId && requested.mid === closure.mid,
          )
        ) {
          requestedResponse = response;
        }
        if (closure.leaseId) await releasePullLease(this.env, closure.leaseId);
        this.pendingClosures = this.pendingClosures.filter(
          (pending) => !(pending.sessionId === closure.sessionId && pending.mid === closure.mid),
        );
      } catch {
        continue;
      }
    }
    await this.persistClosures();
    return requestedResponse;
  }

  private async persistRoom(): Promise<void> {
    if (this.room) await this.state.storage.put(roomStorageKey, this.room.serialize());
  }

  private async persistClosures(): Promise<void> {
    if (this.pendingClosures.length > 0) {
      await this.state.storage.put(pendingClosuresStorageKey, this.pendingClosures);
    } else {
      await this.state.storage.delete(pendingClosuresStorageKey);
    }
  }

  private async scheduleAlarm(): Promise<void> {
    const delay =
      this.room?.participantCount || this.pendingClosures.length > 0
        ? activeAlarmMilliseconds
        : emptyRoomLifetimeMilliseconds;
    await this.state.storage.setAlarm(Date.now() + delay);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const path = new URL(request.url).pathname;
      if (path.startsWith('/admin/spend-guard')) return await handleAdminRequest(request, env);

      const corsError = validateCorsConfiguration(env);
      if (corsError) throw corsError;
      if (!isOriginAllowed(request, env)) {
        throw new ApplicationError(403, 'origin-not-allowed', 'This origin is not allowed.');
      }
      if (request.method === 'OPTIONS') {
        return withCors(new Response(null, { status: 204 }), request, env);
      }

      const route = getRoomRoute(path);
      if (!route) return withCors(json({ error: 'Not found.' }, 404), request, env);
      await applyControlPlaneRateLimit(request, route, env);
      const room = env.ROOMS.get(env.ROOMS.idFromName(route.roomId));
      return withCors(await room.fetch(request), request, env);
    } catch (error) {
      return withCors(toErrorResponse(error), request, env);
    }
  },
};

export { SpendGuard };
