export type ParticipantOperation =
  | 'state'
  | 'heartbeat'
  | 'publish'
  | 'stop-publishing'
  | 'subscribe'
  | 'unsubscribe'
  | 'renegotiate'
  | 'leave';

export const participantOperations: readonly ParticipantOperation[] = [
  'state',
  'heartbeat',
  'publish',
  'stop-publishing',
  'subscribe',
  'unsubscribe',
  'renegotiate',
  'leave',
];

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function createOpaqueCapability(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashSecret(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return toBase64Url(new Uint8Array(digest));
}

export function readBearerCapability(request: Request): string | null {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const capability = authorization.slice('Bearer '.length).trim();
  return capability.length >= 32 && capability.length <= 256 ? capability : null;
}

export async function constantTimeSecretEquals(
  suppliedSecret: string,
  expectedSecret: string,
): Promise<boolean> {
  const [suppliedDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(suppliedSecret)),
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(expectedSecret)),
  ]);
  const suppliedBytes = new Uint8Array(suppliedDigest);
  const expectedBytes = new Uint8Array(expectedDigest);
  let difference = 0;
  for (let index = 0; index < expectedBytes.length; index += 1) {
    difference |= suppliedBytes[index]! ^ expectedBytes[index]!;
  }
  return difference === 0;
}
