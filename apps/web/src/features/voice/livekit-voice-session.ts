import {
  ConnectionState,
  isRemoteTrack,
  Room,
  RoomEvent,
  ScreenSharePresets,
  Track,
  type LocalVideoTrack,
  type RemoteAudioTrack,
  type RemoteTrackPublication,
  type RemoteVideoTrack,
  type TrackPublishOptions,
} from 'livekit-client';

import type {
  JoinVoiceRoomRequest,
  ScreenShare,
  ScreenShareMediaDiagnostics,
  ScreenShareQuality,
  VoiceConnectionState,
  VoiceParticipant,
  VoiceSessionSnapshot,
} from '@/features/voice/media-session';
import { getScreenShareMuteVolume } from '@/features/voice/media-session';

const viewerPresenceTopic = 'xama.screen-share-viewer';

function getScreenSharePublishOptions(quality: ScreenShareQuality): TrackPublishOptions {
  if (quality === 'balanced') {
    return {
      simulcast: true,
      screenShareEncoding: ScreenSharePresets.h720fps30.encoding,
      screenShareSimulcastLayers: [ScreenSharePresets.h360fps15],
    };
  }

  return {
    simulcast: true,
    screenShareEncoding: ScreenSharePresets.h1080fps30.encoding,
    screenShareSimulcastLayers: [ScreenSharePresets.h360fps15, ScreenSharePresets.h720fps15],
  };
}

const defaultScreenSharePublishOptions = getScreenSharePublishOptions('high');

type SnapshotListener = () => void;

type ScreenShareVolumeTarget = Readonly<{
  setVolume: (volume: number, source: Track.Source.ScreenShareAudio) => void;
}>;

export function applyRemoteScreenShareVolume(
  target: ScreenShareVolumeTarget,
  volume: number,
): void {
  target.setVolume(volume, Track.Source.ScreenShareAudio);
}

const initialSnapshot: VoiceSessionSnapshot = {
  roomName: null,
  connectionState: 'idle',
  participants: [],
  screenShares: [],
  isLocalScreenSharing: false,
  screenShareOperation: 'idle',
  screenShareError: null,
  error: null,
};

function toVoiceConnectionState(state: ConnectionState): VoiceConnectionState {
  switch (state) {
    case ConnectionState.Connecting:
      return 'connecting';
    case ConnectionState.Connected:
      return 'connected';
    case ConnectionState.Reconnecting:
    case ConnectionState.SignalReconnecting:
      return 'reconnecting';
    case ConnectionState.Disconnected:
      return 'disconnected';
  }
}

function getParticipants(room: Room): readonly VoiceParticipant[] {
  const localParticipant: VoiceParticipant = {
    identity: room.localParticipant.identity,
    name: room.localParticipant.name || room.localParticipant.identity,
    isLocal: true,
  };
  const remoteParticipants = Array.from(room.remoteParticipants.values(), (participant) => ({
    identity: participant.identity,
    name: participant.name || participant.identity,
    isLocal: false,
  }));

  return [localParticipant, ...remoteParticipants];
}

function toSafeError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Não foi possível conectar à sala. Tente novamente.';
}

export class LiveKitVoiceSession {
  private room: Room | null = null;
  private snapshot: VoiceSessionSnapshot = initialSnapshot;
  private readonly listeners = new Set<SnapshotListener>();
  private readonly screenShareVideoTracks = new Map<string, LocalVideoTrack | RemoteVideoTrack>();
  private readonly screenShareAudioTracks = new Map<string, RemoteAudioTrack>();
  private readonly screenShareVolumes = new Map<string, number>();
  private readonly screenShareLastAudibleVolumes = new Map<string, number>();
  private readonly screenShareViewerSelections = new Map<string, string>();
  private removeRoomListeners: (() => void) | null = null;

  getSnapshot = (): VoiceSessionSnapshot => this.snapshot;

  subscribe = (listener: SnapshotListener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async join(request: JoinVoiceRoomRequest): Promise<void> {
    await this.leave();
    this.setSnapshot({
      roomName: request.roomName,
      connectionState: 'connecting',
      participants: [],
      screenShares: [],
      isLocalScreenSharing: false,
      screenShareOperation: 'idle',
      screenShareError: null,
      error: null,
    });

    try {
      const connectionDetails = await request.getConnectionDetails();
      const room = new Room({
        adaptiveStream: { pauseVideoInBackground: true },
        dynacast: true,
        publishDefaults: defaultScreenSharePublishOptions,
      });
      this.room = room;
      this.listenToRoom(room);
      await room.connect(connectionDetails.serverUrl, connectionDetails.token, {
        autoSubscribe: false,
      });
      this.publishRoomState(room);
      void this.requestViewerPresence(room);
    } catch (error) {
      const room = this.room;
      this.room = null;
      this.removeRoomListeners?.();
      this.removeRoomListeners = null;
      await room?.disconnect();
      this.clearScreenShareVideoTracks();
      this.clearScreenShareAudioTracks();
      this.clearScreenSharePresence();
      this.setSnapshot({
        roomName: null,
        connectionState: 'idle',
        participants: [],
        screenShares: [],
        isLocalScreenSharing: false,
        screenShareOperation: 'idle',
        screenShareError: null,
        error: toSafeError(error),
      });
    }
  }

  async leave(): Promise<void> {
    const room = this.room;
    this.room = null;
    this.removeRoomListeners?.();
    this.removeRoomListeners = null;
    await room?.disconnect();
    this.clearScreenShareVideoTracks();
    this.clearScreenShareAudioTracks();
    this.clearScreenSharePresence();
    this.setSnapshot(initialSnapshot);
  }

  setScreenShareVolume(screenShareId: string, volume: number): void {
    const room = this.room;
    const screenShare = this.snapshot.screenShares.find(
      (candidate) => candidate.id === screenShareId,
    );
    if (
      !room ||
      room.state !== ConnectionState.Connected ||
      !screenShare ||
      screenShare.isLocal ||
      !screenShare.hasAudio
    ) {
      return;
    }

    const remoteParticipant = room.remoteParticipants.get(screenShare.participantIdentity);
    if (!remoteParticipant) {
      return;
    }

    const normalizedVolume = Math.min(1, Math.max(0, volume));
    applyRemoteScreenShareVolume(remoteParticipant, normalizedVolume);
    this.screenShareVolumes.set(screenShareId, normalizedVolume);
    if (normalizedVolume > 0) {
      this.screenShareLastAudibleVolumes.set(screenShareId, normalizedVolume);
    }
    this.publishRoomState(room);
  }

  toggleScreenShareMute(screenShareId: string): void {
    const currentVolume = this.screenShareVolumes.get(screenShareId) ?? 1;
    this.setScreenShareVolume(
      screenShareId,
      getScreenShareMuteVolume(
        currentVolume,
        this.screenShareLastAudibleVolumes.get(screenShareId),
      ),
    );
  }

  watchScreenShare(screenShareId: string): void {
    const room = this.room;
    const screenShare = this.snapshot.screenShares.find(
      (candidate) => candidate.id === screenShareId,
    );
    if (!room || room.state !== ConnectionState.Connected || !screenShare) {
      return;
    }

    const previousScreenShareId = this.screenShareViewerSelections.get(
      room.localParticipant.identity,
    );
    if (previousScreenShareId && previousScreenShareId !== screenShareId) {
      const previousScreenShare = this.snapshot.screenShares.find(
        (candidate) => candidate.id === previousScreenShareId,
      );
      if (previousScreenShare) {
        this.setRemoteScreenShareSubscribed(room, previousScreenShare, false);
      }
      this.detachScreenShareMedia(previousScreenShareId);
    }

    this.screenShareViewerSelections.set(room.localParticipant.identity, screenShareId);
    this.setRemoteScreenShareSubscribed(room, screenShare, true);
    this.publishRoomState(room);
    void this.publishViewerPresence(room, screenShareId);
  }

  stopWatchingScreenShare(): void {
    const room = this.room;
    if (!room || room.state !== ConnectionState.Connected) {
      return;
    }

    const screenShareId = this.screenShareViewerSelections.get(room.localParticipant.identity);
    const screenShare = this.snapshot.screenShares.find(
      (candidate) => candidate.id === screenShareId,
    );
    if (screenShare) {
      this.setRemoteScreenShareSubscribed(room, screenShare, false);
    }
    if (screenShareId) {
      this.detachScreenShareMedia(screenShareId);
    }
    this.screenShareViewerSelections.delete(room.localParticipant.identity);
    this.publishRoomState(room);
    void this.publishViewerPresence(room, null);
  }

  attachScreenShareVideo(screenShareId: string, element: HTMLVideoElement): void {
    this.screenShareVideoTracks.get(screenShareId)?.attach(element);
  }

  detachScreenShareVideo(screenShareId: string, element: HTMLVideoElement): void {
    this.screenShareVideoTracks.get(screenShareId)?.detach(element);
  }

  attachScreenShareAudio(screenShareId: string, element: HTMLAudioElement): void {
    this.applyStoredScreenShareVolume(screenShareId);
    this.screenShareAudioTracks.get(screenShareId)?.attach(element);
  }

  detachScreenShareAudio(screenShareId: string, element: HTMLAudioElement): void {
    this.screenShareAudioTracks.get(screenShareId)?.detach(element);
  }

  async getScreenShareDiagnostics(
    screenShareId: string,
  ): Promise<ScreenShareMediaDiagnostics | null> {
    const screenShare = this.snapshot.screenShares.find(
      (candidate) => candidate.id === screenShareId,
    );
    const videoTrack = this.screenShareVideoTracks.get(screenShareId);
    if (!screenShare || !videoTrack) {
      return null;
    }

    const statsReport = await videoTrack.getRTCStatsReport();
    const stats = getVideoRtpStats(statsReport, screenShare.isLocal);

    return {
      provider: 'LiveKit',
      bitrateKbps:
        videoTrack.currentBitrate > 0 ? Math.round(videoTrack.currentBitrate / 1_000) : null,
      framesPerSecond: stats?.framesPerSecond ?? null,
      codec: getCodec(statsReport, stats?.codecId) ?? this.getScreenShareCodec(screenShare),
      streamState: toMediaStreamState(videoTrack.streamState),
    };
  }

  async startScreenShare(quality: ScreenShareQuality = 'high'): Promise<void> {
    const room = this.room;
    if (!room || room.state !== ConnectionState.Connected) {
      return;
    }

    this.setSnapshot({
      ...this.snapshot,
      screenShareOperation: 'starting',
      screenShareError: null,
    });

    try {
      const supportedConstraints =
        typeof navigator !== 'undefined'
          ? navigator.mediaDevices?.getSupportedConstraints?.()
          : undefined;
      const supportsOwnAudioRestriction =
        (
          supportedConstraints as
            (MediaTrackSupportedConstraints & { restrictOwnAudio?: boolean }) | undefined
        )?.restrictOwnAudio === true;
      await room.localParticipant.setScreenShareEnabled(
        true,
        {
          audio: true,
          resolution:
            quality === 'balanced'
              ? ScreenSharePresets.h720fps30.resolution
              : ScreenSharePresets.h1080fps30.resolution,
          ...(supportsOwnAudioRestriction ? { restrictOwnAudio: true } : {}),
        },
        getScreenSharePublishOptions(quality),
      );
      this.publishRoomState(room, { screenShareOperation: 'idle', screenShareError: null });
    } catch {
      if (this.room !== room) {
        return;
      }

      this.publishRoomState(room, {
        screenShareOperation: 'idle',
        screenShareError: 'O compartilhamento de tela não foi iniciado. Tente novamente.',
      });
    }
  }

  async stopScreenShare(): Promise<void> {
    const room = this.room;
    if (!room || room.state !== ConnectionState.Connected) {
      return;
    }

    this.setSnapshot({
      ...this.snapshot,
      screenShareOperation: 'stopping',
      screenShareError: null,
    });

    try {
      await room.localParticipant.setScreenShareEnabled(false);
      this.publishRoomState(room, { screenShareOperation: 'idle', screenShareError: null });
    } catch {
      if (this.room !== room) {
        return;
      }

      this.publishRoomState(room, {
        screenShareOperation: 'idle',
        screenShareError: 'Não foi possível parar o compartilhamento de tela.',
      });
    }
  }

  private listenToRoom(room: Room): void {
    const syncRoomState = () => this.publishRoomState(room);
    const syncLocalScreenShare = () =>
      this.publishRoomState(room, { screenShareOperation: 'idle', screenShareError: null });
    const removeViewerPresence = (participant: { identity: string }) => {
      this.screenShareViewerSelections.delete(participant.identity);
      syncRoomState();
    };
    const syncViewerPresence = (
      payload: Uint8Array,
      participant: { identity: string } | undefined,
      _kind: unknown,
      topic: string | undefined,
    ) => {
      if (topic === viewerPresenceTopic && participant) {
        this.handleViewerPresence(room, payload, participant.identity);
      }
    };

    room.on(RoomEvent.ConnectionStateChanged, syncRoomState);
    room.on(RoomEvent.ParticipantConnected, syncRoomState);
    room.on(RoomEvent.ParticipantDisconnected, removeViewerPresence);
    room.on(RoomEvent.TrackPublished, syncRoomState);
    room.on(RoomEvent.TrackSubscribed, syncRoomState);
    room.on(RoomEvent.TrackUnpublished, syncRoomState);
    room.on(RoomEvent.TrackUnsubscribed, syncRoomState);
    room.on(RoomEvent.LocalTrackPublished, syncLocalScreenShare);
    room.on(RoomEvent.LocalTrackUnpublished, syncLocalScreenShare);
    room.on(RoomEvent.Disconnected, syncRoomState);
    room.on(RoomEvent.DataReceived, syncViewerPresence);

    this.removeRoomListeners = () => {
      room.off(RoomEvent.ConnectionStateChanged, syncRoomState);
      room.off(RoomEvent.ParticipantConnected, syncRoomState);
      room.off(RoomEvent.ParticipantDisconnected, removeViewerPresence);
      room.off(RoomEvent.TrackPublished, syncRoomState);
      room.off(RoomEvent.TrackSubscribed, syncRoomState);
      room.off(RoomEvent.TrackUnpublished, syncRoomState);
      room.off(RoomEvent.TrackUnsubscribed, syncRoomState);
      room.off(RoomEvent.LocalTrackPublished, syncLocalScreenShare);
      room.off(RoomEvent.LocalTrackUnpublished, syncLocalScreenShare);
      room.off(RoomEvent.Disconnected, syncRoomState);
      room.off(RoomEvent.DataReceived, syncViewerPresence);
    };
  }

  private publishRoomState(
    room: Room,
    screenShareState: Pick<VoiceSessionSnapshot, 'screenShareOperation' | 'screenShareError'> = {
      screenShareOperation: this.snapshot.screenShareOperation,
      screenShareError: this.snapshot.screenShareError,
    },
  ): void {
    if (this.room !== room) {
      return;
    }

    const isDisconnected = room.state === ConnectionState.Disconnected;
    if (!isDisconnected) {
      this.syncWatchedScreenShareSubscriptions(room);
    }
    const localWatchedScreenShareId = this.screenShareViewerSelections.get(
      room.localParticipant.identity,
    );
    const screenShares = isDisconnected ? [] : this.getScreenShares(room);
    if (
      localWatchedScreenShareId &&
      !screenShares.some((screenShare) => screenShare.id === localWatchedScreenShareId)
    ) {
      const previousScreenShare = this.snapshot.screenShares.find(
        (screenShare) => screenShare.id === localWatchedScreenShareId,
      );
      if (previousScreenShare) {
        this.setRemoteScreenShareSubscribed(room, previousScreenShare, false);
      }
      this.detachScreenShareMedia(localWatchedScreenShareId);
      this.screenShareViewerSelections.delete(room.localParticipant.identity);
      void this.publishViewerPresence(room, null);
    }

    const activeScreenShareIds = new Set(screenShares.map((screenShare) => screenShare.id));
    for (const [identity, screenShareId] of this.screenShareViewerSelections) {
      if (!activeScreenShareIds.has(screenShareId)) {
        this.screenShareViewerSelections.delete(identity);
      }
    }

    if (isDisconnected) {
      this.clearScreenShareVideoTracks();
      this.clearScreenShareAudioTracks();
      this.clearScreenSharePresence();
    }
    this.setSnapshot({
      roomName: this.snapshot.roomName,
      connectionState: toVoiceConnectionState(room.state),
      participants: isDisconnected ? [] : getParticipants(room),
      screenShares,
      isLocalScreenSharing: screenShares.some((screenShare) => screenShare.isLocal),
      ...screenShareState,
      error: null,
    });
  }

  private getScreenShares(room: Room): readonly ScreenShare[] {
    const activeShareIds = new Set<string>();
    const activeVideoTrackIds = new Set<string>();
    const activeAudioTrackIds = new Set<string>();
    const localWatchedScreenShareId = this.screenShareViewerSelections.get(
      room.localParticipant.identity,
    );
    const screenShares = [
      room.localParticipant,
      ...room.remoteParticipants.values(),
    ].flatMap<ScreenShare>((participant) => {
      const screenPublication = participant.getTrackPublication(Track.Source.ScreenShare);

      if (!screenPublication) {
        return [];
      }

      const videoTrack = screenPublication.videoTrack;
      const isLocal = participant === room.localParticipant;
      const remoteParticipant = room.remoteParticipants.get(participant.identity);
      const audioPublication = participant.getTrackPublication(Track.Source.ScreenShareAudio);
      const remoteAudioTrack = remoteParticipant?.getTrackPublication(
        Track.Source.ScreenShareAudio,
      )?.audioTrack;
      const id = `${participant.identity}:${screenPublication.trackSid}`;
      const isWatched = localWatchedScreenShareId === id;
      activeShareIds.add(id);

      if (videoTrack && (isLocal || isWatched)) {
        activeVideoTrackIds.add(id);
        this.setScreenShareVideoTrack(id, videoTrack);
      }
      if (isWatched && remoteAudioTrack && isRemoteTrack(remoteAudioTrack)) {
        activeAudioTrackIds.add(id);
        this.setScreenShareAudioTrack(id, remoteAudioTrack);
        this.applyStoredScreenShareVolume(id, participant.identity);
      }

      return [
        {
          id,
          participantIdentity: participant.identity,
          participantName: participant.name || participant.identity,
          isLocal,
          hasAudio: Boolean(audioPublication),
          audioState: !audioPublication
            ? 'none'
            : !isLocal && !isWatched
              ? 'available'
              : isLocal || remoteAudioTrack
                ? 'ready'
                : 'subscribing',
          audioTrackId: audioPublication?.trackSid ?? null,
          watchState: !isWatched ? 'available' : isLocal || videoTrack ? 'ready' : 'subscribing',
          volume: this.screenShareVolumes.get(id) ?? 1,
          viewers: this.getScreenShareViewers(room, id),
        },
      ];
    });

    for (const [id, videoTrack] of this.screenShareVideoTracks) {
      if (!activeVideoTrackIds.has(id)) {
        videoTrack.detach();
        this.screenShareVideoTracks.delete(id);
      }
    }

    for (const id of this.screenShareVolumes.keys()) {
      if (!activeShareIds.has(id)) {
        this.screenShareVolumes.delete(id);
        this.screenShareLastAudibleVolumes.delete(id);
      }
    }

    for (const [id, audioTrack] of this.screenShareAudioTracks) {
      if (!activeAudioTrackIds.has(id)) {
        audioTrack.detach();
        this.screenShareAudioTracks.delete(id);
      }
    }

    return screenShares;
  }

  private setScreenShareVideoTrack(
    id: string,
    videoTrack: LocalVideoTrack | RemoteVideoTrack,
  ): void {
    const previousTrack = this.screenShareVideoTracks.get(id);
    if (previousTrack && previousTrack !== videoTrack) {
      previousTrack.detach();
    }
    this.screenShareVideoTracks.set(id, videoTrack);
  }

  private setScreenShareAudioTrack(id: string, audioTrack: RemoteAudioTrack): void {
    const previousTrack = this.screenShareAudioTracks.get(id);
    if (previousTrack && previousTrack !== audioTrack) {
      previousTrack.detach();
    }
    this.screenShareAudioTracks.set(id, audioTrack);
  }

  private applyStoredScreenShareVolume(screenShareId: string, participantIdentity?: string): void {
    const room = this.room;
    if (!room) return;

    const identity =
      participantIdentity ??
      this.snapshot.screenShares.find((screenShare) => screenShare.id === screenShareId)
        ?.participantIdentity;
    if (!identity) return;

    const participant = room.remoteParticipants.get(identity);
    if (participant) {
      applyRemoteScreenShareVolume(participant, this.screenShareVolumes.get(screenShareId) ?? 1);
    }
  }

  private detachScreenShareMedia(screenShareId: string): void {
    this.screenShareVideoTracks.get(screenShareId)?.detach();
    this.screenShareVideoTracks.delete(screenShareId);
    this.screenShareAudioTracks.get(screenShareId)?.detach();
    this.screenShareAudioTracks.delete(screenShareId);
  }

  private clearScreenShareVideoTracks(): void {
    this.screenShareVideoTracks.forEach((videoTrack) => videoTrack.detach());
    this.screenShareVideoTracks.clear();
  }

  private clearScreenShareAudioTracks(): void {
    this.screenShareAudioTracks.forEach((audioTrack) => audioTrack.detach());
    this.screenShareAudioTracks.clear();
  }

  private syncWatchedScreenShareSubscriptions(room: Room): void {
    const watchedScreenShareId = this.screenShareViewerSelections.get(
      room.localParticipant.identity,
    );
    if (!watchedScreenShareId) {
      return;
    }

    const screenShare = this.snapshot.screenShares.find(
      (candidate) => candidate.id === watchedScreenShareId,
    );
    if (screenShare) {
      this.setRemoteScreenShareSubscribed(room, screenShare, true);
    }
  }

  private setRemoteScreenShareSubscribed(
    room: Room,
    screenShare: ScreenShare,
    subscribed: boolean,
  ): void {
    if (screenShare.isLocal) {
      return;
    }

    const participant = room.remoteParticipants.get(screenShare.participantIdentity);
    if (!participant) {
      return;
    }

    setScreenSharePublicationSubscribed(
      participant.getTrackPublication(Track.Source.ScreenShare),
      subscribed,
    );
    setScreenSharePublicationSubscribed(
      participant.getTrackPublication(Track.Source.ScreenShareAudio),
      subscribed,
    );
  }

  private getScreenShareCodec(screenShare: ScreenShare): string | null {
    const room = this.room;
    if (!room) {
      return null;
    }

    const participant = screenShare.isLocal
      ? room.localParticipant
      : room.remoteParticipants.get(screenShare.participantIdentity);
    return participant?.getTrackPublication(Track.Source.ScreenShare)?.mimeType ?? null;
  }

  private getScreenShareViewers(room: Room, screenShareId: string): readonly VoiceParticipant[] {
    const participants = getParticipants(room);
    return Array.from(this.screenShareViewerSelections.entries()).flatMap(
      ([identity, watchedScreenShareId]) => {
        if (watchedScreenShareId !== screenShareId) {
          return [];
        }

        const participant = participants.find((candidate) => candidate.identity === identity);
        return participant ? [participant] : [];
      },
    );
  }

  private handleViewerPresence(room: Room, payload: Uint8Array, participantIdentity: string): void {
    try {
      const message: unknown = JSON.parse(new TextDecoder().decode(payload));
      if (!isViewerPresenceMessage(message)) {
        return;
      }

      if (message.type === 'request') {
        void this.publishViewerPresence(
          room,
          this.screenShareViewerSelections.get(room.localParticipant.identity) ?? null,
        );
        return;
      }

      if (message.screenShareId) {
        this.screenShareViewerSelections.set(participantIdentity, message.screenShareId);
      } else {
        this.screenShareViewerSelections.delete(participantIdentity);
      }
      this.publishRoomState(room);
    } catch {
      return;
    }
  }

  private publishViewerPresence(room: Room, screenShareId: string | null): void {
    if (this.room !== room || room.state !== ConnectionState.Connected) {
      return;
    }

    void room.localParticipant
      .publishData(new TextEncoder().encode(JSON.stringify({ type: 'selection', screenShareId })), {
        reliable: true,
        topic: viewerPresenceTopic,
      })
      .catch(() => undefined);
  }

  private requestViewerPresence(room: Room): void {
    if (this.room !== room || room.state !== ConnectionState.Connected) {
      return;
    }

    void room.localParticipant
      .publishData(new TextEncoder().encode(JSON.stringify({ type: 'request' })), {
        reliable: true,
        topic: viewerPresenceTopic,
      })
      .catch(() => undefined);
  }

  private clearScreenSharePresence(): void {
    this.screenShareVolumes.clear();
    this.screenShareLastAudibleVolumes.clear();
    this.screenShareViewerSelections.clear();
  }

  private setSnapshot(snapshot: VoiceSessionSnapshot): void {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }
}

function isViewerPresenceMessage(
  message: unknown,
): message is { type: 'request' } | { type: 'selection'; screenShareId: string | null } {
  if (!message || typeof message !== 'object' || !('type' in message)) {
    return false;
  }

  if (message.type === 'request') {
    return true;
  }

  return (
    message.type === 'selection' &&
    'screenShareId' in message &&
    (typeof message.screenShareId === 'string' || message.screenShareId === null)
  );
}

type SubscribablePublication = Pick<RemoteTrackPublication, 'isDesired' | 'setSubscribed'>;

export function setScreenSharePublicationSubscribed(
  publication: SubscribablePublication | undefined,
  subscribed: boolean,
): void {
  if (publication && publication.isDesired !== subscribed) {
    publication.setSubscribed(subscribed);
  }
}

type VideoRtpStats = RTCStats &
  Readonly<{
    codecId?: string;
    framesPerSecond?: number;
    kind?: string;
    mediaType?: string;
  }>;

type CodecStats = RTCStats & Readonly<{ mimeType?: string }>;

function getVideoRtpStats(
  statsReport: RTCStatsReport | undefined,
  isLocal: boolean,
): VideoRtpStats | null {
  if (!statsReport) {
    return null;
  }

  const expectedType = isLocal ? 'outbound-rtp' : 'inbound-rtp';
  let videoStats: VideoRtpStats | null = null;
  statsReport.forEach((stats) => {
    const candidate = stats as VideoRtpStats;
    if (
      candidate.type === expectedType &&
      (candidate.kind === 'video' || candidate.mediaType === 'video')
    ) {
      videoStats = candidate;
    }
  });
  return videoStats;
}

function getCodec(
  statsReport: RTCStatsReport | undefined,
  codecId: string | undefined,
): string | null {
  if (!statsReport || !codecId) {
    return null;
  }

  const stats = statsReport.get(codecId) as CodecStats | undefined;
  return stats?.mimeType ?? null;
}

function toMediaStreamState(
  streamState: Track.StreamState,
): ScreenShareMediaDiagnostics['streamState'] {
  switch (streamState) {
    case Track.StreamState.Active:
      return 'active';
    case Track.StreamState.Paused:
      return 'paused';
    case Track.StreamState.Unknown:
      return 'unknown';
  }
}
