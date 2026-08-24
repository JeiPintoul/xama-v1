import { createContext, useContext } from 'react';

import type { JoinVoiceRoomRequest, VoiceSessionSnapshot } from '@/features/voice/media-session';

export type VoiceSessionContextValue = Readonly<{
  snapshot: VoiceSessionSnapshot;
  join: (request: JoinVoiceRoomRequest) => Promise<void>;
  leave: () => Promise<void>;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  setScreenShareVolume: (screenShareId: string, volume: number) => void;
  attachScreenShareAudio: (screenShareId: string, element: HTMLAudioElement) => void;
  detachScreenShareAudio: (screenShareId: string, element: HTMLAudioElement) => void;
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
