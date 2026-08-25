import type { MediaProviderId } from '@xama/media-core';

import type { ParticipantOperation } from './security';

export type AssignedMediaProvider = Exclude<MediaProviderId, 'p2p'>;

export type RealtimeSubscriptionState = Readonly<{
  mid: string;
  leaseId: string;
}>;

export type RealtimeParticipantState = Readonly<{
  id: string;
  name: string;
  realtimeSessionId: string | null;
  capabilityHash: string;
  capabilityExpiresAt: number;
  allowedOperations: readonly ParticipantOperation[];
  lastSeenAt: number;
  subscriptions: Readonly<Record<string, RealtimeSubscriptionState>>;
}>;

export type RealtimeScreenShareState = Readonly<{
  id: string;
  ownerParticipantId: string;
  ownerName: string;
  realtimeSessionId: string;
  providerTrackName: string;
  publisherMid: string;
}>;

export type StoredRealtimeRoom = Readonly<{
  roomId: string;
  provider: AssignedMediaProvider | null;
  participants: readonly RealtimeParticipantState[];
  screenShares: readonly RealtimeScreenShareState[];
}>;

export type ProviderTrackClosure = Readonly<{
  sessionId: string;
  mid: string;
  leaseId?: string;
}>;

export type PublicRealtimeRoom = Readonly<{
  roomId: string;
  provider: AssignedMediaProvider;
  participants: readonly Readonly<{ id: string; name: string }>[];
  screenShares: readonly Readonly<{
    id: string;
    participantId: string;
    participantName: string;
  }>[];
}>;

export class RealtimeRoomState {
  readonly roomId: string;
  private assignedProvider: AssignedMediaProvider | null;
  private readonly participants = new Map<string, RealtimeParticipantState>();
  private readonly screenShares = new Map<string, RealtimeScreenShareState>();

  constructor(roomId: string, stored?: StoredRealtimeRoom) {
    this.roomId = roomId;
    this.assignedProvider = stored?.provider ?? null;
    stored?.participants.forEach((participant) =>
      this.participants.set(participant.id, participant),
    );
    stored?.screenShares.forEach((screenShare) =>
      this.screenShares.set(screenShare.id, screenShare),
    );
  }

  get provider(): AssignedMediaProvider | null {
    return this.assignedProvider;
  }

  get participantCount(): number {
    return this.participants.size;
  }

  get screenShareCount(): number {
    return this.screenShares.size;
  }

  get remotePullCount(): number {
    return [...this.participants.values()].reduce(
      (count, participant) => count + Object.keys(participant.subscriptions).length,
      0,
    );
  }

  assignProvider(provider: AssignedMediaProvider): void {
    if (this.assignedProvider && this.assignedProvider !== provider) {
      throw new Error('The room is already pinned to another media provider.');
    }
    this.assignedProvider = provider;
  }

  addParticipant(participant: Omit<RealtimeParticipantState, 'subscriptions'>): void {
    this.participants.set(participant.id, { ...participant, subscriptions: {} });
  }

  authenticateCapability(
    capabilityHash: string,
    operation: ParticipantOperation,
    now: number,
  ): RealtimeParticipantState | null {
    return (
      [...this.participants.values()].find(
        (participant) =>
          participant.capabilityHash === capabilityHash &&
          participant.capabilityExpiresAt > now &&
          participant.allowedOperations.includes(operation),
      ) ?? null
    );
  }

  touchParticipant(id: string, now: number, capabilityExpiresAt: number): boolean {
    const participant = this.participants.get(id);
    if (!participant) return false;
    this.participants.set(id, { ...participant, lastSeenAt: now, capabilityExpiresAt });
    return true;
  }

  getParticipant(id: string): RealtimeParticipantState | undefined {
    return this.participants.get(id);
  }

  getScreenShare(id: string): RealtimeScreenShareState | undefined {
    return this.screenShares.get(id);
  }

  getParticipantScreenShareCount(participantId: string): number {
    return [...this.screenShares.values()].filter(
      (screenShare) => screenShare.ownerParticipantId === participantId,
    ).length;
  }

  getParticipantRemotePullCount(participantId: string): number {
    return Object.keys(this.participants.get(participantId)?.subscriptions ?? {}).length;
  }

  getParticipantLeaseIds(participantId: string): readonly string[] {
    return Object.values(this.participants.get(participantId)?.subscriptions ?? {}).map(
      (subscription) => subscription.leaseId,
    );
  }

  getAllLeaseIds(): readonly string[] {
    return [...this.participants.values()].flatMap((participant) =>
      Object.values(participant.subscriptions).map((subscription) => subscription.leaseId),
    );
  }

  addScreenShare(screenShare: RealtimeScreenShareState): void {
    if (!this.participants.has(screenShare.ownerParticipantId)) {
      throw new Error('The screen-share owner is not in the room.');
    }
    this.screenShares.set(screenShare.id, screenShare);
  }

  addSubscription(
    participantId: string,
    screenShareId: string,
    subscription: RealtimeSubscriptionState,
  ): void {
    const participant = this.participants.get(participantId);
    if (!participant || !this.screenShares.has(screenShareId)) {
      throw new Error('The participant or screen share no longer exists.');
    }
    this.participants.set(participantId, {
      ...participant,
      subscriptions: { ...participant.subscriptions, [screenShareId]: subscription },
    });
  }

  removeSubscription(participantId: string, screenShareId: string): ProviderTrackClosure[] {
    const participant = this.participants.get(participantId);
    const subscription = participant?.subscriptions[screenShareId];
    if (!participant || !subscription || !participant.realtimeSessionId) return [];
    const subscriptions = { ...participant.subscriptions };
    delete subscriptions[screenShareId];
    this.participants.set(participantId, { ...participant, subscriptions });
    return [
      {
        sessionId: participant.realtimeSessionId,
        mid: subscription.mid,
        leaseId: subscription.leaseId,
      },
    ];
  }

  removeSubscriptionsByLeaseIds(leaseIds: readonly string[]): ProviderTrackClosure[] {
    const leaseIdSet = new Set(leaseIds);
    const closures: ProviderTrackClosure[] = [];
    for (const participant of [...this.participants.values()]) {
      for (const [screenShareId, subscription] of Object.entries(participant.subscriptions)) {
        if (leaseIdSet.has(subscription.leaseId)) {
          closures.push(...this.removeSubscription(participant.id, screenShareId));
        }
      }
    }
    return closures;
  }

  removeScreenShare(screenShareId: string): ProviderTrackClosure[] {
    const screenShare = this.screenShares.get(screenShareId);
    if (!screenShare) return [];
    const closures: ProviderTrackClosure[] = [
      { sessionId: screenShare.realtimeSessionId, mid: screenShare.publisherMid },
    ];
    this.screenShares.delete(screenShareId);
    for (const participant of this.participants.values()) {
      closures.push(...this.removeSubscription(participant.id, screenShareId));
    }
    return closures;
  }

  removeParticipant(participantId: string): ProviderTrackClosure[] {
    const participant = this.participants.get(participantId);
    if (!participant) return [];
    const closures: ProviderTrackClosure[] = [];
    if (participant.realtimeSessionId) {
      for (const subscription of Object.values(participant.subscriptions)) {
        closures.push({
          sessionId: participant.realtimeSessionId,
          mid: subscription.mid,
          leaseId: subscription.leaseId,
        });
      }
    }
    const ownedScreenShareIds = [...this.screenShares.values()]
      .filter((screenShare) => screenShare.ownerParticipantId === participantId)
      .map((screenShare) => screenShare.id);
    for (const screenShareId of ownedScreenShareIds) {
      closures.push(...this.removeScreenShare(screenShareId));
    }
    this.participants.delete(participantId);
    return closures;
  }

  getStaleParticipantIds(now: number, maximumIdleMilliseconds: number): readonly string[] {
    return [...this.participants.values()]
      .filter((participant) => now - participant.lastSeenAt >= maximumIdleMilliseconds)
      .map((participant) => participant.id);
  }

  toPublicRoom(): PublicRealtimeRoom {
    if (!this.assignedProvider) throw new Error('The room has no assigned media provider.');
    return {
      roomId: this.roomId,
      provider: this.assignedProvider,
      participants: [...this.participants.values()].map(({ id, name }) => ({ id, name })),
      screenShares: [...this.screenShares.values()].map((screenShare) => ({
        id: screenShare.id,
        participantId: screenShare.ownerParticipantId,
        participantName: screenShare.ownerName,
      })),
    };
  }

  serialize(): StoredRealtimeRoom {
    return {
      roomId: this.roomId,
      provider: this.assignedProvider,
      participants: [...this.participants.values()],
      screenShares: [...this.screenShares.values()],
    };
  }
}
