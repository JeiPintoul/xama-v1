import {
  ConnectionState,
  isRemoteTrack,
  Room,
  RoomEvent,
  Track,
  type RemoteAudioTrack,
} from 'livekit-client';

import { type LiveKitConnectionDetails } from '@/features/voice/livekit-token-client';

export type VoiceConnectionState =
  'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export type VoiceParticipant = Readonly<{
  identity: string;
  name: string;
  isLocal: boolean;
}>;

export type ScreenShare = Readonly<{
  id: string;
  participantIdentity: string;
  participantName: string;
  isLocal: boolean;
  hasAudio: boolean;
  audioTrackId: string | null;
  volume: number;
  mediaStream: MediaStream;
}>;

export type VoiceSessionSnapshot = Readonly<{
  roomName: string | null;
  connectionState: VoiceConnectionState;
  participants: readonly VoiceParticipant[];
  screenShares: readonly ScreenShare[];
  isLocalScreenSharing: boolean;
  screenShareOperation: 'idle' | 'starting' | 'stopping';
  screenShareError: string | null;
  error: string | null;
}>;

export type JoinVoiceRoomRequest = Readonly<{
  roomName: string;
  getConnectionDetails: () => Promise<LiveKitConnectionDetails>;
}>;

type SnapshotListener = () => void;

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
  private readonly screenShareStreams = new Map<string, MediaStream>();
  private readonly screenShareAudioTracks = new Map<string, RemoteAudioTrack>();
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
      const room = new Room();
      this.room = room;
      this.listenToRoom(room);
      await room.connect(connectionDetails.serverUrl, connectionDetails.token);
      this.publishRoomState(room);
    } catch (error) {
      const room = this.room;
      this.room = null;
      this.removeRoomListeners?.();
      this.removeRoomListeners = null;
      await room?.disconnect();
      this.clearScreenShareStreams();
      this.clearScreenShareAudioTracks();
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
    this.clearScreenShareStreams();
    this.clearScreenShareAudioTracks();
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

    remoteParticipant.setVolume(Math.min(1, Math.max(0, volume)), Track.Source.ScreenShareAudio);
    this.publishRoomState(room);
  }

  attachScreenShareAudio(screenShareId: string, element: HTMLAudioElement): void {
    this.screenShareAudioTracks.get(screenShareId)?.attach(element);
  }

  detachScreenShareAudio(screenShareId: string, element: HTMLAudioElement): void {
    this.screenShareAudioTracks.get(screenShareId)?.detach(element);
  }

  async startScreenShare(): Promise<void> {
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
      await room.localParticipant.setScreenShareEnabled(true, {
        audio: true,
        ...(supportsOwnAudioRestriction ? { restrictOwnAudio: true } : {}),
      });
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

    room.on(RoomEvent.ConnectionStateChanged, syncRoomState);
    room.on(RoomEvent.ParticipantConnected, syncRoomState);
    room.on(RoomEvent.ParticipantDisconnected, syncRoomState);
    room.on(RoomEvent.TrackPublished, syncRoomState);
    room.on(RoomEvent.TrackSubscribed, syncRoomState);
    room.on(RoomEvent.TrackUnpublished, syncRoomState);
    room.on(RoomEvent.TrackUnsubscribed, syncRoomState);
    room.on(RoomEvent.LocalTrackPublished, syncLocalScreenShare);
    room.on(RoomEvent.LocalTrackUnpublished, syncLocalScreenShare);
    room.on(RoomEvent.Disconnected, syncRoomState);

    this.removeRoomListeners = () => {
      room.off(RoomEvent.ConnectionStateChanged, syncRoomState);
      room.off(RoomEvent.ParticipantConnected, syncRoomState);
      room.off(RoomEvent.ParticipantDisconnected, syncRoomState);
      room.off(RoomEvent.TrackPublished, syncRoomState);
      room.off(RoomEvent.TrackSubscribed, syncRoomState);
      room.off(RoomEvent.TrackUnpublished, syncRoomState);
      room.off(RoomEvent.TrackUnsubscribed, syncRoomState);
      room.off(RoomEvent.LocalTrackPublished, syncLocalScreenShare);
      room.off(RoomEvent.LocalTrackUnpublished, syncLocalScreenShare);
      room.off(RoomEvent.Disconnected, syncRoomState);
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
    const screenShares = isDisconnected ? [] : this.getScreenShares(room);
    if (isDisconnected) {
      this.clearScreenShareAudioTracks();
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
    const activeAudioShareIds = new Set<string>();
    const screenShares = [room.localParticipant, ...room.remoteParticipants.values()].flatMap(
      (participant) => {
        const screenPublication = participant.getTrackPublication(Track.Source.ScreenShare);
        const videoTrack = screenPublication?.videoTrack?.mediaStreamTrack;

        if (!screenPublication || !videoTrack) {
          return [];
        }

        const remoteParticipant = room.remoteParticipants.get(participant.identity);
        const audioPublication = participant.getTrackPublication(Track.Source.ScreenShareAudio);
        const remoteAudioTrack = remoteParticipant?.getTrackPublication(
          Track.Source.ScreenShareAudio,
        )?.audioTrack;
        const audioTrack = audioPublication?.audioTrack?.mediaStreamTrack;
        const id = `${participant.identity}:${screenPublication.trackSid}`;
        activeShareIds.add(id);
        if (remoteAudioTrack && isRemoteTrack(remoteAudioTrack)) {
          activeAudioShareIds.add(id);
          const existingAudioTrack = this.screenShareAudioTracks.get(id);
          if (existingAudioTrack && existingAudioTrack !== remoteAudioTrack) {
            existingAudioTrack.detach();
          }
          this.screenShareAudioTracks.set(id, remoteAudioTrack);
        }

        return [
          {
            id,
            participantIdentity: participant.identity,
            participantName: participant.name || participant.identity,
            isLocal: participant === room.localParticipant,
            hasAudio: Boolean(audioTrack),
            audioTrackId: audioPublication?.trackSid ?? null,
            volume: remoteParticipant?.getVolume(Track.Source.ScreenShareAudio) ?? 1,
            mediaStream: this.getScreenShareStream(id, [videoTrack]),
          },
        ];
      },
    );

    for (const id of this.screenShareStreams.keys()) {
      if (!activeShareIds.has(id)) {
        this.screenShareStreams.delete(id);
      }
    }

    for (const [id, audioTrack] of this.screenShareAudioTracks) {
      if (!activeAudioShareIds.has(id)) {
        const previousScreenShare = this.snapshot.screenShares.find(
          (screenShare) => screenShare.id === id,
        );
        if (previousScreenShare) {
          room.remoteParticipants
            .get(previousScreenShare.participantIdentity)
            ?.setVolume(1, Track.Source.ScreenShareAudio);
        }
        audioTrack.detach();
        this.screenShareAudioTracks.delete(id);
      }
    }

    return screenShares;
  }

  private getScreenShareStream(id: string, tracks: readonly MediaStreamTrack[]): MediaStream {
    const existingStream = this.screenShareStreams.get(id);
    if (
      existingStream &&
      existingStream.getTracks().length === tracks.length &&
      existingStream.getTracks().every((track, index) => track === tracks[index])
    ) {
      return existingStream;
    }

    const mediaStream = new MediaStream([...tracks]);
    this.screenShareStreams.set(id, mediaStream);
    return mediaStream;
  }

  private clearScreenShareStreams(): void {
    this.screenShareStreams.clear();
  }

  private clearScreenShareAudioTracks(): void {
    this.screenShareAudioTracks.forEach((audioTrack) => audioTrack.detach());
    this.screenShareAudioTracks.clear();
  }

  private setSnapshot(snapshot: VoiceSessionSnapshot): void {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }
}
