import { describe, expect, it } from 'vitest';

import {
  formatQuickRoomCode,
  getQuickRoomName,
  normalizeQuickRoomCode,
} from '@/features/quick-share/room-code';

describe('Quick Share room codes', () => {
  it('normalizes the human-friendly eight-character format', () => {
    expect(normalizeQuickRoomCode(' xk7p-4d2q ')).toBe('XK7P4D2Q');
    expect(formatQuickRoomCode('xk7p4d2q')).toBe('XK7P-4D2Q');
    expect(getQuickRoomName('XK7P4D2Q')).toBe('quick:XK7P4D2Q');
  });

  it('rejects ambiguous and malformed room codes', () => {
    expect(normalizeQuickRoomCode('XK7P-4D2I')).toBeNull();
    expect(normalizeQuickRoomCode('XK7P-4D20')).toBeNull();
    expect(normalizeQuickRoomCode('SHORT')).toBeNull();
  });
});
