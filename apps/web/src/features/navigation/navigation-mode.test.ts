import { resolveNavigationMode } from '@xama/domain';
import type { Community } from '@xama/domain';
import { describe, expect, it } from 'vitest';

import { mockCommunities } from '@/features/navigation/mock-navigation';

function getMockCommunity(communityId: string): Community {
  const community = mockCommunities.find((candidate) => candidate.id === communityId);

  if (!community) {
    throw new Error(`Mock community "${communityId}" was not found.`);
  }

  return community;
}

describe('navigation mode resolution', () => {
  it('resolves representative mock communities from their channel complexity', () => {
    expect(resolveNavigationMode('automatic', getMockCommunity('xama-lab'))).toBe('simplified');
    expect(resolveNavigationMode('automatic', getMockCommunity('game-on'))).toBe('modular');
  });

  it('honors explicit modes independently of automatic resolution', () => {
    expect(resolveNavigationMode('simplified', getMockCommunity('game-on'))).toBe('simplified');
    expect(resolveNavigationMode('modular', getMockCommunity('clube-do-livro'))).toBe('modular');
  });
});
