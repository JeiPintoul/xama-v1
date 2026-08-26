export type CloudflareSessionDescription = Readonly<{
  type: 'offer' | 'answer';
  sdp: string;
}>;

type CloudflareTrack = Readonly<{
  location?: 'local' | 'remote';
  mid?: string;
  sessionId?: string;
  trackName?: string;
  errorCode?: string;
  errorDescription?: string;
}>;

export type CloudflareTracksResponse = Readonly<{
  sessionDescription?: CloudflareSessionDescription;
  requiresImmediateRenegotiation?: boolean;
  tracks: readonly CloudflareTrack[];
}>;

type FetchImplementation = typeof fetch;

type GatewayConfiguration = Readonly<{
  appId: string;
  appSecret: string;
  fetchImplementation?: FetchImplementation;
  baseUrl?: string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getProviderError(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  return typeof payload.errorCode === 'string' ? payload.errorCode : null;
}

function parseSessionDescription(value: unknown): CloudflareSessionDescription | undefined {
  if (!isRecord(value) || typeof value.sdp !== 'string') return undefined;
  if (value.type !== 'offer' && value.type !== 'answer') return undefined;
  return { type: value.type, sdp: value.sdp };
}

function parseTracksResponse(payload: unknown): CloudflareTracksResponse {
  if (!isRecord(payload)) throw new Error('Cloudflare Realtime returned an invalid response.');
  const providerError = getProviderError(payload);
  if (providerError) throw new Error(`Cloudflare Realtime request failed: ${providerError}.`);
  if (!Array.isArray(payload.tracks)) {
    throw new Error('Cloudflare Realtime returned an invalid tracks response.');
  }

  const tracks = payload.tracks.map((value): CloudflareTrack => {
    if (!isRecord(value)) throw new Error('Cloudflare Realtime returned an invalid track.');
    return {
      location:
        value.location === 'local' || value.location === 'remote' ? value.location : undefined,
      mid: typeof value.mid === 'string' ? value.mid : undefined,
      sessionId: typeof value.sessionId === 'string' ? value.sessionId : undefined,
      trackName: typeof value.trackName === 'string' ? value.trackName : undefined,
      errorCode: typeof value.errorCode === 'string' ? value.errorCode : undefined,
      errorDescription:
        typeof value.errorDescription === 'string' ? value.errorDescription : undefined,
    };
  });
  const failedTrack = tracks.find((track) => track.errorCode);
  if (failedTrack?.errorCode) {
    throw new Error(`Cloudflare Realtime track request failed: ${failedTrack.errorCode}.`);
  }

  return {
    sessionDescription: parseSessionDescription(payload.sessionDescription),
    requiresImmediateRenegotiation:
      typeof payload.requiresImmediateRenegotiation === 'boolean'
        ? payload.requiresImmediateRenegotiation
        : undefined,
    tracks,
  };
}

export class CloudflareRealtimeGateway {
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly fetchImplementation: FetchImplementation;
  private readonly baseUrl: string;

  constructor({
  appId,
  appSecret,
  fetchImplementation,
  baseUrl = 'https://rtc.live.cloudflare.com/v1',
}: GatewayConfiguration) {
  this.appId = appId;
  this.appSecret = appSecret;
  this.fetchImplementation =
    fetchImplementation ?? ((input, init) => fetch(input, init));
  this.baseUrl = baseUrl;
}

  async createSession(correlationId: string): Promise<string> {
    const payload = await this.request(
      `/sessions/new?correlationId=${encodeURIComponent(correlationId)}`,
      'POST',
    );
    if (!isRecord(payload) || typeof payload.sessionId !== 'string') {
      throw new Error('Cloudflare Realtime returned an invalid session response.');
    }
    const providerError = getProviderError(payload);
    if (providerError) throw new Error(`Cloudflare Realtime request failed: ${providerError}.`);
    return payload.sessionId;
  }

  async publishTrack(
  sessionId: string,
  sessionDescription: CloudflareSessionDescription,
): Promise<CloudflareTracksResponse> {
  return this.trackRequest(sessionId, '/tracks/new', 'POST', {
    sessionDescription,
    autoDiscover: true,
  });
}

  async pullTrack(
    targetSessionId: string,
    sourceSessionId: string,
    trackName: string,
  ): Promise<CloudflareTracksResponse> {
    return this.trackRequest(targetSessionId, '/tracks/new', 'POST', {
      tracks: [{ location: 'remote', sessionId: sourceSessionId, trackName }],
    });
  }

  async renegotiate(
    sessionId: string,
    sessionDescription: CloudflareSessionDescription,
  ): Promise<void> {
    await this.request(`/sessions/${encodeURIComponent(sessionId)}/renegotiate`, 'PUT', {
      sessionDescription,
    });
  }

  async closeTrack(sessionId: string, mid: string): Promise<CloudflareTracksResponse> {
    return this.trackRequest(sessionId, '/tracks/close', 'PUT', {
      tracks: [{ mid }],
      force: true,
    });
  }

  private async trackRequest(
    sessionId: string,
    path: string,
    method: 'POST' | 'PUT',
    body: unknown,
  ): Promise<CloudflareTracksResponse> {
    return parseTracksResponse(
      await this.request(`/sessions/${encodeURIComponent(sessionId)}${path}`, method, body),
    );
  }

  private async request(
    path: string,
    method: 'POST' | 'PUT',
    body?: unknown,
  ): Promise<unknown> {
    const response = await this.fetchImplementation(
      `${this.baseUrl}/apps/${encodeURIComponent(this.appId)}${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${this.appSecret}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    );

    let payload: unknown = null;

    try {
      payload = await response.json();
    } catch {
      // handled below
    }

    if (!response.ok) {
      const providerCode =
        isRecord(payload) && typeof payload.errorCode === 'string'
          ? payload.errorCode
          : undefined;

      const providerDescription =
        isRecord(payload) && typeof payload.errorDescription === 'string'
          ? payload.errorDescription
          : undefined;

      console.error(
        JSON.stringify({
          event: 'cloudflare_realtime_request_failed',
          method,
          path,
          status: response.status,
          providerCode,
          providerDescription,
        }),
      );

      throw new Error(
        `Cloudflare Realtime returned HTTP ${response.status}` +
          (providerCode ? ` (${providerCode})` : ''),
      );
    }

    if (payload === null) {
      throw new Error(`Cloudflare Realtime returned HTTP ${response.status} without JSON.`);
    }

    return payload;
  }
}
