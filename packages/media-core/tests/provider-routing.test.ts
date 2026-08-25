import { describe, expect, it } from 'vitest';

import type { MediaProviderRoutingSignal } from '../src';
import { selectMediaProvider } from '../src';

const healthyProviders: readonly MediaProviderRoutingSignal[] = [
  { provider: 'livekit', enabled: true, health: 'healthy' },
  { provider: 'cloudflare', enabled: true, health: 'healthy' },
];

describe('selectMediaProvider', () => {
  it.each(['livekit', 'cloudflare'] as const)('respects the explicit %s override', (provider) => {
    expect(selectMediaProvider({ mode: provider, providers: healthyProviders })).toEqual({
      status: 'selected',
      provider,
      reason: 'explicit',
    });
  });

  it('falls back to Cloudflare when LiveKit is unavailable', () => {
    const providers: readonly MediaProviderRoutingSignal[] = [
      { provider: 'livekit', enabled: false, health: 'healthy', exclusions: ['disabled'] },
      { provider: 'cloudflare', enabled: true, health: 'healthy' },
    ];

    expect(selectMediaProvider({ mode: 'automatic', providers })).toEqual({
      status: 'selected',
      provider: 'cloudflare',
      reason: 'automatic-fallback',
    });
  });

  it('keeps an existing room pinned when provider health changes', () => {
    expect(
      selectMediaProvider({
        mode: 'automatic',
        existingProvider: 'livekit',
        providers: [
          { provider: 'livekit', enabled: false, health: 'degraded' },
          { provider: 'cloudflare', enabled: true, health: 'healthy' },
        ],
      }),
    ).toEqual({ status: 'selected', provider: 'livekit', reason: 'pinned' });
  });
});
