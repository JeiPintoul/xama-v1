import { describe, expect, it, vi } from 'vitest';

import { CloudflareRealtimeClient } from '@/features/voice/cloudflare-realtime-client';

const room = {
  roomId: 'proof-room',
  provider: 'cloudflare',
  participants: [{ id: 'server-participant', name: 'Viewer' }],
  screenShares: [],
};

describe('CloudflareRealtimeClient capability boundary', () => {
  it('accepts server-issued participant authority and does not send a client participantId', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        provider: 'cloudflare',
        participantId: 'server-participant',
        capability: 'server-issued-capability',
        capabilityExpiresAt: 123,
        room,
      }),
    );
    const client = new CloudflareRealtimeClient('https://realtime.example', fetchImplementation);

    const result = await client.join('proof-room', 'Viewer', 'cloudflare');

    expect(result).toMatchObject({
      participantId: 'server-participant',
      capability: 'server-issued-capability',
    });
    const requestInit = fetchImplementation.mock.calls[0]?.[1];
    expect(requestInit?.body).toBe(
      JSON.stringify({ participantName: 'Viewer', providerMode: 'cloudflare' }),
    );
    expect(String(requestInit?.body)).not.toContain('participantId');
  });

  it('authenticates room state and privileged operations with the bearer capability', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ room }));
    const client = new CloudflareRealtimeClient('https://realtime.example', fetchImplementation);

    await client.getRoom('proof-room', 'server-issued-capability');

    const headers = fetchImplementation.mock.calls[0]?.[1]?.headers;
    expect(new Headers(headers).get('Authorization')).toBe('Bearer server-issued-capability');
  });
});
