import { describe, expect, it, vi } from 'vitest';

import { createQuickRoom, joinQuickRoom } from '@/features/quick-share/quick-room-client';
import { LiveKitTokenRequestError } from '@/features/voice/livekit-token-client';

const endpoint = 'https://example.supabase.co/functions/v1/quick-room';
const identity = 'bf99e2ee-80bb-4125-9fde-a41dd19b67de';

describe('Quick Share room client', () => {
  it('sends a create request and accepts the public connection response', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'XK7P4D2Q',
          token: 'token',
          serverUrl: 'wss://xama.livekit.cloud',
        }),
      ),
    );

    await expect(createQuickRoom(endpoint, identity, 'Ana', fetchImplementation)).resolves.toEqual({
      code: 'XK7P4D2Q',
      token: 'token',
      serverUrl: 'wss://xama.livekit.cloud',
    });
    expect(fetchImplementation).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        body: JSON.stringify({ action: 'create', identity, name: 'Ana' }),
      }),
    );
  });

  it('turns an expired join code into a safe error', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 404 }));

    await expect(
      joinQuickRoom(endpoint, 'XK7P4D2Q', identity, 'Ana', fetchImplementation),
    ).rejects.toEqual(new LiveKitTokenRequestError('Esta sala não foi encontrada ou já expirou.'));
  });
});
