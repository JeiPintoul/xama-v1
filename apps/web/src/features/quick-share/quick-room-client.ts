import {
  LiveKitTokenRequestError,
  type FetchLike,
  type LiveKitConnectionDetails,
} from '@/features/voice/livekit-token-client';

type QuickRoomAction = 'create' | 'join';

type QuickRoomRequest = Readonly<{
  action: QuickRoomAction;
  identity: string;
  name: string;
  code?: string;
}>;

export type QuickRoomConnection = LiveKitConnectionDetails &
  Readonly<{
    code: string;
  }>;

function isQuickRoomConnection(value: unknown): value is QuickRoomConnection {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.code === 'string' &&
    typeof candidate.token === 'string' &&
    typeof candidate.serverUrl === 'string'
  );
}

async function requestQuickRoom(
  endpoint: string,
  request: QuickRoomRequest,
  fetchImplementation: FetchLike = fetch,
): Promise<QuickRoomConnection> {
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

  if (response.status === 404) {
    throw new LiveKitTokenRequestError('Esta sala não existe ou expirou.');
  }

  if (!response.ok) {
    throw new LiveKitTokenRequestError(
      request.action === 'create'
        ? 'Não foi possível criar a sala. Tente novamente.'
        : 'Não foi possível entrar nesta sala.',
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new LiveKitTokenRequestError('Não foi possível conectar à sala. Tente novamente.');
  }

  if (!isQuickRoomConnection(payload)) {
    throw new LiveKitTokenRequestError('Não foi possível conectar à sala. Tente novamente.');
  }

  return payload;
}

export function createQuickRoom(
  endpoint: string,
  identity: string,
  name: string,
  fetchImplementation?: FetchLike,
): Promise<QuickRoomConnection> {
  return requestQuickRoom(endpoint, { action: 'create', identity, name }, fetchImplementation);
}

export function joinQuickRoom(
  endpoint: string,
  code: string,
  identity: string,
  name: string,
  fetchImplementation?: FetchLike,
): Promise<QuickRoomConnection> {
  return requestQuickRoom(endpoint, { action: 'join', code, identity, name }, fetchImplementation);
}
