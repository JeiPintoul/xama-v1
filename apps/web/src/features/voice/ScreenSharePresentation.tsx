import { useEffect, useRef, useState } from 'react';

import { ScreenShareCollection } from '@/features/voice/ScreenShareCollection';
import { ScreenShareVideo } from '@/features/voice/ScreenShareVideo';
import type { ScreenShare } from '@/features/voice/livekit-voice-session';

type ScreenSharePresentationProps = Readonly<{
  screenShares: readonly ScreenShare[];
  onFocusModeChange: (isFocused: boolean) => void;
  onVolumeChange: (screenShareId: string, volume: number) => void;
  onAttachAudio: (screenShareId: string, element: HTMLAudioElement) => void;
  onDetachAudio: (screenShareId: string, element: HTMLAudioElement) => void;
}>;

export function ScreenSharePresentation({
  screenShares,
  onFocusModeChange,
  onVolumeChange,
  onAttachAudio,
  onDetachAudio,
}: ScreenSharePresentationProps) {
  const [focusedScreenShareId, setFocusedScreenShareId] = useState<string | null>(null);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [isControlActive, setIsControlActive] = useState(false);
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
    if (!focusedScreenShare || isControlActive || !areControlsVisible) {
      return;
    }

    controlsTimeoutRef.current = window.setTimeout(() => setAreControlsVisible(false), 2800);
    return () => {
      if (controlsTimeoutRef.current !== null) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [areControlsVisible, focusedScreenShare, isControlActive]);

  async function enterFullscreen() {
    const target = fullscreenTargetRef.current;
    if (!target?.requestFullscreen) {
      setFullscreenError('Tela cheia não é suportada neste navegador.');
      return;
    }

    try {
      await target.requestFullscreen();
      setFullscreenError(null);
    } catch {
      setFullscreenError('Não foi possível abrir a tela cheia.');
    }
  }

  function revealControls() {
    setAreControlsVisible(true);
  }

  if (focusedScreenShare) {
    return (
      <section className="min-h-[100svh] bg-black" aria-label="Tela em foco">
        <div
          ref={fullscreenTargetRef}
          data-testid="screen-share-focus-stage"
          className={`relative flex min-h-[100svh] overflow-hidden bg-black ${
            isFullscreen && !areControlsVisible ? 'cursor-none' : ''
          }`}
          onPointerMove={revealControls}
          onTouchStart={revealControls}
          onKeyDown={revealControls}
        >
          <ScreenShareVideo
            screenShare={focusedScreenShare}
            variant="focus"
            onVolumeChange={onVolumeChange}
            onAttachAudio={onAttachAudio}
            onDetachAudio={onDetachAudio}
          />
          <div
            className={`absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/75 to-transparent p-4 transition-opacity duration-200 sm:p-5 ${
              areControlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            onPointerDown={() => setIsControlActive(true)}
            onPointerUp={() => setIsControlActive(false)}
            onFocusCapture={() => setIsControlActive(true)}
            onBlurCapture={() => setIsControlActive(false)}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {focusedScreenShare.participantName}
              </p>
              {focusedScreenShare.isLocal ? <p className="text-xs text-white/70">Você</p> : null}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {!focusedScreenShare.isLocal && focusedScreenShare.hasAudio ? (
                <label className="flex min-h-11 items-center gap-2 rounded-md bg-black/45 px-3 text-xs text-white backdrop-blur-sm">
                  <span className="sr-only">Volume de {focusedScreenShare.participantName}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(focusedScreenShare.volume * 100)}
                    onChange={(event) =>
                      onVolumeChange(focusedScreenShare.id, Number(event.target.value) / 100)
                    }
                    className="w-24 accent-primary sm:w-36"
                    aria-label={`Volume de ${focusedScreenShare.participantName}`}
                  />
                </label>
              ) : null}
              <button
                type="button"
                onClick={() => setFocusedScreenShareId(null)}
                className="min-h-11 rounded-md bg-black/45 px-3 text-sm font-medium text-white outline-none backdrop-blur-sm hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-white"
              >
                Voltar à grade
              </button>
              {supportsFullscreen ? (
                <button
                  type="button"
                  onClick={() => void enterFullscreen()}
                  className="min-h-11 rounded-md bg-black/45 px-3 text-sm font-medium text-white outline-none backdrop-blur-sm hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-white"
                >
                  {isFullscreen ? 'Em tela cheia' : 'Tela cheia'}
                </button>
              ) : null}
            </div>
          </div>
          {fullscreenError ? (
            <p
              role="alert"
              className="absolute inset-x-4 bottom-4 rounded-md bg-black/70 px-3 py-2 text-sm text-white"
            >
              {fullscreenError}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <ScreenShareCollection
      screenShares={screenShares}
      onFocus={(screenShareId) => setFocusedScreenShareId(screenShareId)}
      onVolumeChange={onVolumeChange}
      onAttachAudio={onAttachAudio}
      onDetachAudio={onDetachAudio}
    />
  );
}
