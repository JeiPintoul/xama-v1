import {
  selectMediaProvider,
  type MediaProviderMode,
  type MediaProviderRoutingSignal,
} from '@xama/media-core';

import {
  CloudflareRealtimeGateway,
  type CloudflareSessionDescription,
  type CloudflareTracksResponse,
} from './cloudflare-realtime-gateway';
import { RealtimeRoomState, type StoredRealtimeRoom } from './room-state';

export interface Env {
  ROOMS: DurableObjectNamespace;
  CLOUDFLARE_REALTIME_APP_ID?: string;
  CLOUDFLARE_REALTIME_APP_SECRET?: string;
  ALLOWED_ORIGIN?: string;
  LIVEKIT_ENABLED?: string;
  LIVEKIT_HEALTH?: string;
  CLOUDFLARE_ENABLED?: string;
  CLOUDFLARE_HEALTH?: string;
}

type JoinRequest = Readonly<{
  participantId: string;
  participantName: string;
  providerMode: MediaProviderMode;
}>;

const roomStorageKey = 'room';
const participantIdleMilliseconds = 30_000;
const activeAlarmMilliseconds = 15_000;
const emptyRoomLifetimeMilliseconds = 10 * 60_000;

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
    !isSafeIdentifier(value.participantId) ||
    participantName.length < 1 ||
    participantName.length > 64 ||
    !isProviderMode(value.providerMode)
  ) {
    return null;
  }
  return {
    participantId: value.participantId,
    participantName,
    providerMode: value.providerMode,
  };
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

function parseHealth(value: string | undefined): 'healthy' | 'degraded' | 'unknown' {
  return value === 'degraded' || value === 'unknown' ? value : 'healthy';
}

function getRoutingSignals(env: Env): readonly MediaProviderRoutingSignal[] {
  const livekitEnabled = parseBoolean(env.LIVEKIT_ENABLED, true);
  const cloudflareEnabled = parseBoolean(env.CLOUDFLARE_ENABLED, true);
  return [
    {
      provider: 'livekit',
      enabled: livekitEnabled,
      health: parseHealth(env.LIVEKIT_HEALTH),
      exclusions: livekitEnabled ? [] : ['disabled'],
    },
    {
      provider: 'cloudflare',
      enabled: cloudflareEnabled,
      health: parseHealth(env.CLOUDFLARE_HEALTH),
      exclusions: cloudflareEnabled ? [] : ['disabled'],
    },
  ];
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function getRoomId(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  return segments[0] === 'rooms' && isSafeIdentifier(segments[1]) ? segments[1] : null;
}

function withCors(response: Response, request: Request, env: Env): Response {
  const requestOrigin = request.headers.get('Origin');
  const configuredOrigin = env.ALLOWED_ORIGIN?.trim();
  const allowedOrigin =
    !configuredOrigin || configuredOrigin === '*'
      ? '*'
      : requestOrigin === configuredOrigin
        ? configuredOrigin
        : null;
  const headers = new Headers(response.headers);
  if (allowedOrigin) headers.set('Access-Control-Allow-Origin', allowedOrigin);
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Vary', 'Origin');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export class RoomCoordinator {
  private readonly state: DurableObjectState;
  private readonly env: Env;
  private room: RealtimeRoomState | null = null;
  private readonly ready: Promise<void>;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.ready = state.blockConcurrencyWhile(async () => {
      const stored = await state.storage.get<StoredRealtimeRoom>(roomStorageKey);
      if (stored) this.room = new RealtimeRoomState(stored.roomId, stored);
    });
  }

  async fetch(request: Request): Promise<Response> {
    await this.ready;
    const url = new URL(request.url);
    const roomId = getRoomId(url.pathname);
    if (!roomId) return json({ error: 'Invalid room.' }, 400);
    const segments = url.pathname.split('/').filter(Boolean);
    const action = segments[2];

    try {
      if (request.method === 'POST' && action === 'join') return await this.join(roomId, request);
      if (request.method === 'GET' && action === 'state') return this.getRoom(roomId);
      if (request.method === 'POST' && action === 'heartbeat') {
        return await this.heartbeat(roomId, request);
      }
      if (request.method === 'POST' && action === 'publish') {
        return await this.publish(roomId, request);
      }
      if (request.method === 'POST' && action === 'stop-publishing') {
        return await this.stopPublishing(roomId, request);
      }
      if (request.method === 'POST' && action === 'subscribe') {
        return await this.subscribe(roomId, request);
      }
      if (request.method === 'POST' && action === 'unsubscribe') {
        return await this.unsubscribe(roomId, request);
      }
      if (request.method === 'POST' && action === 'renegotiate') {
        return await this.renegotiate(roomId, request);
      }
      if (request.method === 'POST' && action === 'leave') return await this.leave(roomId, request);
      return json({ error: 'Not found.' }, 404);
    } catch {
      return json({ error: 'The realtime operation could not be completed.' }, 502);
    }
  }

  async alarm(): Promise<void> {
    await this.ready;
    if (!this.room) return;
    const now = Date.now();
    for (const participantId of this.room.getStaleParticipantIds(
      now,
      participantIdleMilliseconds,
    )) {
      await this.removeParticipant(participantId);
    }
    if (this.room.participantCount === 0) {
      await this.state.storage.deleteAll();
      this.room = null;
      return;
    }
    await this.persist();
    await this.scheduleAlarm();
  }

  private async join(roomId: string, request: Request): Promise<Response> {
    const joinRequest = parseJoinRequest(await readJson(request));
    if (!joinRequest) return json({ error: 'Invalid join request.' }, 400);
    const room = this.getOrCreateRoom(roomId);
    const selection = selectMediaProvider({
      mode: joinRequest.providerMode,
      existingProvider: room.provider ?? undefined,
      providers: getRoutingSignals(this.env),
    });
    if (selection.status === 'unavailable') {
      return json({ error: 'The requested media provider is unavailable.' }, 503);
    }

    if (room.getParticipant(joinRequest.participantId)) {
      await this.removeParticipant(joinRequest.participantId);
    }

    let realtimeSessionId: string | null = null;
    if (selection.provider === 'cloudflare') {
      realtimeSessionId = await this.getGateway().createSession(
        `${roomId}:${joinRequest.participantId}`,
      );
    }
    room.assignProvider(selection.provider);
    room.addParticipant(
      joinRequest.participantId,
      joinRequest.participantName,
      realtimeSessionId,
      Date.now(),
    );
    await this.persist();
    await this.scheduleAlarm();
    return json({
      provider: selection.provider,
      selectionReason: selection.reason,
      room: room.toPublicRoom(),
    });
  }

  private getRoom(roomId: string): Response {
    if (!this.room || this.room.roomId !== roomId || !this.room.provider) {
      return json({ error: 'Room not found.' }, 404);
    }
    return json({ room: this.room.toPublicRoom() });
  }

  private async heartbeat(roomId: string, request: Request): Promise<Response> {
    const room = this.requireRoom(roomId);
    const payload = await readJson(request);
    if (!isRecord(payload) || !isSafeIdentifier(payload.participantId)) {
      return json({ error: 'Invalid heartbeat.' }, 400);
    }
    if (!room.touchParticipant(payload.participantId, Date.now())) {
      return json({ error: 'Participant not found.' }, 404);
    }
    await this.persist();
    return json({ ok: true });
  }

  private async publish(roomId: string, request: Request): Promise<Response> {
    const room = this.requireCloudflareRoom(roomId);
    const payload = await readJson(request);
    if (
      !isRecord(payload) ||
      !isSafeIdentifier(payload.participantId) ||
      !isSafeIdentifier(payload.mid) ||
      !isSessionDescription(payload.sessionDescription)
    ) {
      return json({ error: 'Invalid publish request.' }, 400);
    }
    const participant = room.getParticipant(payload.participantId);
    if (!participant?.realtimeSessionId) return json({ error: 'Participant not found.' }, 404);

    const screenShareId = crypto.randomUUID();
    const providerTrackName = `screen-${payload.participantId}-${screenShareId}`;
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
    await this.persist();
    return json({ screenShareId, sessionDescription: response.sessionDescription });
  }

  private async stopPublishing(roomId: string, request: Request): Promise<Response> {
    const room = this.requireCloudflareRoom(roomId);
    const payload = await readJson(request);
    if (
      !isRecord(payload) ||
      !isSafeIdentifier(payload.participantId) ||
      !isSafeIdentifier(payload.screenShareId)
    ) {
      return json({ error: 'Invalid stop request.' }, 400);
    }
    const screenShare = room.getScreenShare(payload.screenShareId);
    if (!screenShare || screenShare.ownerParticipantId !== payload.participantId) {
      return json({ error: 'Screen share not found.' }, 404);
    }
    const closures = room.removeScreenShare(payload.screenShareId);
    await this.persist();
    await this.closeProviderTracks(closures);
    return json({ ok: true });
  }

  private async subscribe(roomId: string, request: Request): Promise<Response> {
    const room = this.requireCloudflareRoom(roomId);
    const payload = await readJson(request);
    if (
      !isRecord(payload) ||
      !isSafeIdentifier(payload.participantId) ||
      !isSafeIdentifier(payload.screenShareId)
    ) {
      return json({ error: 'Invalid subscribe request.' }, 400);
    }
    const participant = room.getParticipant(payload.participantId);
    const screenShare = room.getScreenShare(payload.screenShareId);
    if (!participant?.realtimeSessionId || !screenShare) {
      return json({ error: 'Participant or screen share not found.' }, 404);
    }
    if (screenShare.ownerParticipantId === participant.id) {
      return json({ error: 'A participant cannot pull its own screen share.' }, 400);
    }

    const response = await this.getGateway().pullTrack(
      participant.realtimeSessionId,
      screenShare.realtimeSessionId,
      screenShare.providerTrackName,
    );
    const remoteTrack = response.tracks[0];
    if (response.sessionDescription?.type !== 'offer' || !remoteTrack?.mid) {
      throw new Error('Cloudflare Realtime did not offer the requested track.');
    }
    room.addSubscription(participant.id, screenShare.id, remoteTrack.mid);
    await this.persist();
    return json({
      screenShareId: screenShare.id,
      mid: remoteTrack.mid,
      sessionDescription: response.sessionDescription,
      requiresImmediateRenegotiation: response.requiresImmediateRenegotiation ?? true,
    });
  }

  private async unsubscribe(roomId: string, request: Request): Promise<Response> {
    const room = this.requireCloudflareRoom(roomId);
    const payload = await readJson(request);
    if (
      !isRecord(payload) ||
      !isSafeIdentifier(payload.participantId) ||
      !isSafeIdentifier(payload.screenShareId)
    ) {
      return json({ error: 'Invalid unsubscribe request.' }, 400);
    }
    const closures = room.removeSubscription(payload.participantId, payload.screenShareId);
    await this.persist();
    let response: CloudflareTracksResponse | undefined;
    if (closures[0]) {
      response = await this.getGateway().closeTrack(closures[0].sessionId, closures[0].mid);
    }
    return json({ ok: true, sessionDescription: response?.sessionDescription });
  }

  private async renegotiate(roomId: string, request: Request): Promise<Response> {
    const room = this.requireCloudflareRoom(roomId);
    const payload = await readJson(request);
    if (
      !isRecord(payload) ||
      !isSafeIdentifier(payload.participantId) ||
      !isSessionDescription(payload.sessionDescription)
    ) {
      return json({ error: 'Invalid renegotiation request.' }, 400);
    }
    const participant = room.getParticipant(payload.participantId);
    if (!participant?.realtimeSessionId) return json({ error: 'Participant not found.' }, 404);
    await this.getGateway().renegotiate(participant.realtimeSessionId, payload.sessionDescription);
    return json({ ok: true });
  }

  private async leave(roomId: string, request: Request): Promise<Response> {
    this.requireRoom(roomId);
    const payload = await readJson(request);
    if (!isRecord(payload) || !isSafeIdentifier(payload.participantId)) {
      return json({ error: 'Invalid leave request.' }, 400);
    }
    await this.removeParticipant(payload.participantId);
    await this.persist();
    await this.scheduleAlarm();
    return json({ ok: true });
  }

  private getOrCreateRoom(roomId: string): RealtimeRoomState {
    if (this.room && this.room.roomId !== roomId) throw new Error('Room identifier mismatch.');
    this.room ??= new RealtimeRoomState(roomId);
    return this.room;
  }

  private requireRoom(roomId: string): RealtimeRoomState {
    if (!this.room || this.room.roomId !== roomId) throw new Error('Room not found.');
    return this.room;
  }

  private requireCloudflareRoom(roomId: string): RealtimeRoomState {
    const room = this.requireRoom(roomId);
    if (room.provider !== 'cloudflare') throw new Error('Room is not assigned to Cloudflare.');
    return room;
  }

  private getGateway(): CloudflareRealtimeGateway {
    const appId = this.env.CLOUDFLARE_REALTIME_APP_ID;
    const appSecret = this.env.CLOUDFLARE_REALTIME_APP_SECRET;
    if (!appId || !appSecret)
      throw new Error('Cloudflare Realtime credentials are not configured.');
    return new CloudflareRealtimeGateway({ appId, appSecret });
  }

  private async removeParticipant(participantId: string): Promise<void> {
    if (!this.room) return;
    const closures = this.room.removeParticipant(participantId);
    if (this.room.provider === 'cloudflare') await this.closeProviderTracks(closures);
  }

  private async closeProviderTracks(
    closures: readonly Readonly<{ sessionId: string; mid: string }>[],
  ): Promise<void> {
    if (closures.length === 0) return;
    const gateway = this.getGateway();
    await Promise.allSettled(
      closures.map((closure) => gateway.closeTrack(closure.sessionId, closure.mid)),
    );
  }

  private async persist(): Promise<void> {
    if (this.room) await this.state.storage.put(roomStorageKey, this.room.serialize());
  }

  private async scheduleAlarm(): Promise<void> {
    const delay = this.room?.participantCount
      ? activeAlarmMilliseconds
      : emptyRoomLifetimeMilliseconds;
    await this.state.storage.setAlarm(Date.now() + delay);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS')
      return withCors(new Response(null, { status: 204 }), request, env);
    const roomId = getRoomId(new URL(request.url).pathname);
    if (!roomId) return withCors(json({ error: 'Not found.' }, 404), request, env);
    const room = env.ROOMS.get(env.ROOMS.idFromName(roomId));
    return withCors(await room.fetch(request), request, env);
  },
};
