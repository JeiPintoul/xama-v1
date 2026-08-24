import { useEffect, useRef, useState } from 'react';

import type { ScreenShare } from '@/features/voice/livekit-voice-session';

type ScreenShareVideoProps = Readonly<{
  screenShare: ScreenShare;
  onFocus?: (screenShareId: string) => void;
  onVolumeChange?: (screenShareId: string, volume: number) => void;
  onAttachAudio?: (screenShareId: string, element: HTMLAudioElement) => void;
  onDetachAudio?: (screenShareId: string, element: HTMLAudioElement) => void;
  variant?: 'grid' | 'focus';
}>;

function getVolumePercentage(volume: number): number {
  return Math.round(volume * 100);
}

export function ScreenShareVideo({
  screenShare,
  onFocus,
  onVolumeChange,
  onAttachAudio,
  onDetachAudio,
  variant = 'grid',
}: ScreenShareVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [requiresAudioActivation, setRequiresAudioActivation] = useState(false);
  const [isVolumeControlOpen, setIsVolumeControlOpen] = useState(false);
  const canControlAudio = !screenShare.isLocal && screenShare.hasAudio && Boolean(onVolumeChange);
  const volumePercentage = getVolumePercentage(screenShare.volume);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.srcObject = screenShare.mediaStream;
    video.muted = screenShare.isLocal;
    void video.play();

    return () => {
      video.srcObject = null;
    };
  }, [screenShare.isLocal, screenShare.mediaStream]);

  useEffect(() => {
    const audio = audioRef.current;
    if (
      !audio ||
      screenShare.isLocal ||
      !screenShare.hasAudio ||
      !onAttachAudio ||
      !onDetachAudio
    ) {
      return;
    }

    onAttachAudio(screenShare.id, audio);
    void audio.play().then(
      () => setRequiresAudioActivation(false),
      () => setRequiresAudioActivation(true),
    );

    return () => {
      onDetachAudio(screenShare.id, audio);
      audio.srcObject = null;
    };
  }, [
    onAttachAudio,
    onDetachAudio,
    screenShare.audioTrackId,
    screenShare.hasAudio,
    screenShare.id,
    screenShare.isLocal,
  ]);

  function activateAudio() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    void audio.play().then(
      () => setRequiresAudioActivation(false),
      () => setRequiresAudioActivation(true),
    );
  }

  function setVolume(value: string) {
    onVolumeChange?.(screenShare.id, Number(value) / 100);
  }

  const video = (
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
  );

  return (
    <article
      className={
        variant === 'focus'
          ? 'flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-background'
          : 'overflow-hidden rounded-lg border border-border bg-background'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <h4 className="truncate text-sm font-medium text-foreground">
            {screenShare.participantName}
          </h4>
          {screenShare.isLocal ? (
            <span className="shrink-0 text-xs text-text-muted">Você</span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canControlAudio && variant === 'focus' ? (
            <label className="flex min-h-11 items-center gap-2 text-xs text-text-secondary">
              <span>Volume</span>
              <input
                type="range"
                min="0"
                max="100"
                value={volumePercentage}
                onChange={(event) => setVolume(event.target.value)}
                className="w-24 accent-primary sm:w-36"
                aria-label={`Volume de ${screenShare.participantName}`}
              />
              <span className="w-9 text-right tabular-nums">{volumePercentage}%</span>
            </label>
          ) : null}
          {canControlAudio && variant === 'grid' ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsVolumeControlOpen((isOpen) => !isOpen)}
                className="min-h-11 min-w-11 rounded-md px-2 text-xs font-medium text-text-secondary outline-none hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Volume de ${screenShare.participantName}: ${volumePercentage}%`}
                aria-expanded={isVolumeControlOpen}
              >
                {volumePercentage === 0 ? 'Mudo' : 'Som'}
              </button>
              {isVolumeControlOpen ? (
                <div className="absolute top-full right-0 z-10 mt-1 w-52 rounded-md border border-border bg-popover p-3 shadow-lg">
                  <label
                    htmlFor={`screen-share-volume-${screenShare.id}`}
                    className="text-sm font-medium text-foreground"
                  >
                    Volume: {volumePercentage}%
                  </label>
                  <input
                    id={`screen-share-volume-${screenShare.id}`}
                    type="range"
                    min="0"
                    max="100"
                    value={volumePercentage}
                    onChange={(event) => setVolume(event.target.value)}
                    className="mt-3 w-full accent-primary"
                    aria-label={`Volume de ${screenShare.participantName}`}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
          {onFocus ? (
            <button
              type="button"
              onClick={() => onFocus(screenShare.id)}
              className="min-h-11 rounded-md px-3 text-xs font-medium text-text-secondary outline-none hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Abrir tela de ${screenShare.participantName} em foco`}
            >
              Foco
            </button>
          ) : null}
        </div>
      </div>
      {onFocus ? (
        <button
          type="button"
          onClick={() => onFocus(screenShare.id)}
          className="block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          aria-label={`Focar tela de ${screenShare.participantName}`}
        >
          {video}
        </button>
      ) : (
        video
      )}
      {!screenShare.isLocal && screenShare.hasAudio ? <audio ref={audioRef} autoPlay /> : null}
      {requiresAudioActivation ? (
        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={activateAudio}
            className="min-h-11 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text-secondary outline-none hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ativar áudio
          </button>
        </div>
      ) : null}
    </article>
  );
}
