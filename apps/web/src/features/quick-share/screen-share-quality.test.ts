import { describe, expect, it, vi } from 'vitest';

import {
  loadScreenShareQuality,
  saveScreenShareQuality,
} from '@/features/quick-share/screen-share-quality';

describe('screen share quality preference', () => {
  it('defaults invalid or missing preferences to high', () => {
    expect(loadScreenShareQuality({ getItem: () => null })).toBe('high');
    expect(loadScreenShareQuality({ getItem: () => 'ultra' })).toBe('high');
  });

  it('loads and persists provider-neutral quality values', () => {
    const setItem = vi.fn();

    expect(loadScreenShareQuality({ getItem: () => 'balanced' })).toBe('balanced');
    saveScreenShareQuality({ setItem }, 'balanced');

    expect(setItem).toHaveBeenCalledWith('xama.quick-share.quality', 'balanced');
  });
});
