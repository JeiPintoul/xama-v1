import type { MediaProviderMode } from '@xama/media-core';

export type CloudflareSessionDescription = Readonly<{
  type: 'offer' | 'answer';
  sdp: string;
}>;

export type RealtimeRoomView = Readonly<{
  roomId: string;
  provider: 'livekit' | 'cloudflare';
  participants: readonly Readonly<{ id: string; name: string }>[];
  screenShares: readonly Readonly<{
    id: string;
    participantId: string;
    participantName: string;
  }>[];
}>;

export type CloudflareJoinResult = Readonly<{
  provider: 'livekit' | 'cloudflare';
  participantId: string;
  capability: string;
  capabilityExpiresAt: number;
  room: RealtimeRoomView;
}>;

type FetchImplementation = typeof fetch;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseSessionDescription(value: unknown): CloudflareSessionDescription | undefined {
  if (!isRecord(value) || typeof value.sdp !== 'string') return undefined;
  if (value.type !== 'offer' && value.type !== 'answer') return undefined;
  return { type: value.type, sdp: value.sdp };
}

function parseRoom(value: unknown): RealtimeRoomView {
  if (!isRecord(value) || typeof value.roomId !== 'string') {
    throw new Error('O servidor de mídia retornou uma sala inválida.');
  }
  if (value.provider !== 'livekit' && value.provider !== 'cloudflare') {
    throw new Error('O servidor de mídia retornou um provedor inválido.');
  }
  if (!Array.isArray(value.participants) || !Array.isArray(value.screenShares)) {
    throw new Error('O servidor de mídia retornou um estado de sala inválido.');
  }
  const participants = value.participants.map((participant) => {
    if (
      !isRecord(participant) ||
      typeof participant.id !== 'string' ||
      typeof participant.name !== 'string'
    ) {
      throw new Error('O servidor de mídia retornou um participante inválido.');
    }
    return { id: participant.id, name: participant.name };
  });
  const screenShares = value.screenShares.map((screenShare) => {
    if (
      !isRecord(screenShare) ||
      typeof screenShare.id !== 'string' ||
      typeof screenShare.participantId !== 'string' ||
      typeof screenShare.participantName !== 'string'
    ) {
      throw new Error('O servidor de mídia retornou uma transmissão inválida.');
    }
    return {
      id: screenShare.id,
      participantId: screenShare.participantId,
      participantName: screenShare.participantName,
    };
  });
  return { roomId: value.roomId, provider: value.provider, participants, screenShares };
}

export class CloudflareRealtimeClient {
  private readonly endpoint: string;
  private readonly fetchImplementation: FetchImplementation;

  constructor(endpoint: string, fetchImplementation?: FetchImplementation) {
  this.endpoint = endpoint.replace(/\/$/, '');
  this.fetchImplementation =
    fetchImplementation ?? ((input, init) => fetch(input, init));
}

  async join(
    roomId: string,
    participantName: string,
    providerMode: MediaProviderMode,
    turnstileToken?: string,
  ): Promise<CloudflareJoinResult> {
    const payload = await this.request(roomId, 'join', {
      participantName,
      providerMode,
      ...(turnstileToken ? { turnstileToken } : {}),
    });
    if (
      !isRecord(payload) ||
      (payload.provider !== 'livekit' && payload.provider !== 'cloudflare') ||
      typeof payload.participantId !== 'string' ||
      typeof payload.capability !== 'string' ||
      typeof payload.capabilityExpiresAt !== 'number'
    ) {
      throw new Error('O servidor de mídia retornou uma seleção inválida.');
    }
    return {
      provider: payload.provider,
      participantId: payload.participantId,
      capability: payload.capability,
      capabilityExpiresAt: payload.capabilityExpiresAt,
      room: parseRoom(payload.room),
    };
  }

  async getRoom(roomId: string, capability: string): Promise<RealtimeRoomView> {
    const payload = await this.request(roomId, 'state', undefined, 'GET', false, capability);
    if (!isRecord(payload)) throw new Error('O estado da sala é inválido.');
    return parseRoom(payload.room);
  }

  async heartbeat(roomId: string, capability: string): Promise<void> {
  await this.request(roomId, 'heartbeat', undefined, 'POST', false, capability);
}

  async publish(
    roomId: string,
    capability: string,
    mid: string,
    sessionDescription: CloudflareSessionDescription,
  ): Promise<
    Readonly<{ screenShareId: string; sessionDescription: CloudflareSessionDescription }>
  > {
    const payload = await this.request(
      roomId,
      'publish',
      { mid, sessionDescription },
      'POST',
      false,
      capability,
    );
    if (!isRecord(payload) || typeof payload.screenShareId !== 'string') {
      throw new Error('O servidor de mídia não registrou a transmissão.');
    }
    const answer = parseSessionDescription(payload.sessionDescription);
    if (!answer) throw new Error('O servidor de mídia não respondeu à publicação.');
    return { screenShareId: payload.screenShareId, sessionDescription: answer };
  }

  async stopPublishing(roomId: string, capability: string, screenShareId: string): Promise<void> {
    await this.request(roomId, 'stop-publishing', { screenShareId }, 'POST', false, capability);
  }

  async subscribe(
    roomId: string,
    capability: string,
    screenShareId: string,
  ): Promise<Readonly<{ mid: string; sessionDescription: CloudflareSessionDescription }>> {
    const payload = await this.request(
      roomId,
      'subscribe',
      { screenShareId },
      'POST',
      false,
      capability,
    );
    if (!isRecord(payload) || typeof payload.mid !== 'string') {
      throw new Error('O servidor de mídia não criou a assinatura.');
    }
    const offer = parseSessionDescription(payload.sessionDescription);
    if (!offer) throw new Error('O servidor de mídia não ofereceu a transmissão.');
    return { mid: payload.mid, sessionDescription: offer };
  }

  async unsubscribe(
    roomId: string,
    capability: string,
    screenShareId: string,
  ): Promise<CloudflareSessionDescription | undefined> {
    const payload = await this.request(
      roomId,
      'unsubscribe',
      { screenShareId },
      'POST',
      false,
      capability,
    );
    return isRecord(payload) ? parseSessionDescription(payload.sessionDescription) : undefined;
  }

  async renegotiate(
    roomId: string,
    capability: string,
    sessionDescription: CloudflareSessionDescription,
  ): Promise<void> {
    await this.request(roomId, 'renegotiate', { sessionDescription }, 'POST', false, capability);
  }

  async leave(roomId: string, capability: string): Promise<void> {
  await this.request(roomId, 'leave', undefined, 'POST', true, capability);
}

  private async request(
    roomId: string,
    action: string,
    body?: unknown,
    method: 'GET' | 'POST' = 'POST',
    keepalive = false,
    capability?: string,
  ): Promise<unknown> {
    if (!this.endpoint) throw new Error('Configure VITE_REALTIME_ENDPOINT para testar Cloudflare.');
    const headers = new Headers();
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    if (capability) headers.set('Authorization', `Bearer ${capability}`);
    let response: Response;
    try {
      response = await this.fetchImplementation(
        `${this.endpoint}/rooms/${encodeURIComponent(roomId)}/${action}`,
        {
          method,
          headers,
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          keepalive,
        },
      );
    } catch {
      throw new Error('Não foi possível alcançar o serviço Cloudflare Realtime.');
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok) {
      throw new Error(
        isRecord(payload) && typeof payload.error === 'string'
          ? payload.error
          : 'A operação Cloudflare Realtime falhou.',
      );
    }
    return payload;
  }
}
