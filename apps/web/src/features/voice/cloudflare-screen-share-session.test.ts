import { describe, expect, it } from 'vitest';

import { createCloudflareScreenShares } from '@/features/voice/cloudflare-screen-share-session';

const room = {
  roomId: 'proof-room',
  provider: 'cloudflare' as const,
  participants: [
    { id: 'publisher', name: 'Publisher' },
    { id: 'viewer', name: 'Viewer' },
  ],
  screenShares: [{ id: 'share-one', participantId: 'publisher', participantName: 'Publisher' }],
};

describe('Cloudflare screen-share discovery', () => {
  it('discovers a published track without selecting it for subscription', () => {
    expect(createCloudflareScreenShares(room, 'viewer', new Set(), new Set())).toEqual([
      expect.objectContaining({ id: 'share-one', watchState: 'available' }),
    ]);
  });

  it('represents explicit subscription intent independently from readiness', () => {
    expect(createCloudflareScreenShares(room, 'viewer', new Set(['share-one']), new Set())).toEqual(
      [expect.objectContaining({ id: 'share-one', watchState: 'subscribing' })],
    );
    expect(
      createCloudflareScreenShares(room, 'viewer', new Set(['share-one']), new Set(['share-one'])),
    ).toEqual([expect.objectContaining({ id: 'share-one', watchState: 'ready' })]);
  });
});
