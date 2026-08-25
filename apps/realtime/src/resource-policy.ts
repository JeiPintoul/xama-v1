import type { ResourceLimits } from './runtime-config';
import type { RealtimeRoomState } from './room-state';

export type ResourceLimitViolation = Readonly<{
  status: 429;
  code:
    | 'room-participant-limit'
    | 'participant-publication-limit'
    | 'room-publication-limit'
    | 'participant-pull-limit'
    | 'room-pull-limit';
  message: string;
}>;

export function getJoinLimitViolation(
  room: RealtimeRoomState,
  limits: ResourceLimits,
): ResourceLimitViolation | null {
  return room.participantCount >= limits.maxParticipantsPerRoom
    ? {
        status: 429,
        code: 'room-participant-limit',
        message: 'This room has reached its participant limit.',
      }
    : null;
}

export function getPublicationLimitViolation(
  room: RealtimeRoomState,
  participantId: string,
  limits: ResourceLimits,
): ResourceLimitViolation | null {
  if (room.getParticipantScreenShareCount(participantId) >= limits.maxScreenSharesPerParticipant) {
    return {
      status: 429,
      code: 'participant-publication-limit',
      message: 'The participant publication limit was reached.',
    };
  }
  return room.screenShareCount >= limits.maxScreenSharesPerRoom
    ? {
        status: 429,
        code: 'room-publication-limit',
        message: 'The room publication limit was reached.',
      }
    : null;
}

export function getPullLimitViolation(
  room: RealtimeRoomState,
  participantId: string,
  limits: ResourceLimits,
): ResourceLimitViolation | null {
  if (room.getParticipantRemotePullCount(participantId) >= limits.maxRemotePullsPerParticipant) {
    return {
      status: 429,
      code: 'participant-pull-limit',
      message: 'The participant pull limit was reached.',
    };
  }
  return room.remotePullCount >= limits.maxRemotePullsPerRoom
    ? {
        status: 429,
        code: 'room-pull-limit',
        message: 'The room pull limit was reached.',
      }
    : null;
}
