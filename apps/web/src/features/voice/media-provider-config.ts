import type { MediaProviderMode } from '@xama/media-core';

export function resolveMediaProviderMode(value: string | undefined): MediaProviderMode {
  return value === 'livekit' || value === 'cloudflare' ? value : 'automatic';
}
