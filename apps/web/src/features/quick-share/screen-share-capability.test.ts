import { describe, expect, it, vi } from 'vitest';

import { supportsScreenSharePublishing } from '@/features/quick-share/screen-share-capability';

describe('screen-share publishing capability', () => {
  it('requires browser display capture before exposing publishing', () => {
    const mediaDevices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    expect(supportsScreenSharePublishing()).toBe(false);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getDisplayMedia: vi.fn() },
    });
    expect(supportsScreenSharePublishing()).toBe(true);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: mediaDevices });
  });
});
