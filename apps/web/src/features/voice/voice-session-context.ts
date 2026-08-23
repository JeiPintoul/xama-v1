import { createContext, useContext } from 'react';

import type {
  JoinVoiceRoomRequest,
  VoiceSessionSnapshot,
} from '@/features/voice/livekit-voice-session';

export type VoiceSessionContextValue = Readonly<{
  snapshot: VoiceSessionSnapshot;
  join: (request: JoinVoiceRoomRequest) => Promise<void>;
  leave: () => Promise<void>;
}>;

export const VoiceSessionContext = createContext<VoiceSessionContextValue | null>(null);

export function useVoiceSession(): VoiceSessionContextValue {
  const context = useContext(VoiceSessionContext);

  if (!context) {
    throw new Error('useVoiceSession must be used within VoiceSessionProvider.');
  }

  return context;
}
