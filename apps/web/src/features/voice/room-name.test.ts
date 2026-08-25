import { describe, expect, it } from 'vitest';

import { getVoiceRoomName } from '@/features/voice/room-name';

describe('getVoiceRoomName', () => {
  it('maps a community and voice channel to the alpha room format', () => {
    expect(getVoiceRoomName('clube-do-livro', 'sala-de-leitura')).toBe(
      'clube-do-livro:sala-de-leitura',
    );
  });
});
