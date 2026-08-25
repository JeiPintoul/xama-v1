import { parseBoolean, type RealtimeEnv } from './runtime-config';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function verifyCapabilityIssuance(
  token: string | undefined,
  request: Request,
  env: RealtimeEnv,
  fetchImplementation: typeof fetch = fetch,
): Promise<'allowed' | 'required' | 'unavailable' | 'failed'> {
  const required = parseBoolean(env.REQUIRE_TURNSTILE, false);
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) return required ? 'unavailable' : 'allowed';
  if (!token) return required ? 'required' : 'allowed';

  const form = new FormData();
  form.set('secret', secret);
  form.set('response', token);
  const remoteIp = request.headers.get('CF-Connecting-IP');
  if (remoteIp) form.set('remoteip', remoteIp);

  try {
    const response = await fetchImplementation(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: form },
    );
    const payload: unknown = await response.json();
    return response.ok && isRecord(payload) && payload.success === true ? 'allowed' : 'failed';
  } catch {
    return 'failed';
  }
}
