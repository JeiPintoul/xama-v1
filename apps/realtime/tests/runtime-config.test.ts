import { selectMediaProvider } from '@xama/media-core';
import { describe, expect, it } from 'vitest';

import {
  getRoutingSignals,
  isClientProviderOverrideAllowed,
  resolveProviderMode,
  type RealtimeEnv,
} from '../src/runtime-config';

describe('provider override authorization', () => {
  it('ignores a client Cloudflare override unless the server explicitly enables it', () => {
    expect(resolveProviderMode('cloudflare', false)).toBe('automatic');
    expect(resolveProviderMode('cloudflare', true)).toBe('cloudflare');
  });

  it('ignores a client LiveKit override unless the server explicitly enables it', () => {
    expect(resolveProviderMode('livekit', false)).toBe('automatic');
    expect(resolveProviderMode('livekit', true)).toBe('livekit');
  });

  it('never enables the client override in a production-like environment', () => {
    expect(
      isClientProviderOverrideAllowed({
        ENVIRONMENT: 'production',
        ALLOW_CLIENT_PROVIDER_OVERRIDE: 'true',
      } as RealtimeEnv),
    ).toBe(false);
    expect(
      isClientProviderOverrideAllowed({
        ENVIRONMENT: 'development',
        ALLOW_CLIENT_PROVIDER_OVERRIDE: 'true',
      } as RealtimeEnv),
    ).toBe(true);
  });

  it('excludes Cloudflare from a new automatic room at the soft budget limit', () => {
    const signals = getRoutingSignals(
      {
        LIVEKIT_ENABLED: 'false',
        CLOUDFLARE_ENABLED: 'true',
      } as RealtimeEnv,
      true,
    );

    expect(selectMediaProvider({ mode: 'automatic', providers: signals })).toEqual({
      status: 'unavailable',
      reason: 'no-provider-available',
    });
  });

  it('keeps an existing Cloudflare room pinned even when new rooms are budget-excluded', () => {
    const signals = getRoutingSignals(
      {
        LIVEKIT_ENABLED: 'true',
        CLOUDFLARE_ENABLED: 'true',
      } as RealtimeEnv,
      true,
    );

    expect(
      selectMediaProvider({
        mode: 'automatic',
        existingProvider: 'cloudflare',
        providers: signals,
      }),
    ).toMatchObject({ status: 'selected', provider: 'cloudflare', reason: 'pinned' });
  });
});
