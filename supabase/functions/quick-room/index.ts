import { AccessToken, RoomServiceClient, type VideoGrant } from 'npm:livekit-server-sdk@2.18.0';

const roomCodeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const roomCodePattern = new RegExp(`^[${roomCodeAlphabet}]{8}$`);
const guestIdentityPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const corsHeaders = {
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

type CreateRequest = Readonly<{
  action: 'create';
  identity: string;
  name: string;
}>;

type JoinRequest = Readonly<{
  action: 'join';
  code: string;
  identity: string;
  name: string;
}>;

type QuickRoomRequest = CreateRequest | JoinRequest;

function response(status: number, body: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeRoomCode(value: string): string | null {
  const normalized = value.toUpperCase().replace(/[\s-]/g, '');
  return roomCodePattern.test(normalized) ? normalized : null;
}

function isIdentityAndName(value: Record<string, unknown>): boolean {
  return (
    typeof value.identity === 'string' &&
    guestIdentityPattern.test(value.identity) &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    value.name.length <= 64
  );
}

function parseRequest(value: unknown): QuickRoomRequest | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const request = value as Record<string, unknown>;
  if (!isIdentityAndName(request) || (request.action !== 'create' && request.action !== 'join')) {
    return null;
  }

  if (request.action === 'create') {
    return { action: 'create', identity: request.identity as string, name: request.name as string };
  }

  if (typeof request.code !== 'string') {
    return null;
  }

  const code = normalizeRoomCode(request.code);
  return code
    ? { action: 'join', code, identity: request.identity as string, name: request.name as string }
    : null;
}

function generateRoomCode(): string {
  const randomValues = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(
    randomValues,
    (value) => roomCodeAlphabet[value % roomCodeAlphabet.length],
  ).join('');
}

function getRoomName(code: string): string {
  return `quick:${code}`;
}

function getRoomServiceUrl(liveKitUrl: string): string {
  return liveKitUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
}

async function createAvailableRoom(roomService: RoomServiceClient): Promise<string | null> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateRoomCode();
    const roomName = getRoomName(code);
    const existingRooms = await roomService.listRooms([roomName]);
    if (existingRooms.length > 0) {
      continue;
    }

    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 10 * 60,
      departureTimeout: 60,
      maxParticipants: 12,
    });
    return code;
  }

  return null;
}

async function issueConnection(
  apiKey: string,
  apiSecret: string,
  liveKitUrl: string,
  code: string,
  identity: string,
  name: string,
): Promise<Response> {
  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name: name.trim(),
    ttl: '10m',
  });
  const grant: VideoGrant = {
    room: getRoomName(code),
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  };
  token.addGrant(grant);

  return response(200, {
    code,
    token: await token.toJwt(),
    serverUrl: liveKitUrl,
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return response(405, { error: 'Method not allowed.' });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response(400, { error: 'Invalid request.' });
  }

  const quickRoomRequest = parseRequest(body);
  if (!quickRoomRequest) {
    return response(400, { error: 'Invalid request.' });
  }

  const liveKitUrl = Deno.env.get('LIVEKIT_URL');
  const apiKey = Deno.env.get('LIVEKIT_API_KEY');
  const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
  if (!liveKitUrl || !apiKey || !apiSecret) {
    return response(500, { error: 'Service unavailable.' });
  }

  const roomService = new RoomServiceClient(getRoomServiceUrl(liveKitUrl), apiKey, apiSecret);

  try {
    if (quickRoomRequest.action === 'create') {
      const code = await createAvailableRoom(roomService);
      if (!code) {
        return response(503, { error: 'Service unavailable.' });
      }
      return issueConnection(
        apiKey,
        apiSecret,
        liveKitUrl,
        code,
        quickRoomRequest.identity,
        quickRoomRequest.name,
      );
    }

    const roomName = getRoomName(quickRoomRequest.code);
    const rooms = await roomService.listRooms([roomName]);
    if (!rooms.some((room) => room.name === roomName)) {
      return response(404, { error: 'Room not found.' });
    }
    return issueConnection(
      apiKey,
      apiSecret,
      liveKitUrl,
      quickRoomRequest.code,
      quickRoomRequest.identity,
      quickRoomRequest.name,
    );
  } catch {
    return response(503, { error: 'Service unavailable.' });
  }
});
