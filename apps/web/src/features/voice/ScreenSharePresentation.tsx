import { useEffect, useRef, useState } from 'react';

import type { ScreenShare, ScreenShareMediaDiagnostics } from '@/features/voice/media-session';
import { ScreenShareCollection } from '@/features/voice/ScreenShareCollection';
import { ScreenShareVideo } from '@/features/voice/ScreenShareVideo';
import { useScreenWakeLock } from '@/features/voice/use-screen-wake-lock';

type ScreenSharePresentationProps = Readonly<{
  screenShares: readonly ScreenShare[];
  onFocusModeChange: (isFocused: boolean) => void;
  onWatch: (screenShareId: string) => void;
  onStopWatching: () => void;
  onVolumeChange: (screenShareId: string, volume: number) => void;
  onToggleMute: (screenShareId: string) => void;
  onAttachVideo: (screenShareId: string, element: HTMLVideoElement) => void;
  onDetachVideo: (screenShareId: string, element: HTMLVideoElement) => void;
  onAttachAudio: (screenShareId: string, element: HTMLAudioElement) => void;
  onDetachAudio: (screenShareId: string, element: HTMLAudioElement) => void;
  getDiagnostics: (screenShareId: string) => Promise<ScreenShareMediaDiagnostics | null>;
}>;

type PictureInPictureDocument = Document & {
  pictureInPictureEnabled?: boolean;
  pictureInPictureElement?: Element | null;
  exitPictureInPicture?: () => Promise<void>;
};

type PictureInPictureVideo = HTMLVideoElement & {
  requestPictureInPicture?: () => Promise<unknown>;
};

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

function FocusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M8 3H3v5m13-5h5v5M8 21H3v-5m18 0v5h-5" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
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

function AdjustIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 7h10m4 0h2M4 17h2m4 0h10M14 4v6M6 14v6" />
    </svg>
  );
}

function PictureInPictureIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <rect x="12" y="11" width="7" height="5" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function VolumeControl({
  screenShare,
  onVolumeChange,
  onToggleMute,
}: Readonly<{
  screenShare: ScreenShare;
  onVolumeChange: (screenShareId: string, volume: number) => void;
  onToggleMute: (screenShareId: string) => void;
}>) {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);
  const volumePercentage = Math.round(screenShare.volume * 100);

  function cancelClose() {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }

  function scheduleClose() {
    cancelClose();
    closeTimeoutRef.current = window.setTimeout(() => setIsOpen(false), 200);
  }

  useEffect(() => () => cancelClose(), []);

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => {
        cancelClose();
        setIsOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onFocusCapture={() => {
        cancelClose();
        setIsOpen(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) scheduleClose();
      }}
    >
      {isOpen ? (
        <div className="absolute right-0 bottom-full w-44 rounded-lg border border-white/15 bg-black/85 p-3 shadow-lg backdrop-blur-md">
          <label
            htmlFor={`screen-share-volume-${screenShare.id}`}
            className="mb-2 flex items-center justify-between text-xs text-white/80"
          >
            <span>Volume</span>
            <span>{volumePercentage}%</span>
          </label>
          <input
            id={`screen-share-volume-${screenShare.id}`}
            type="range"
            min="0"
            max="100"
            value={volumePercentage}
            onChange={(event) => onVolumeChange(screenShare.id, Number(event.target.value) / 100)}
            className="w-full accent-primary"
          />
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => onToggleMute(screenShare.id)}
        className="grid size-11 place-items-center rounded-l-full bg-black/45 text-white outline-none backdrop-blur-sm hover:bg-black/65 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-white"
        aria-label={`${volumePercentage === 0 ? 'Ativar' : 'Silenciar'} áudio de ${screenShare.participantName}`}
        title={volumePercentage === 0 ? 'Ativar áudio' : 'Silenciar áudio'}
      >
        <span className="size-5">
          <VolumeIcon muted={volumePercentage === 0} />
        </span>
      </button>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="grid size-11 place-items-center rounded-r-full border-l border-white/10 bg-black/45 text-white outline-none backdrop-blur-sm hover:bg-black/65 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-white"
        aria-label={`Ajustar volume de ${screenShare.participantName}: ${volumePercentage}%`}
        aria-expanded={isOpen}
        title="Ajustar volume"
      >
        <span className="size-4">
          <AdjustIcon />
        </span>
      </button>
    </div>
  );
}

export function ScreenSharePresentation({
  screenShares,
  onFocusModeChange,
  onWatch,
  onStopWatching,
  onVolumeChange,
  onToggleMute,
  onAttachVideo,
  onDetachVideo,
  onAttachAudio,
  onDetachAudio,
  getDiagnostics,
}: ScreenSharePresentationProps) {
  const [presentationError, setPresentationError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [isControlActive, setIsControlActive] = useState(false);
  const fullscreenTargetRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const activePictureInPictureVideoRef = useRef<HTMLVideoElement | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const watchedScreenShare = screenShares.find(
    (screenShare) => screenShare.watchState !== 'available',
  );
  const availableScreenShares = screenShares.filter(
    (screenShare) => screenShare.id !== watchedScreenShare?.id,
  );
  const supportsFullscreen =
    typeof HTMLElement !== 'undefined' &&
    typeof HTMLElement.prototype.requestFullscreen === 'function';
  const pictureInPictureDocument =
    typeof document === 'undefined' ? null : (document as PictureInPictureDocument);
  const supportsPictureInPicture = Boolean(
    watchedScreenShare &&
    !watchedScreenShare.isLocal &&
    pictureInPictureDocument?.pictureInPictureEnabled &&
    typeof HTMLVideoElement !== 'undefined' &&
    typeof (HTMLVideoElement.prototype as PictureInPictureVideo).requestPictureInPicture ===
      'function',
  );

  useScreenWakeLock(Boolean(watchedScreenShare && isFocused));

  useEffect(() => {
    onFocusModeChange(Boolean(watchedScreenShare && isFocused));
  }, [isFocused, onFocusModeChange, watchedScreenShare]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === fullscreenTargetRef.current);
      setAreControlsVisible(true);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnterPictureInPicture = () => setIsPictureInPicture(true);
    const onLeavePictureInPicture = () => {
      setIsPictureInPicture(false);
      activePictureInPictureVideoRef.current = null;
    };
    video.addEventListener('enterpictureinpicture', onEnterPictureInPicture);
    video.addEventListener('leavepictureinpicture', onLeavePictureInPicture);
    return () => {
      video.removeEventListener('enterpictureinpicture', onEnterPictureInPicture);
      video.removeEventListener('leavepictureinpicture', onLeavePictureInPicture);
    };
  }, [watchedScreenShare?.id, watchedScreenShare?.watchState]);

  useEffect(
    () => () => {
      const activeVideo = activePictureInPictureVideoRef.current;
      if (
        activeVideo &&
        pictureInPictureDocument?.pictureInPictureElement === activeVideo &&
        pictureInPictureDocument.exitPictureInPicture
      ) {
        void pictureInPictureDocument.exitPictureInPicture().catch(() => undefined);
      }
      activePictureInPictureVideoRef.current = null;
    },
    [pictureInPictureDocument, watchedScreenShare?.id],
  );

  useEffect(() => {
    if (!watchedScreenShare || !isFocused || isControlActive || !areControlsVisible) return;

    controlsTimeoutRef.current = window.setTimeout(() => setAreControlsVisible(false), 2800);
    return () => {
      if (controlsTimeoutRef.current !== null) window.clearTimeout(controlsTimeoutRef.current);
    };
  }, [areControlsVisible, isControlActive, isFocused, watchedScreenShare]);

  async function exitPictureInPicture() {
    const activeVideo = activePictureInPictureVideoRef.current;
    if (
      activeVideo &&
      pictureInPictureDocument?.pictureInPictureElement === activeVideo &&
      pictureInPictureDocument.exitPictureInPicture
    ) {
      await pictureInPictureDocument.exitPictureInPicture().catch(() => undefined);
    }
    activePictureInPictureVideoRef.current = null;
    setIsPictureInPicture(false);
  }

  async function togglePictureInPicture() {
    const video = videoRef.current as PictureInPictureVideo | null;
    if (!video || !pictureInPictureDocument) return;

    try {
      if (
        pictureInPictureDocument.pictureInPictureElement === video &&
        pictureInPictureDocument.exitPictureInPicture
      ) {
        await pictureInPictureDocument.exitPictureInPicture();
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
        activePictureInPictureVideoRef.current = video;
      }
      setPresentationError(null);
    } catch {
      setPresentationError('Não foi possível abrir o Picture-in-Picture.');
    }
  }

  async function toggleFullscreen() {
    const target = fullscreenTargetRef.current;
    if (!target?.requestFullscreen) {
      setPresentationError('Tela cheia não é suportada neste navegador.');
      return;
    }

    try {
      if (document.fullscreenElement === target) {
        await document.exitFullscreen();
      } else {
        await target.requestFullscreen();
        setIsFocused(true);
      }
      setPresentationError(null);
    } catch {
      setPresentationError('Não foi possível alterar a tela cheia.');
    }
  }

  async function leaveFocus() {
    if (document.fullscreenElement === fullscreenTargetRef.current) {
      await document.exitFullscreen().catch(() => undefined);
    }
    setIsFocused(false);
    setAreControlsVisible(true);
  }

  async function stopWatching() {
    if (document.fullscreenElement === fullscreenTargetRef.current) {
      await document.exitFullscreen().catch(() => undefined);
    }
    await exitPictureInPicture();
    setIsFocused(false);
    onStopWatching();
  }

  function startWatching(screenShareId: string) {
    setIsFocused(false);
    setIsPictureInPicture(false);
    setAreControlsVisible(true);
    onWatch(screenShareId);
  }

  if (!watchedScreenShare) {
    return <ScreenShareCollection screenShares={screenShares} onWatch={startWatching} />;
  }

  const canControlAudio = !watchedScreenShare.isLocal && watchedScreenShare.hasAudio;
  const shouldAutoHideControls = isFocused || isFullscreen;

  return (
    <div className="space-y-4">
      <section
        className={
          isFocused
            ? 'fixed inset-0 z-50 flex h-svh w-screen items-center justify-center overflow-hidden bg-black'
            : 'rounded-xl border border-border bg-surface/70 p-2.5 sm:p-3'
        }
        aria-label={isFocused ? 'Tela em foco' : 'Assistindo tela'}
      >
        <div
          ref={fullscreenTargetRef}
          data-testid="screen-share-stage"
          className={`relative flex overflow-hidden bg-black ${
            isFocused
              ? 'h-full w-full'
              : 'mx-auto aspect-video max-h-[56svh] w-full max-w-4xl rounded-lg'
          } ${isFullscreen && !areControlsVisible ? 'cursor-none' : ''}`}
          onPointerMove={() => setAreControlsVisible(true)}
          onTouchStart={() => setAreControlsVisible(true)}
          onKeyDown={() => setAreControlsVisible(true)}
        >
          {watchedScreenShare.watchState === 'ready' ? (
            <ScreenShareVideo
              screenShare={watchedScreenShare}
              videoRef={videoRef}
              onAttachVideo={onAttachVideo}
              onDetachVideo={onDetachVideo}
              onAttachAudio={onAttachAudio}
              onDetachAudio={onDetachAudio}
              getDiagnostics={getDiagnostics}
            />
          ) : (
            <div
              className="flex h-full min-h-52 w-full items-center justify-center bg-black px-6 text-center text-sm text-white/70"
              role="status"
            >
              Assinando transmissão…
            </div>
          )}
          <div
            className={`absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-3 pt-14 transition-opacity duration-200 sm:px-4 sm:pb-4 ${
              !shouldAutoHideControls || areControlsVisible
                ? 'opacity-100'
                : 'pointer-events-none opacity-0'
            }`}
            onPointerDown={() => setIsControlActive(true)}
            onPointerUp={() => setIsControlActive(false)}
            onPointerCancel={() => setIsControlActive(false)}
            onFocusCapture={() => setIsControlActive(true)}
            onBlurCapture={() => setIsControlActive(false)}
          >
            <div className="min-w-24 flex-1 pb-1">
              <p className="truncate text-sm font-semibold text-white">
                {watchedScreenShare.participantName}
              </p>
              <p className="mt-0.5 text-xs text-white/65">
                {watchedScreenShare.isLocal ? 'Sua tela' : 'Transmitindo agora'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {canControlAudio ? (
                <VolumeControl
                  screenShare={watchedScreenShare}
                  onVolumeChange={onVolumeChange}
                  onToggleMute={onToggleMute}
                />
              ) : null}
              {supportsPictureInPicture ? (
                <button
                  type="button"
                  onClick={() => void togglePictureInPicture()}
                  className="grid size-11 place-items-center rounded-full bg-black/45 text-white outline-none backdrop-blur-sm hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-white"
                  aria-label={
                    isPictureInPicture ? 'Fechar Picture-in-Picture' : 'Abrir Picture-in-Picture'
                  }
                  title="Picture-in-Picture"
                >
                  <span className="size-5">
                    <PictureInPictureIcon />
                  </span>
                </button>
              ) : null}
              {!isFocused ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsFocused(true);
                    setAreControlsVisible(true);
                  }}
                  className="grid size-11 place-items-center rounded-full bg-black/45 text-white outline-none backdrop-blur-sm hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Entrar no modo Foco"
                  title="Foco"
                >
                  <span className="size-5">
                    <FocusIcon />
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void leaveFocus()}
                  className="grid size-11 place-items-center rounded-full bg-black/45 text-white outline-none backdrop-blur-sm hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Voltar para visualização inline"
                  title="Voltar"
                >
                  <span className="size-5">
                    <BackIcon />
                  </span>
                </button>
              )}
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
                aria-label={`Parar de assistir a tela de ${watchedScreenShare.participantName}`}
                title="Parar de assistir"
              >
                <span className="size-5">
                  <CloseIcon />
                </span>
              </button>
            </div>
          </div>
          {presentationError ? (
            <p
              role="alert"
              className="absolute inset-x-4 top-4 rounded-md bg-black/75 px-3 py-2 text-sm text-white"
            >
              {presentationError}
            </p>
          ) : null}
        </div>
      </section>
      {!isFocused && availableScreenShares.length > 0 ? (
        <ScreenShareCollection screenShares={availableScreenShares} onWatch={startWatching} />
      ) : null}
    </div>
  );
}
