import { ConnectionState, Room, RoomEvent } from 'livekit-client';

import {
  LiveKitTokenRequestError,
  requestLiveKitToken,
  type LiveKitConnectionDetails,
  type LiveKitTokenRequest,
} from '@/features/voice/livekit-token-client';

export type VoiceConnectionState =
  'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export type VoiceParticipant = Readonly<{
  identity: string;
  name: string;
  isLocal: boolean;
}>;

export type VoiceSessionSnapshot = Readonly<{
  roomName: string | null;
  connectionState: VoiceConnectionState;
  participants: readonly VoiceParticipant[];
  error: string | null;
}>;

export type JoinVoiceRoomRequest = LiveKitTokenRequest;

type SnapshotListener = () => void;
type TokenRequester = (request: LiveKitTokenRequest) => Promise<LiveKitConnectionDetails>;

const initialSnapshot: VoiceSessionSnapshot = {
  roomName: null,
  connectionState: 'idle',
  participants: [],
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
  if (error instanceof LiveKitTokenRequestError) {
    return error.message;
  }

  return 'Não foi possível conectar à sala. Tente novamente.';
}

export class LiveKitVoiceSession {
  private room: Room | null = null;
  private snapshot: VoiceSessionSnapshot = initialSnapshot;
  private readonly listeners = new Set<SnapshotListener>();

  constructor(
    private readonly requestToken: TokenRequester = (request) =>
      requestLiveKitToken(import.meta.env.VITE_LIVEKIT_TOKEN_ENDPOINT ?? '', request),
  ) {}

  getSnapshot = (): VoiceSessionSnapshot => this.snapshot;

  subscribe = (listener: SnapshotListener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async join(request: JoinVoiceRoomRequest): Promise<void> {
    await this.leave();
    this.setSnapshot({
      roomName: request.room,
      connectionState: 'connecting',
      participants: [],
      error: null,
    });

    try {
      const connectionDetails = await this.requestToken(request);
      const room = new Room();
      this.room = room;
      this.listenToRoom(room);
      await room.connect(connectionDetails.serverUrl, connectionDetails.token);
      this.publishRoomState(room);
    } catch (error) {
      const room = this.room;
      this.room = null;
      await room?.disconnect();
      this.setSnapshot({
        roomName: null,
        connectionState: 'idle',
        participants: [],
        error: toSafeError(error),
      });
    }
  }

  async leave(): Promise<void> {
    const room = this.room;
    this.room = null;
    await room?.disconnect();
    this.setSnapshot(initialSnapshot);
  }

  private listenToRoom(room: Room): void {
    room.on(RoomEvent.ConnectionStateChanged, () => this.publishRoomState(room));
    room.on(RoomEvent.ParticipantConnected, () => this.publishRoomState(room));
    room.on(RoomEvent.ParticipantDisconnected, () => this.publishRoomState(room));
    room.on(RoomEvent.Disconnected, () => this.publishRoomState(room));
  }

  private publishRoomState(room: Room): void {
    if (this.room !== room) {
      return;
    }

    this.setSnapshot({
      roomName: this.snapshot.roomName,
      connectionState: toVoiceConnectionState(room.state),
      participants: room.state === ConnectionState.Disconnected ? [] : getParticipants(room),
      error: null,
    });
  }

  private setSnapshot(snapshot: VoiceSessionSnapshot): void {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }
}
