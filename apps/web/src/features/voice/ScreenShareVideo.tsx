import { useEffect, useRef, useState } from 'react';

import type { ScreenShare } from '@/features/voice/livekit-voice-session';

type ScreenShareVideoProps = Readonly<{
  screenShare: ScreenShare;
}>;

export function ScreenShareVideo({ screenShare }: ScreenShareVideoProps) {
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
    <article className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <h4 className="truncate text-sm font-medium text-foreground">
          {screenShare.participantName}
        </h4>
        {screenShare.isLocal ? <span className="text-xs text-text-muted">Você</span> : null}
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="aspect-video w-full bg-black object-contain"
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
