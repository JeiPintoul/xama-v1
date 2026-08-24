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
  const attachScreenShareVideo = useCallback(
    (screenShareId: string, element: HTMLVideoElement) =>
      session.attachScreenShareVideo(screenShareId, element),
    [session],
  );
  const detachScreenShareVideo = useCallback(
    (screenShareId: string, element: HTMLVideoElement) =>
      session.detachScreenShareVideo(screenShareId, element),
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
  const getScreenShareDiagnostics = useCallback(
    (screenShareId: string) => session.getScreenShareDiagnostics(screenShareId),
    [session],
  );

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
        attachScreenShareVideo,
        detachScreenShareVideo,
        attachScreenShareAudio,
        detachScreenShareAudio,
        getScreenShareDiagnostics,
        watchScreenShare,
        stopWatchingScreenShare,
      }}
    >
      {children}
    </VoiceSessionContext.Provider>
  );
}
