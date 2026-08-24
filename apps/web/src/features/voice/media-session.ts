export type VoiceConnectionState =
  'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export type VoiceParticipant = Readonly<{
  identity: string;
  name: string;
  isLocal: boolean;
}>;

export type ScreenShareViewer = VoiceParticipant;

export type ScreenShare = Readonly<{
  id: string;
  participantIdentity: string;
  participantName: string;
  isLocal: boolean;
  hasAudio: boolean;
  audioTrackId: string | null;
  volume: number;
  viewers: readonly ScreenShareViewer[];
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

export type MediaConnectionDetails = Readonly<{
  serverUrl: string;
  token: string;
}>;

export type JoinVoiceRoomRequest = Readonly<{
  roomName: string;
  getConnectionDetails: () => Promise<MediaConnectionDetails>;
}>;
