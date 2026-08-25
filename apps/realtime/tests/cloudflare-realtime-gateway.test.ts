import { describe, expect, it, vi } from 'vitest';

import { CloudflareRealtimeGateway } from '../src/cloudflare-realtime-gateway';

describe('CloudflareRealtimeGateway', () => {
  it('uses the App Secret only as a backend authorization header', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ sessionId: 'session-one' }, { status: 201 }));
    const gateway = new CloudflareRealtimeGateway({
      appId: 'app-one',
      appSecret: 'server-secret',
      fetchImplementation,
    });

    const sessionId = await gateway.createSession('room:participant');

    expect(sessionId).toBe('session-one');
    expect(fetchImplementation).toHaveBeenCalledWith(
      expect.stringContaining('/apps/app-one/sessions/new'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer server-secret' }),
      }),
    );
    expect(JSON.stringify({ sessionId })).not.toContain('server-secret');
  });
});
