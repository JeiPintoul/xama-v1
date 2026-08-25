import type {
  MediaSessionSnapshot,
  ScreenShareMediaDiagnostics,
  ScreenShareQuality,
} from '@xama/media-core';

export type {
  ScreenShare,
  ScreenShareAudioState,
  ScreenShareMediaDiagnostics,
  ScreenShareQuality,
  ScreenShareViewer,
  ScreenShareWatchState,
} from '@xama/media-core';
export { getScreenShareMuteVolume } from '@xama/media-core';

export type VoiceConnectionState = import('@xama/media-core').MediaConnectionState;
export type VoiceParticipant = import('@xama/media-core').MediaParticipant;
export type VoiceSessionSnapshot = MediaSessionSnapshot;

export type MediaConnectionDetails = Readonly<{
  serverUrl: string;
  token: string;
}>;

export type JoinVoiceRoomRequest = Readonly<{
  roomName: string;
  getConnectionDetails: () => Promise<MediaConnectionDetails>;
}>;

export type BrowserMediaSession = Readonly<{
  getSnapshot: () => VoiceSessionSnapshot;
  subscribe: (listener: () => void) => () => void;
  leave: () => Promise<void>;
  startScreenShare: (quality?: ScreenShareQuality) => Promise<void>;
  stopScreenShare: () => Promise<void>;
  setScreenShareVolume: (screenShareId: string, volume: number) => void;
  toggleScreenShareMute: (screenShareId: string) => void;
  attachScreenShareVideo: (screenShareId: string, element: HTMLVideoElement) => void;
  detachScreenShareVideo: (screenShareId: string, element: HTMLVideoElement) => void;
  attachScreenShareAudio: (screenShareId: string, element: HTMLAudioElement) => void;
  detachScreenShareAudio: (screenShareId: string, element: HTMLAudioElement) => void;
  getScreenShareDiagnostics: (screenShareId: string) => Promise<ScreenShareMediaDiagnostics | null>;
  watchScreenShare: (screenShareId: string) => void;
  stopWatchingScreenShare: (screenShareId: string) => void;
}>;
