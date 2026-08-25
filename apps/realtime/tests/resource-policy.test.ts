import { describe, expect, it } from 'vitest';

import {
  getJoinLimitViolation,
  getPublicationLimitViolation,
  getPullLimitViolation,
} from '../src/resource-policy';
import type { ResourceLimits } from '../src/runtime-config';
import { RealtimeRoomState } from '../src/room-state';
import { participantOperations } from '../src/security';

const limits: ResourceLimits = {
  maxParticipantsPerRoom: 2,
  maxScreenSharesPerParticipant: 1,
  maxScreenSharesPerRoom: 1,
  maxRemotePullsPerParticipant: 1,
  maxRemotePullsPerRoom: 1,
};

function addParticipant(room: RealtimeRoomState, id: string): void {
  room.addParticipant({
    id,
    name: id,
    realtimeSessionId: `${id}-session`,
    capabilityHash: `${id}-capability`,
    capabilityExpiresAt: 10_000,
    allowedOperations: participantOperations,
    lastSeenAt: 0,
  });
}

describe('realtime resource policy', () => {
  it('enforces the room participant cap before another join', () => {
    const room = new RealtimeRoomState('room');
    addParticipant(room, 'one');
    addParticipant(room, 'two');

    expect(getJoinLimitViolation(room, limits)?.code).toBe('room-participant-limit');
  });

  it('enforces participant and room publication caps', () => {
    const room = new RealtimeRoomState('room');
    addParticipant(room, 'publisher');
    addParticipant(room, 'another');
    room.addScreenShare({
      id: 'share',
      ownerParticipantId: 'publisher',
      ownerName: 'publisher',
      realtimeSessionId: 'publisher-session',
      providerTrackName: 'provider-track',
      publisherMid: '0',
    });

    expect(getPublicationLimitViolation(room, 'publisher', limits)?.code).toBe(
      'participant-publication-limit',
    );
    expect(getPublicationLimitViolation(room, 'another', limits)?.code).toBe(
      'room-publication-limit',
    );
  });

  it('enforces participant and room remote-pull caps', () => {
    const room = new RealtimeRoomState('room');
    addParticipant(room, 'publisher');
    addParticipant(room, 'viewer');
    addParticipant(room, 'another');
    room.addScreenShare({
      id: 'share',
      ownerParticipantId: 'publisher',
      ownerName: 'publisher',
      realtimeSessionId: 'publisher-session',
      providerTrackName: 'provider-track',
      publisherMid: '0',
    });
    room.addSubscription('viewer', 'share', { mid: '1', leaseId: 'lease' });

    expect(getPullLimitViolation(room, 'viewer', limits)?.code).toBe('participant-pull-limit');
    expect(getPullLimitViolation(room, 'another', limits)?.code).toBe('room-pull-limit');
  });
});
