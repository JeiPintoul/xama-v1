import { createContext, useContext } from 'react';

import type {
  JoinVoiceRoomRequest,
  ScreenShareMediaDiagnostics,
  ScreenShareQuality,
  VoiceSessionSnapshot,
} from '@/features/voice/media-session';

export type VoiceSessionContextValue = Readonly<{
  snapshot: VoiceSessionSnapshot;
  join: (request: JoinVoiceRoomRequest) => Promise<void>;
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
  stopWatchingScreenShare: () => void;
}>;

export const VoiceSessionContext = createContext<VoiceSessionContextValue | null>(null);

export function useVoiceSession(): VoiceSessionContextValue {
  const context = useContext(VoiceSessionContext);

  if (!context) {
    throw new Error('useVoiceSession must be used within VoiceSessionProvider.');
  }

  return context;
}
