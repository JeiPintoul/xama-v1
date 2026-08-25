import { describe, expect, it } from 'vitest';

import { RealtimeRoomState } from '../src/room-state';
import { participantOperations } from '../src/security';

function addParticipant(
  room: RealtimeRoomState,
  id: string,
  capabilityHash: string,
  realtimeSessionId = `${id}-session`,
): void {
  room.addParticipant({
    id,
    name: id,
    realtimeSessionId,
    capabilityHash,
    capabilityExpiresAt: 10_000,
    allowedOperations: participantOperations,
    lastSeenAt: 1,
  });
}

describe('RealtimeRoomState', () => {
  it('adds and removes participants, screen shares, subscriptions, and pull leases', () => {
    const room = new RealtimeRoomState('room-one');
    room.assignProvider('cloudflare');
    addParticipant(room, 'publisher', 'publisher-capability');
    addParticipant(room, 'viewer', 'viewer-capability');
    room.addScreenShare({
      id: 'share-one',
      ownerParticipantId: 'publisher',
      ownerName: 'Publisher',
      realtimeSessionId: 'publisher-session',
      providerTrackName: 'provider-track',
      publisherMid: '0',
    });
    room.addSubscription('viewer', 'share-one', { mid: '1', leaseId: 'lease-one' });

    expect(room.remotePullCount).toBe(1);
    expect(room.getAllLeaseIds()).toEqual(['lease-one']);
    expect(room.toPublicRoom()).toMatchObject({
      provider: 'cloudflare',
      participants: [{ id: 'publisher' }, { id: 'viewer' }],
      screenShares: [{ id: 'share-one', participantId: 'publisher' }],
    });
    expect(room.removeParticipant('publisher')).toEqual(
      expect.arrayContaining([
        { sessionId: 'publisher-session', mid: '0' },
        { sessionId: 'viewer-session', mid: '1', leaseId: 'lease-one' },
      ]),
    );
    expect(room.toPublicRoom().screenShares).toEqual([]);
    expect(room.getParticipant('viewer')?.subscriptions).toEqual({});
  });

  it('requires a live, operation-scoped capability and revokes it with the participant', () => {
    const room = new RealtimeRoomState('room-one');
    room.assignProvider('cloudflare');
    room.addParticipant({
      id: 'viewer',
      name: 'Viewer',
      realtimeSessionId: 'viewer-session',
      capabilityHash: 'viewer-capability',
      capabilityExpiresAt: 100,
      allowedOperations: ['state', 'leave'],
      lastSeenAt: 1,
    });

    expect(room.authenticateCapability('viewer-capability', 'state', 99)?.id).toBe('viewer');
    expect(room.authenticateCapability('viewer-capability', 'publish', 99)).toBeNull();
    expect(room.authenticateCapability('viewer-capability', 'state', 100)).toBeNull();
    expect(room.authenticateCapability('another-capability', 'state', 99)).toBeNull();

    room.removeParticipant('viewer');
    expect(room.authenticateCapability('viewer-capability', 'leave', 50)).toBeNull();
  });

  it('keeps capabilities scoped to their room and bound participant session', () => {
    const firstRoom = new RealtimeRoomState('room-one');
    const secondRoom = new RealtimeRoomState('room-two');
    firstRoom.assignProvider('cloudflare');
    secondRoom.assignProvider('cloudflare');
    addParticipant(firstRoom, 'first', 'room-one-capability', 'session-one');
    addParticipant(secondRoom, 'second', 'room-two-capability', 'session-two');

    expect(firstRoom.authenticateCapability('room-two-capability', 'state', 1)).toBeNull();
    expect(firstRoom.authenticateCapability('room-one-capability', 'state', 1)).toMatchObject({
      id: 'first',
      realtimeSessionId: 'session-one',
    });
  });

  it('revokes a stale participant capability during cleanup', () => {
    const room = new RealtimeRoomState('room-one');
    room.assignProvider('cloudflare');
    addParticipant(room, 'stale', 'stale-capability');

    expect(room.getStaleParticipantIds(31_000, 30_000)).toEqual(['stale']);
    room.removeParticipant('stale');
    expect(room.authenticateCapability('stale-capability', 'state', 2)).toBeNull();
  });

  it('tracks per-room and per-participant publication and pull counts', () => {
    const room = new RealtimeRoomState('room-one');
    room.assignProvider('cloudflare');
    addParticipant(room, 'publisher', 'publisher-capability');
    addParticipant(room, 'viewer', 'viewer-capability');
    room.addScreenShare({
      id: 'share-one',
      ownerParticipantId: 'publisher',
      ownerName: 'Publisher',
      realtimeSessionId: 'publisher-session',
      providerTrackName: 'provider-track',
      publisherMid: '0',
    });
    room.addSubscription('viewer', 'share-one', { mid: '1', leaseId: 'lease-one' });

    expect(room.screenShareCount).toBe(1);
    expect(room.getParticipantScreenShareCount('publisher')).toBe(1);
    expect(room.remotePullCount).toBe(1);
    expect(room.getParticipantRemotePullCount('viewer')).toBe(1);
  });
});
