export type MediaParticipant = Readonly<{
  identity: string;
  name: string;
  isLocal: boolean;
}>;

export type ScreenShareViewer = MediaParticipant;

export type MediaConnectionState =
  'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export type ScreenShareWatchState = 'available' | 'subscribing' | 'ready';

export type ScreenShareAudioState = 'none' | 'available' | 'subscribing' | 'ready';

export type ScreenShareQuality = 'balanced' | 'high';

export type ScreenShareMediaDiagnostics = Readonly<{
  provider: string;
  bitrateKbps: number | null;
  framesPerSecond: number | null;
  codec: string | null;
  streamState: 'active' | 'paused' | 'unknown';
}>;

export type ScreenShare = Readonly<{
  id: string;
  participantIdentity: string;
  participantName: string;
  isLocal: boolean;
  hasAudio: boolean;
  audioState: ScreenShareAudioState;
  audioTrackId: string | null;
  watchState: ScreenShareWatchState;
  volume: number;
  viewers: readonly ScreenShareViewer[];
}>;

export type MediaSessionSnapshot = Readonly<{
  roomName: string | null;
  connectionState: MediaConnectionState;
  participants: readonly MediaParticipant[];
  screenShares: readonly ScreenShare[];
  isLocalScreenSharing: boolean;
  screenShareOperation: 'idle' | 'starting' | 'stopping';
  screenShareError: string | null;
  error: string | null;
}>;

export function getScreenShareMuteVolume(
  currentVolume: number,
  lastAudibleVolume: number | undefined,
): number {
  return currentVolume > 0 ? 0 : (lastAudibleVolume ?? 1);
}
