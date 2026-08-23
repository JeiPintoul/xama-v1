import { useEffect, useRef, useState } from 'react';

import type { ScreenShare } from '@/features/voice/livekit-voice-session';

type ScreenShareVideoProps = Readonly<{
  screenShare: ScreenShare;
  onFocus?: (screenShareId: string) => void;
  variant?: 'grid' | 'focus';
}>;

export function ScreenShareVideo({
  screenShare,
  onFocus,
  variant = 'grid',
}: ScreenShareVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [requiresAudioActivation, setRequiresAudioActivation] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.srcObject = screenShare.mediaStream;
    video.muted = screenShare.isLocal;
    void video.play().then(
      () => setRequiresAudioActivation(false),
      () => setRequiresAudioActivation(!screenShare.isLocal && screenShare.hasAudio),
    );

    return () => {
      video.srcObject = null;
    };
  }, [screenShare.hasAudio, screenShare.isLocal, screenShare.mediaStream]);

  function activateAudio() {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    void video.play().then(
      () => setRequiresAudioActivation(false),
      () => setRequiresAudioActivation(true),
    );
  }

  return (
    <article
      className={
        variant === 'focus'
          ? 'flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-background'
          : 'overflow-hidden rounded-lg border border-border bg-background'
      }
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <h4 className="truncate text-sm font-medium text-foreground">
            {screenShare.participantName}
          </h4>
          {screenShare.isLocal ? (
            <span className="shrink-0 text-xs text-text-muted">Você</span>
          ) : null}
        </div>
        {onFocus ? (
          <button
            type="button"
            onClick={() => onFocus(screenShare.id)}
            className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-text-secondary outline-none hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Focar tela de ${screenShare.participantName}`}
          >
            Focar
          </button>
        ) : null}
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={
          variant === 'focus'
            ? 'min-h-0 w-full flex-1 bg-black object-contain'
            : 'aspect-video w-full bg-black object-contain'
        }
        aria-label={`Tela compartilhada por ${screenShare.participantName}`}
      />
      {requiresAudioActivation ? (
        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={activateAudio}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text-secondary outline-none hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ativar áudio
          </button>
        </div>
      ) : null}
    </article>
  );
}
