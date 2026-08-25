import { describe, expect, it } from 'vitest';

import { resolveMediaProviderMode } from '@/features/voice/media-provider-config';

describe('resolveMediaProviderMode', () => {
  it.each([
    ['livekit', 'livekit'],
    ['cloudflare', 'cloudflare'],
    ['automatic', 'automatic'],
    [undefined, 'automatic'],
    ['p2p', 'automatic'],
  ] as const)('maps %s to %s', (configured, expected) => {
    expect(resolveMediaProviderMode(configured)).toBe(expected);
  });
});
