export type LiveKitTokenRequest = Readonly<{
  room: string;
  identity: string;
  name: string;
  accessCode: string;
}>;

export type LiveKitConnectionDetails = Readonly<{
  token: string;
  serverUrl: string;
}>;

export type FetchLike = typeof fetch;

export class LiveKitTokenRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LiveKitTokenRequestError';
  }
}

function isConnectionDetails(value: unknown): value is LiveKitConnectionDetails {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.token === 'string' && typeof candidate.serverUrl === 'string';
}

export async function requestLiveKitToken(
  endpoint: string,
  request: LiveKitTokenRequest,
  fetchImplementation: FetchLike = fetch,
): Promise<LiveKitConnectionDetails> {
  if (!endpoint) {
    throw new LiveKitTokenRequestError('A conexão ainda não está configurada.');
  }

  let response: Response;

  try {
    response = await fetchImplementation(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  } catch {
    throw new LiveKitTokenRequestError('Não foi possível conectar à sala. Tente novamente.');
  }

  if (!response.ok) {
    throw new LiveKitTokenRequestError('Não foi possível entrar nesta sala.');
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new LiveKitTokenRequestError('Não foi possível conectar à sala. Tente novamente.');
  }

  if (!isConnectionDetails(payload) || !payload.token || !payload.serverUrl) {
    throw new LiveKitTokenRequestError('Não foi possível conectar à sala. Tente novamente.');
  }

  return payload;
}
