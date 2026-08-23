import { AccessToken, type VideoGrant } from 'npm:livekit-server-sdk@2.18.0';

const allowedRooms = new Set([
  'xama-lab:lobby',
  'xama-lab:cafe',
  'game-on:lobby',
  'game-on:ranked',
  'game-on:afk',
  'clube-do-livro:sala-de-leitura',
]);
const corsHeaders = {
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};
const textEncoder = new TextEncoder();
const guestIdentityPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type TokenRequest = Readonly<{
  room: string;
  identity: string;
  name: string;
  accessCode: string;
}>;

function response(status: number, body: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isTokenRequest(value: unknown): value is TokenRequest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const request = value as Record<string, unknown>;
  return (
    typeof request.room === 'string' &&
    allowedRooms.has(request.room) &&
    typeof request.identity === 'string' &&
    guestIdentityPattern.test(request.identity) &&
    typeof request.name === 'string' &&
    request.name.trim().length > 0 &&
    request.name.length <= 64 &&
    typeof request.accessCode === 'string' &&
    request.accessCode.length > 0 &&
    request.accessCode.length <= 256
  );
}

function matchesAccessCode(submittedCode: string, expectedCode: string): boolean {
  const submitted = textEncoder.encode(submittedCode);
  const expected = textEncoder.encode(expectedCode);
  const length = Math.max(submitted.length, expected.length);
  let difference = submitted.length ^ expected.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (submitted[index] ?? 0) ^ (expected[index] ?? 0);
  }

  return difference === 0;
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

  if (!isTokenRequest(body)) {
    return response(400, { error: 'Invalid request.' });
  }

  const liveKitUrl = Deno.env.get('LIVEKIT_URL');
  const apiKey = Deno.env.get('LIVEKIT_API_KEY');
  const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
  const alphaCode = Deno.env.get('XAMA_ALPHA_CODE');

  if (!liveKitUrl || !apiKey || !apiSecret || !alphaCode) {
    return response(500, { error: 'Service unavailable.' });
  }

  if (!matchesAccessCode(body.accessCode, alphaCode)) {
    return response(401, { error: 'Unauthorized.' });
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: body.identity,
    name: body.name.trim(),
    ttl: '10m',
  });
  const grant: VideoGrant = {
    room: body.room,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  token.addGrant(grant);

  return response(200, {
    token: await token.toJwt(),
    serverUrl: liveKitUrl,
  });
});
