import { describe, expect, it, vi } from 'vitest';

import type { RealtimeEnv } from '../src/runtime-config';
import { verifyCapabilityIssuance } from '../src/turnstile';

describe('Turnstile capability issuance boundary', () => {
  it('fails closed when verification is required but the server secret is unavailable', async () => {
    expect(
      await verifyCapabilityIssuance(
        undefined,
        new Request('https://realtime.example/rooms/room/join'),
        { REQUIRE_TURNSTILE: 'true' } as RealtimeEnv,
      ),
    ).toBe('unavailable');
  });

  it('validates a supplied token through server-side Siteverify', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ success: true }),
    );
    const result = await verifyCapabilityIssuance(
      'browser-token',
      new Request('https://realtime.example/rooms/room/join', {
        headers: { 'CF-Connecting-IP': '192.0.2.1' },
      }),
      { REQUIRE_TURNSTILE: 'true', TURNSTILE_SECRET_KEY: 'server-secret' } as RealtimeEnv,
      fetchImplementation,
    );

    expect(result).toBe('allowed');
    const form = fetchImplementation.mock.calls[0]?.[1]?.body;
    expect(form).toBeInstanceOf(FormData);
    expect((form as FormData).get('secret')).toBe('server-secret');
    expect((form as FormData).get('response')).toBe('browser-token');
  });
});
