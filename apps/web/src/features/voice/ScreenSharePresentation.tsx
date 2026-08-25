import { useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject, WheelEvent } from 'react';

import type { ScreenShare, ScreenShareMediaDiagnostics } from '@/features/voice/media-session';
import { ScreenShareCollection } from '@/features/voice/ScreenShareCollection';
import { ScreenShareVideo } from '@/features/voice/ScreenShareVideo';
import { useScreenWakeLock } from '@/features/voice/use-screen-wake-lock';

type ScreenSharePresentationProps = Readonly<{
  screenShares: readonly ScreenShare[];
  onFocusModeChange: (isFocused: boolean) => void;
  onWatch: (screenShareId: string) => void;
  onStopWatching: (screenShareId: string) => void;
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

const mediaButtonClass =
  'grid size-11 cursor-pointer place-items-center rounded-full bg-black/50 text-white outline-none backdrop-blur-sm transition duration-150 hover:bg-white/20 active:scale-95 active:bg-white/25 focus-visible:ring-2 focus-visible:ring-white';

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
      <path d="M9 9 4 4m0 0v4m0-4h4m7 5 5-5m0 0v4m0-4h-4M9 15l-5 5m0 0v-4m0 4h4m7-5 5 5m0 0v-4m0 4h-4" />
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

function PictureInPictureIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <rect x="12" y="11" width="7" height="5" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MediaControlButton({
  label,
  tooltip,
  onClick,
  children,
  danger = false,
}: Readonly<{
  label: string;
  tooltip: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}>) {
  return (
    <span className="group relative">
      <button
        type="button"
        onClick={onClick}
        className={`${mediaButtonClass} ${danger ? 'hover:bg-danger/85 active:bg-danger' : ''}`}
        aria-label={label}
      >
        <span className="size-5">{children}</span>
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 bottom-[calc(100%+0.5rem)] z-30 w-max max-w-44 translate-y-1 rounded-md border border-white/10 bg-black/90 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 [@media(pointer:coarse)]:hidden"
      >
        {tooltip}
      </span>
    </span>
  );
}

function VolumeSlider({
  id,
  label,
  accessibleLabel,
  volumePercentage,
  onVolumeChange,
  className,
}: Readonly<{
  id: string;
  label: string;
  accessibleLabel: string;
  volumePercentage: number;
  onVolumeChange: (volume: number) => void;
  className?: string;
}>) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 flex items-center justify-between text-xs text-white/80">
        <span>{label}</span>
        <span>{volumePercentage}%</span>
      </label>
      <input
        id={id}
        type="range"
        min="0"
        max="100"
        value={volumePercentage}
        aria-label={accessibleLabel}
        onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
        className="w-full cursor-pointer accent-primary"
      />
    </div>
  );
}

function VolumeControl({
  screenShare,
  onVolumeChange,
  onToggleMute,
  onOpenChange,
  onActivity,
}: Readonly<{
  screenShare: ScreenShare;
  onVolumeChange: (screenShareId: string, volume: number) => void;
  onToggleMute: (screenShareId: string) => void;
  onOpenChange: (isOpen: boolean) => void;
  onActivity: () => void;
}>) {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);
  const volumePercentage = Math.round(screenShare.volume * 100);
  const sliderId = `screen-share-volume-${screenShare.id}`;

  function cancelClose() {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }

  function open() {
    cancelClose();
    setIsOpen(true);
    onOpenChange(true);
    onActivity();
  }

  function scheduleClose() {
    cancelClose();
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
      onOpenChange(false);
    }, 200);
  }

  function changeVolume(volume: number) {
    onActivity();
    onVolumeChange(screenShare.id, volume);
  }

  function changeVolumeWithWheel(event: WheelEvent<HTMLDivElement>) {
    if (event.deltaY === 0) return;
    event.preventDefault();
    onActivity();
    const direction = event.deltaY < 0 ? 1 : -1;
    const nextVolume = Math.min(1, Math.max(0, screenShare.volume + direction * 0.05));
    onVolumeChange(screenShare.id, Math.round(nextVolume * 100) / 100);
  }

  useEffect(
    () => () => {
      cancelClose();
      onOpenChange(false);
    },
    [onOpenChange],
  );

  return (
    <div
      className="group/volume relative flex items-center gap-2"
      onMouseEnter={open}
      onMouseLeave={scheduleClose}
      onFocusCapture={open}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) scheduleClose();
      }}
      onWheel={changeVolumeWithWheel}
    >
      {isOpen ? (
        <VolumeSlider
          id={sliderId}
          label="Volume"
          accessibleLabel={`Volume de ${screenShare.participantName}`}
          volumePercentage={volumePercentage}
          onVolumeChange={changeVolume}
          className="absolute right-0 bottom-full w-44 rounded-lg border border-white/15 bg-black/85 p-3 shadow-lg backdrop-blur-md [@media(pointer:coarse)]:hidden"
        />
      ) : null}
      <button
        type="button"
        onClick={() => {
          onActivity();
          onToggleMute(screenShare.id);
        }}
        className={mediaButtonClass}
        aria-label={`${volumePercentage === 0 ? 'Ativar' : 'Silenciar'} áudio de ${screenShare.participantName}`}
      >
        <span className="size-5">
          <VolumeIcon muted={volumePercentage === 0} />
        </span>
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 bottom-[calc(100%+0.5rem)] z-20 w-max translate-y-1 rounded-md border border-white/10 bg-black/90 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition group-hover/volume:translate-y-0 group-hover/volume:opacity-100 group-focus-within/volume:translate-y-0 group-focus-within/volume:opacity-100 [@media(pointer:coarse)]:hidden"
      >
        {volumePercentage === 0 ? 'Ativar áudio' : 'Silenciar áudio'}
      </span>
      <VolumeSlider
        id={`${sliderId}-touch`}
        label="Volume"
        accessibleLabel={`Volume de ${screenShare.participantName} em tela sensível ao toque`}
        volumePercentage={volumePercentage}
        onVolumeChange={changeVolume}
        className="hidden w-32 rounded-full bg-black/55 px-3 py-2 [@media(pointer:coarse)]:block"
      />
    </div>
  );
}

function MediaDiagnostics({
  screenShare,
  videoRef,
  isOpen,
  onOpenChange,
  getDiagnostics,
}: Readonly<{
  screenShare: ScreenShare;
  videoRef: RefObject<HTMLVideoElement | null>;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  getDiagnostics: (screenShareId: string) => Promise<ScreenShareMediaDiagnostics | null>;
}>) {
  const [diagnostics, setDiagnostics] = useState<ScreenShareMediaDiagnostics | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<Readonly<{
    width: number;
    height: number;
  }> | null>(null);
  const panelId = `screen-share-diagnostics-${screenShare.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  useEffect(() => {
    if (!import.meta.env.DEV || !isOpen) return;

    let isActive = true;
    const updateDiagnostics = async () => {
      const video = videoRef.current;
      const nextDiagnostics = await getDiagnostics(screenShare.id).catch(() => null);
      if (!isActive) return;

      setDiagnostics(nextDiagnostics);
      setVideoDimensions(
        video?.videoWidth && video.videoHeight
          ? { width: video.videoWidth, height: video.videoHeight }
          : null,
      );
    };

    void updateDiagnostics();
    const interval = window.setInterval(() => void updateDiagnostics(), 1_000);
    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, [getDiagnostics, isOpen, screenShare.id, videoRef]);

  if (!import.meta.env.DEV) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!isOpen)}
        className="min-h-11 cursor-pointer rounded-full border border-white/15 bg-black/50 px-3 font-mono text-[0.6875rem] font-semibold tracking-wide text-white/80 outline-none backdrop-blur-sm transition-colors hover:bg-white/20 active:bg-white/25 focus-visible:ring-2 focus-visible:ring-white"
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        DEV
      </button>
      {isOpen ? (
        <div
          id={panelId}
          className="absolute right-0 bottom-[calc(100%+0.5rem)] w-56 rounded-lg border border-white/15 bg-black/90 p-3 text-[0.6875rem] text-white/80 shadow-xl backdrop-blur-md"
          aria-label={`Diagnóstico de mídia de ${screenShare.participantName}`}
        >
          <p className="mb-2 text-xs font-semibold text-white">Diagnóstico de mídia</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono">
            <dt>Origem</dt>
            <dd>{screenShare.isLocal ? 'local' : 'remota'}</dd>
            <dt>Estado</dt>
            <dd>{screenShare.watchState}</dd>
            <dt>Vídeo</dt>
            <dd>{videoDimensions ? `${videoDimensions.width}×${videoDimensions.height}` : '—'}</dd>
            <dt>Bitrate</dt>
            <dd>{diagnostics?.bitrateKbps ? `${diagnostics.bitrateKbps} kbps` : '—'}</dd>
            <dt>FPS</dt>
            <dd>{diagnostics?.framesPerSecond ?? '—'}</dd>
            <dt>Codec</dt>
            <dd>{diagnostics?.codec ?? '—'}</dd>
            <dt>Stream</dt>
            <dd>{diagnostics?.streamState ?? '—'}</dd>
            <dt>Áudio</dt>
            <dd>{screenShare.hasAudio ? screenShare.audioState : 'não'}</dd>
            <dt>Provider</dt>
            <dd>{diagnostics?.provider ?? '—'}</dd>
          </dl>
        </div>
      ) : null}
    </div>
  );
}

type ScreenSharePlayerProps = Readonly<{
  screenShare: ScreenShare;
  isFocused: boolean;
  isOnlyWatchedShare: boolean;
  onFocus: (screenShareId: string) => void;
  onLeaveFocus: () => void;
  onStopWatching: (screenShareId: string) => void;
  onVolumeChange: (screenShareId: string, volume: number) => void;
  onToggleMute: (screenShareId: string) => void;
  onAttachVideo: (screenShareId: string, element: HTMLVideoElement) => void;
  onDetachVideo: (screenShareId: string, element: HTMLVideoElement) => void;
  onAttachAudio: (screenShareId: string, element: HTMLAudioElement) => void;
  onDetachAudio: (screenShareId: string, element: HTMLAudioElement) => void;
  getDiagnostics: (screenShareId: string) => Promise<ScreenShareMediaDiagnostics | null>;
}>;

function ScreenSharePlayer({
  screenShare,
  isFocused,
  isOnlyWatchedShare,
  onFocus,
  onLeaveFocus,
  onStopWatching,
  onVolumeChange,
  onToggleMute,
  onAttachVideo,
  onDetachVideo,
  onAttachAudio,
  onDetachAudio,
  getDiagnostics,
}: ScreenSharePlayerProps) {
  const [presentationError, setPresentationError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [isControlFocused, setIsControlFocused] = useState(false);
  const [isControlPressed, setIsControlPressed] = useState(false);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const fullscreenTargetRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const activePictureInPictureVideoRef = useRef<HTMLVideoElement | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const supportsFullscreen =
    typeof HTMLElement !== 'undefined' &&
    typeof HTMLElement.prototype.requestFullscreen === 'function';
  const pictureInPictureDocument =
    typeof document === 'undefined' ? null : (document as PictureInPictureDocument);
  const supportsPictureInPicture = Boolean(
    !screenShare.isLocal &&
    pictureInPictureDocument?.pictureInPictureEnabled &&
    typeof HTMLVideoElement !== 'undefined' &&
    typeof (HTMLVideoElement.prototype as PictureInPictureVideo).requestPictureInPicture ===
      'function',
  );
  const areControlsPinned =
    isControlFocused || isControlPressed || isVolumeOpen || isDiagnosticsOpen;

  useScreenWakeLock(isFocused);

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
  }, [screenShare.id, screenShare.watchState]);

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
    [pictureInPictureDocument, screenShare.id],
  );

  useEffect(() => {
    if (!areControlsVisible || areControlsPinned) return;

    controlsTimeoutRef.current = window.setTimeout(() => setAreControlsVisible(false), 2800);
    return () => {
      if (controlsTimeoutRef.current !== null) window.clearTimeout(controlsTimeoutRef.current);
    };
  }, [areControlsPinned, areControlsVisible]);

  function revealControls() {
    setAreControlsVisible(true);
  }

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
        onFocus(screenShare.id);
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
    onLeaveFocus();
    revealControls();
  }

  async function stopWatching() {
    if (document.fullscreenElement === fullscreenTargetRef.current) {
      await document.exitFullscreen().catch(() => undefined);
    }
    await exitPictureInPicture();
    onStopWatching(screenShare.id);
  }

  const canControlAudio = !screenShare.isLocal && screenShare.hasAudio;

  return (
    <section
      className={
        isFocused
          ? 'fixed inset-0 z-50 flex h-svh w-screen items-center justify-center overflow-hidden bg-black'
          : `w-full rounded-xl border border-border bg-surface/70 p-2 sm:p-2.5 ${
              isOnlyWatchedShare ? 'mx-auto max-w-4xl' : ''
            }`
      }
      aria-label={
        isFocused
          ? `Tela de ${screenShare.participantName} em foco`
          : `Assistindo ${screenShare.participantName}`
      }
    >
      <div
        ref={fullscreenTargetRef}
        data-testid={`screen-share-stage-${screenShare.id}`}
        className={`relative flex overflow-hidden bg-black ${
          isFocused ? 'h-full w-full' : 'aspect-video max-h-[52svh] w-full rounded-lg'
        } ${isFullscreen && !areControlsVisible ? 'cursor-none' : ''}`}
        onPointerMove={revealControls}
        onTouchStart={revealControls}
        onKeyDown={revealControls}
      >
        {screenShare.watchState === 'ready' ? (
          <ScreenShareVideo
            screenShare={screenShare}
            videoRef={videoRef}
            onAttachVideo={onAttachVideo}
            onDetachVideo={onDetachVideo}
            onAttachAudio={onAttachAudio}
            onDetachAudio={onDetachAudio}
          />
        ) : (
          <div
            className="flex h-full min-h-44 w-full items-center justify-center bg-black px-6 text-center text-sm text-white/70"
            role="status"
          >
            Assinando transmissão de {screenShare.participantName}…
          </div>
        )}
        <div
          data-testid={`screen-share-controls-${screenShare.id}`}
          className={`absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2.5 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-3 pb-3 pt-12 transition-opacity duration-200 sm:px-3.5 sm:pb-3.5 ${
            areControlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onPointerDown={() => setIsControlPressed(true)}
          onPointerUp={() => setIsControlPressed(false)}
          onPointerCancel={() => setIsControlPressed(false)}
          onFocusCapture={() => setIsControlFocused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsControlFocused(false);
            }
          }}
        >
          <div className="min-w-24 flex-1 pb-1">
            <p className="truncate text-sm font-semibold text-white">
              {screenShare.participantName}
            </p>
            <p className="mt-0.5 text-xs text-white/65">
              {screenShare.isLocal ? 'Sua tela' : 'Transmitindo agora'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canControlAudio ? (
              <VolumeControl
                screenShare={screenShare}
                onVolumeChange={onVolumeChange}
                onToggleMute={onToggleMute}
                onOpenChange={setIsVolumeOpen}
                onActivity={revealControls}
              />
            ) : null}
            {import.meta.env.DEV ? (
              <MediaDiagnostics
                screenShare={screenShare}
                videoRef={videoRef}
                isOpen={isDiagnosticsOpen}
                onOpenChange={(isOpen) => {
                  setIsDiagnosticsOpen(isOpen);
                  if (isOpen) revealControls();
                }}
                getDiagnostics={getDiagnostics}
              />
            ) : null}
            {supportsPictureInPicture ? (
              <MediaControlButton
                label={
                  isPictureInPicture ? 'Fechar Picture-in-Picture' : 'Abrir Picture-in-Picture'
                }
                tooltip={isPictureInPicture ? 'Fechar Picture-in-Picture' : 'Picture-in-Picture'}
                onClick={() => void togglePictureInPicture()}
              >
                <PictureInPictureIcon />
              </MediaControlButton>
            ) : null}
            {!isFocused ? (
              <MediaControlButton
                label={`Focar transmissão de ${screenShare.participantName}`}
                tooltip="Focar transmissão"
                onClick={() => {
                  onFocus(screenShare.id);
                  revealControls();
                }}
              >
                <FocusIcon />
              </MediaControlButton>
            ) : (
              <MediaControlButton
                label="Voltar para visualização inline"
                tooltip="Voltar à grade"
                onClick={() => void leaveFocus()}
              >
                <BackIcon />
              </MediaControlButton>
            )}
            {supportsFullscreen ? (
              <MediaControlButton
                label={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}
                tooltip={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                onClick={() => void toggleFullscreen()}
              >
                <FullscreenIcon exit={isFullscreen} />
              </MediaControlButton>
            ) : null}
            <MediaControlButton
              label={`Parar de assistir a tela de ${screenShare.participantName}`}
              tooltip="Parar de assistir"
              onClick={() => void stopWatching()}
              danger
            >
              <CloseIcon />
            </MediaControlButton>
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
  const [focusedScreenShareId, setFocusedScreenShareId] = useState<string | null>(null);
  const watchedScreenShares = screenShares.filter(
    (screenShare) => screenShare.watchState !== 'available',
  );
  const availableScreenShares = screenShares.filter(
    (screenShare) => screenShare.watchState === 'available',
  );
  const activeFocusedScreenShareId = watchedScreenShares.some(
    (screenShare) => screenShare.id === focusedScreenShareId,
  )
    ? focusedScreenShareId
    : null;

  useEffect(() => {
    onFocusModeChange(Boolean(activeFocusedScreenShareId));
  }, [activeFocusedScreenShareId, onFocusModeChange]);

  function stopWatching(screenShareId: string) {
    if (activeFocusedScreenShareId === screenShareId) setFocusedScreenShareId(null);
    onStopWatching(screenShareId);
  }

  if (watchedScreenShares.length === 0) {
    return <ScreenShareCollection screenShares={screenShares} onWatch={onWatch} />;
  }

  return (
    <div className="space-y-3">
      <div
        className={`grid gap-2.5 ${
          watchedScreenShares.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
        }`}
        aria-label="Telas sendo assistidas"
      >
        {watchedScreenShares.map((screenShare) => (
          <ScreenSharePlayer
            key={screenShare.id}
            screenShare={screenShare}
            isFocused={activeFocusedScreenShareId === screenShare.id}
            isOnlyWatchedShare={watchedScreenShares.length === 1}
            onFocus={setFocusedScreenShareId}
            onLeaveFocus={() => setFocusedScreenShareId(null)}
            onStopWatching={stopWatching}
            onVolumeChange={onVolumeChange}
            onToggleMute={onToggleMute}
            onAttachVideo={onAttachVideo}
            onDetachVideo={onDetachVideo}
            onAttachAudio={onAttachAudio}
            onDetachAudio={onDetachAudio}
            getDiagnostics={getDiagnostics}
          />
        ))}
      </div>
      {availableScreenShares.length > 0 ? (
        <ScreenShareCollection screenShares={availableScreenShares} onWatch={onWatch} />
      ) : null}
    </div>
  );
}
