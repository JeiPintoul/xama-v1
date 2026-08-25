import { describe, expect, it } from 'vitest';

import { getScreenShareMuteVolume } from '@/features/voice/media-session';

describe('screen share mute volume', () => {
  it('mutes an audible share and restores its own last audible volume', () => {
    expect(getScreenShareMuteVolume(0.73, 0.73)).toBe(0);
    expect(getScreenShareMuteVolume(0, 0.73)).toBe(0.73);
    expect(getScreenShareMuteVolume(0, 0.4)).toBe(0.4);
  });

  it('falls back to full volume only without a previous audible value', () => {
    expect(getScreenShareMuteVolume(0, undefined)).toBe(1);
  });
});
