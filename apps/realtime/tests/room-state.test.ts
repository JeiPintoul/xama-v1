import { describe, expect, it } from 'vitest';

import { RealtimeRoomState } from '../src/room-state';

describe('RealtimeRoomState', () => {
  it('adds and removes participants, screen shares, and subscriptions', () => {
    const room = new RealtimeRoomState('room-one');
    room.assignProvider('cloudflare');
    room.addParticipant('publisher', 'Publisher', 'publisher-session', 1);
    room.addParticipant('viewer', 'Viewer', 'viewer-session', 1);
    room.addScreenShare({
      id: 'share-one',
      ownerParticipantId: 'publisher',
      ownerName: 'Publisher',
      realtimeSessionId: 'publisher-session',
      providerTrackName: 'provider-track',
      publisherMid: '0',
    });
    room.addSubscription('viewer', 'share-one', '1');

    expect(room.toPublicRoom()).toMatchObject({
      provider: 'cloudflare',
      participants: [{ id: 'publisher' }, { id: 'viewer' }],
      screenShares: [{ id: 'share-one', participantId: 'publisher' }],
    });
    expect(room.removeParticipant('publisher')).toEqual(
      expect.arrayContaining([
        { sessionId: 'publisher-session', mid: '0' },
        { sessionId: 'viewer-session', mid: '1' },
      ]),
    );
    expect(room.toPublicRoom().screenShares).toEqual([]);
    expect(room.getParticipant('viewer')?.subscriptions).toEqual({});
  });
});
