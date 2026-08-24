import { useEffect, useRef, useState } from 'react';

import type { ScreenShare } from '@/features/voice/media-session';
import { ScreenShareCollection } from '@/features/voice/ScreenShareCollection';
import { ScreenShareVideo } from '@/features/voice/ScreenShareVideo';

type ScreenSharePresentationProps = Readonly<{
  screenShares: readonly ScreenShare[];
  onFocusModeChange: (isFocused: boolean) => void;
  onWatch: (screenShareId: string) => void;
  onStopWatching: () => void;
  onVolumeChange: (screenShareId: string, volume: number) => void;
  onAttachAudio: (screenShareId: string, element: HTMLAudioElement) => void;
  onDetachAudio: (screenShareId: string, element: HTMLAudioElement) => void;
}>;

function FullscreenIcon({ exit = false }: Readonly<{ exit?: boolean }>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {exit ? (
        <path d="M9 4v5H4m11-5v5h5M9 20v-5H4m16 0h-5v5" />
      ) : (
        <path d="M9 4H4v5m11-5h5v5M9 20H4v-5m11 5h5v-5" />
      )}
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function VolumeIcon({ muted }: Readonly<{ muted: boolean }>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 10v4h4l5 4V6l-5 4H4Z" />
      {muted ? <path d="m17 10 4 4m0-4-4 4" /> : <path d="M17 9a4 4 0 0 1 0 6" />}
    </svg>
  );
}

export function ScreenSharePresentation({
  screenShares,
  onFocusModeChange,
  onWatch,
  onStopWatching,
  onVolumeChange,
  onAttachAudio,
  onDetachAudio,
}: ScreenSharePresentationProps) {
  const [focusedScreenShareId, setFocusedScreenShareId] = useState<string | null>(null);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [isControlActive, setIsControlActive] = useState(false);
  const [isVolumeControlOpen, setIsVolumeControlOpen] = useState(false);
  const fullscreenTargetRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const supportsFullscreen =
    typeof HTMLElement !== 'undefined' &&
    typeof HTMLElement.prototype.requestFullscreen === 'function';
  const focusedScreenShare = screenShares.find(
    (screenShare) => screenShare.id === focusedScreenShareId,
  );

  useEffect(() => {
    onFocusModeChange(Boolean(focusedScreenShare));
  }, [focusedScreenShare, onFocusModeChange]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === fullscreenTargetRef.current);
      setAreControlsVisible(true);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!focusedScreenShare || isControlActive || !areControlsVisible) return;

    controlsTimeoutRef.current = window.setTimeout(() => setAreControlsVisible(false), 2800);
    return () => {
      if (controlsTimeoutRef.current !== null) window.clearTimeout(controlsTimeoutRef.current);
    };
  }, [areControlsVisible, focusedScreenShare, isControlActive]);

  async function toggleFullscreen() {
    const target = fullscreenTargetRef.current;
    if (!target?.requestFullscreen) {
      setFullscreenError('Tela cheia não é suportada neste navegador.');
      return;
    }

    try {
      if (document.fullscreenElement === target) {
        await document.exitFullscreen();
      } else {
        await target.requestFullscreen();
      }
      setFullscreenError(null);
    } catch {
      setFullscreenError('Não foi possível alterar a tela cheia.');
    }
  }

  function startWatching(screenShareId: string) {
    onWatch(screenShareId);
    setFocusedScreenShareId(screenShareId);
    setAreControlsVisible(true);
  }

  async function stopWatching() {
    if (document.fullscreenElement === fullscreenTargetRef.current) {
      await document.exitFullscreen();
    }
    onStopWatching();
    setFocusedScreenShareId(null);
  }

  if (focusedScreenShare) {
    const volumePercentage = Math.round(focusedScreenShare.volume * 100);
    const canControlAudio = !focusedScreenShare.isLocal && focusedScreenShare.hasAudio;

    return (
      <section className="min-h-[100svh] bg-black" aria-label="Tela em foco">
        <div
          ref={fullscreenTargetRef}
          data-testid="screen-share-focus-stage"
          className={`relative flex min-h-[100svh] overflow-hidden bg-black ${
            isFullscreen && !areControlsVisible ? 'cursor-none' : ''
          }`}
          onPointerMove={() => setAreControlsVisible(true)}
          onTouchStart={() => setAreControlsVisible(true)}
          onKeyDown={() => setAreControlsVisible(true)}
        >
          <ScreenShareVideo
            screenShare={focusedScreenShare}
            onAttachAudio={onAttachAudio}
            onDetachAudio={onDetachAudio}
          />
          <div
            className={`absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-4 pb-4 pt-16 transition-opacity duration-200 sm:px-5 sm:pb-5 ${
              areControlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            onPointerDown={() => setIsControlActive(true)}
            onPointerUp={() => setIsControlActive(false)}
            onFocusCapture={() => setIsControlActive(true)}
            onBlurCapture={() => setIsControlActive(false)}
          >
            <div className="min-w-0 pb-1">
              <p className="truncate text-sm font-semibold text-white">
                {focusedScreenShare.participantName}
              </p>
              <p className="mt-0.5 text-xs text-white/65">
                {focusedScreenShare.isLocal ? 'Sua tela' : 'Transmitindo agora'}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              {canControlAudio ? (
                <div
                  className="relative"
                  onMouseEnter={() => setIsVolumeControlOpen(true)}
                  onMouseLeave={() => setIsVolumeControlOpen(false)}
                  onFocusCapture={() => setIsVolumeControlOpen(true)}
                  onBlurCapture={() => setIsVolumeControlOpen(false)}
                >
                  {isVolumeControlOpen ? (
                    <div className="absolute right-0 bottom-[calc(100%+0.5rem)] w-44 rounded-lg border border-white/15 bg-black/70 p-3 shadow-lg backdrop-blur-sm">
                      <label
                        htmlFor={`screen-share-volume-${focusedScreenShare.id}`}
                        className="sr-only"
                      >
                        Volume de {focusedScreenShare.participantName}
                      </label>
                      <div className="mb-2 flex items-center justify-between text-xs text-white/80">
                        <span>Volume</span>
                        <span>{volumePercentage}%</span>
                      </div>
                      <input
                        id={`screen-share-volume-${focusedScreenShare.id}`}
                        type="range"
                        min="0"
                        max="100"
                        value={volumePercentage}
                        onChange={(event) =>
                          onVolumeChange(focusedScreenShare.id, Number(event.target.value) / 100)
                        }
                        className="w-full accent-primary"
                      />
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setIsVolumeControlOpen((isOpen) => !isOpen)}
                    className="grid size-11 place-items-center rounded-full bg-black/45 text-white outline-none backdrop-blur-sm hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-white"
                    aria-label={`Volume de ${focusedScreenShare.participantName}: ${volumePercentage}%`}
                    aria-expanded={isVolumeControlOpen}
                    title="Volume"
                  >
                    <span className="size-5">
                      <VolumeIcon muted={volumePercentage === 0} />
                    </span>
                  </button>
                </div>
              ) : null}
              {supportsFullscreen ? (
                <button
                  type="button"
                  onClick={() => void toggleFullscreen()}
                  className="grid size-11 place-items-center rounded-full bg-black/45 text-white outline-none backdrop-blur-sm hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-white"
                  aria-label={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}
                  title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                >
                  <span className="size-5">
                    <FullscreenIcon exit={isFullscreen} />
                  </span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void stopWatching()}
                className="grid size-11 place-items-center rounded-full bg-black/45 text-white outline-none backdrop-blur-sm hover:bg-danger/85 focus-visible:ring-2 focus-visible:ring-white"
                aria-label={`Parar de assistir a tela de ${focusedScreenShare.participantName}`}
                title="Parar de assistir"
              >
                <span className="size-5">
                  <CloseIcon />
                </span>
              </button>
            </div>
          </div>
          {fullscreenError ? (
            <p
              role="alert"
              className="absolute inset-x-4 top-4 rounded-md bg-black/70 px-3 py-2 text-sm text-white"
            >
              {fullscreenError}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return <ScreenShareCollection screenShares={screenShares} onWatch={startWatching} />;
}
