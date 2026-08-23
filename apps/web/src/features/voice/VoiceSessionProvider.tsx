import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { PropsWithChildren } from 'react';

import {
  LiveKitVoiceSession,
  type JoinVoiceRoomRequest,
} from '@/features/voice/livekit-voice-session';
import { VoiceSessionContext } from '@/features/voice/voice-session-context';

export function VoiceSessionProvider({ children }: PropsWithChildren) {
  const [session] = useState(() => new LiveKitVoiceSession());
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  const join = useCallback((request: JoinVoiceRoomRequest) => session.join(request), [session]);
  const leave = useCallback(() => session.leave(), [session]);

  useEffect(() => () => void session.leave(), [session]);

  return (
    <VoiceSessionContext.Provider value={{ snapshot, join, leave }}>
      {children}
    </VoiceSessionContext.Provider>
  );
}
