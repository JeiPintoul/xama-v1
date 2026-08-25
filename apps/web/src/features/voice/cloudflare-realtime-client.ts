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

  constructor(endpoint: string, fetchImplementation: FetchImplementation = fetch) {
    this.endpoint = endpoint.replace(/\/$/, '');
    this.fetchImplementation = fetchImplementation;
  }

  async join(
    roomId: string,
    participantId: string,
    participantName: string,
    providerMode: MediaProviderMode,
  ): Promise<Readonly<{ provider: 'livekit' | 'cloudflare'; room: RealtimeRoomView }>> {
    const payload = await this.request(roomId, 'join', {
      participantId,
      participantName,
      providerMode,
    });
    if (
      !isRecord(payload) ||
      (payload.provider !== 'livekit' && payload.provider !== 'cloudflare')
    ) {
      throw new Error('O servidor de mídia retornou uma seleção inválida.');
    }
    return { provider: payload.provider, room: parseRoom(payload.room) };
  }

  async getRoom(roomId: string): Promise<RealtimeRoomView> {
    const payload = await this.request(roomId, 'state', undefined, 'GET');
    if (!isRecord(payload)) throw new Error('O estado da sala é inválido.');
    return parseRoom(payload.room);
  }

  async heartbeat(roomId: string, participantId: string): Promise<void> {
    await this.request(roomId, 'heartbeat', { participantId });
  }

  async publish(
    roomId: string,
    participantId: string,
    mid: string,
    sessionDescription: CloudflareSessionDescription,
  ): Promise<
    Readonly<{ screenShareId: string; sessionDescription: CloudflareSessionDescription }>
  > {
    const payload = await this.request(roomId, 'publish', {
      participantId,
      mid,
      sessionDescription,
    });
    if (!isRecord(payload) || typeof payload.screenShareId !== 'string') {
      throw new Error('O servidor de mídia não registrou a transmissão.');
    }
    const answer = parseSessionDescription(payload.sessionDescription);
    if (!answer) throw new Error('O servidor de mídia não respondeu à publicação.');
    return { screenShareId: payload.screenShareId, sessionDescription: answer };
  }

  async stopPublishing(
    roomId: string,
    participantId: string,
    screenShareId: string,
  ): Promise<void> {
    await this.request(roomId, 'stop-publishing', { participantId, screenShareId });
  }

  async subscribe(
    roomId: string,
    participantId: string,
    screenShareId: string,
  ): Promise<
    Readonly<{
      mid: string;
      sessionDescription: CloudflareSessionDescription;
    }>
  > {
    const payload = await this.request(roomId, 'subscribe', { participantId, screenShareId });
    if (!isRecord(payload) || typeof payload.mid !== 'string') {
      throw new Error('O servidor de mídia não criou a assinatura.');
    }
    const offer = parseSessionDescription(payload.sessionDescription);
    if (!offer) throw new Error('O servidor de mídia não ofereceu a transmissão.');
    return { mid: payload.mid, sessionDescription: offer };
  }

  async unsubscribe(
    roomId: string,
    participantId: string,
    screenShareId: string,
  ): Promise<CloudflareSessionDescription | undefined> {
    const payload = await this.request(roomId, 'unsubscribe', { participantId, screenShareId });
    return isRecord(payload) ? parseSessionDescription(payload.sessionDescription) : undefined;
  }

  async renegotiate(
    roomId: string,
    participantId: string,
    sessionDescription: CloudflareSessionDescription,
  ): Promise<void> {
    await this.request(roomId, 'renegotiate', { participantId, sessionDescription });
  }

  async leave(roomId: string, participantId: string): Promise<void> {
    await this.request(roomId, 'leave', { participantId }, 'POST', true);
  }

  private async request(
    roomId: string,
    action: string,
    body?: unknown,
    method: 'GET' | 'POST' = 'POST',
    keepalive = false,
  ): Promise<unknown> {
    if (!this.endpoint) throw new Error('Configure VITE_REALTIME_ENDPOINT para testar Cloudflare.');
    let response: Response;
    try {
      response = await this.fetchImplementation(
        `${this.endpoint}/rooms/${encodeURIComponent(roomId)}/${action}`,
        {
          method,
          ...(body === undefined
            ? {}
            : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
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
