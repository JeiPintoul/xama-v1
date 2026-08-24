import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { PropsWithChildren } from 'react';

import { LiveKitVoiceSession } from '@/features/voice/livekit-voice-session';
import type { JoinVoiceRoomRequest } from '@/features/voice/media-session';
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
  const startScreenShare = useCallback(() => session.startScreenShare(), [session]);
  const stopScreenShare = useCallback(() => session.stopScreenShare(), [session]);
  const setScreenShareVolume = useCallback(
    (screenShareId: string, volume: number) => session.setScreenShareVolume(screenShareId, volume),
    [session],
  );
  const attachScreenShareAudio = useCallback(
    (screenShareId: string, element: HTMLAudioElement) =>
      session.attachScreenShareAudio(screenShareId, element),
    [session],
  );
  const detachScreenShareAudio = useCallback(
    (screenShareId: string, element: HTMLAudioElement) =>
      session.detachScreenShareAudio(screenShareId, element),
    [session],
  );
  const watchScreenShare = useCallback(
    (screenShareId: string) => session.watchScreenShare(screenShareId),
    [session],
  );
  const stopWatchingScreenShare = useCallback(() => session.stopWatchingScreenShare(), [session]);

  useEffect(() => () => void session.leave(), [session]);

  return (
    <VoiceSessionContext.Provider
      value={{
        snapshot,
        join,
        leave,
        startScreenShare,
        stopScreenShare,
        setScreenShareVolume,
        attachScreenShareAudio,
        detachScreenShareAudio,
        watchScreenShare,
        stopWatchingScreenShare,
      }}
    >
      {children}
    </VoiceSessionContext.Provider>
  );
}
