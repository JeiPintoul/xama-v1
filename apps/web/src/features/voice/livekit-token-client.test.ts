import { describe, expect, it, vi } from 'vitest';

import {
  LiveKitTokenRequestError,
  requestLiveKitToken,
} from '@/features/voice/livekit-token-client';

const tokenRequest = {
  room: 'xama-lab:lobby',
  identity: 'bf99e2ee-80bb-4125-9fde-a41dd19b67de',
  name: 'Ana',
  accessCode: 'alpha-code',
};

describe('requestLiveKitToken', () => {
  it('posts the scoped room and guest identity to the configured endpoint', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ token: 'token', serverUrl: 'wss://xama.livekit.cloud' })),
      );

    await expect(
      requestLiveKitToken(
        'https://example.supabase.co/functions/v1/livekit-token',
        tokenRequest,
        fetchImplementation,
      ),
    ).resolves.toEqual({ token: 'token', serverUrl: 'wss://xama.livekit.cloud' });

    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/livekit-token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokenRequest),
      }),
    );
  });

  it('normalizes endpoint failures without exposing server details', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: 'secret server detail' }), { status: 401 }),
      );

    await expect(
      requestLiveKitToken(
        'https://example.supabase.co/functions/v1/livekit-token',
        tokenRequest,
        fetchImplementation,
      ),
    ).rejects.toEqual(new LiveKitTokenRequestError('Não foi possível entrar nesta sala.'));
  });
});
