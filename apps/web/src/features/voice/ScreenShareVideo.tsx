import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import type { ScreenShare, ScreenShareMediaDiagnostics } from '@/features/voice/media-session';

type ScreenShareVideoProps = Readonly<{
  screenShare: ScreenShare;
  videoRef: RefObject<HTMLVideoElement | null>;
  onAttachVideo: (screenShareId: string, element: HTMLVideoElement) => void;
  onDetachVideo: (screenShareId: string, element: HTMLVideoElement) => void;
  onAttachAudio?: (screenShareId: string, element: HTMLAudioElement) => void;
  onDetachAudio?: (screenShareId: string, element: HTMLAudioElement) => void;
  getDiagnostics: (screenShareId: string) => Promise<ScreenShareMediaDiagnostics | null>;
}>;

export function ScreenShareVideo({
  screenShare,
  videoRef,
  onAttachVideo,
  onDetachVideo,
  onAttachAudio,
  onDetachAudio,
  getDiagnostics,
}: ScreenShareVideoProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [requiresAudioActivation, setRequiresAudioActivation] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<ScreenShareMediaDiagnostics | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<Readonly<{
    width: number;
    height: number;
  }> | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || screenShare.watchState !== 'ready') return;

    video.muted = screenShare.isLocal;
    onAttachVideo(screenShare.id, video);
    void video.play();

    return () => {
      onDetachVideo(screenShare.id, video);
      video.srcObject = null;
    };
  }, [
    onAttachVideo,
    onDetachVideo,
    screenShare.id,
    screenShare.isLocal,
    screenShare.watchState,
    videoRef,
  ]);

  useEffect(() => {
    const audio = audioRef.current;
    if (
      !audio ||
      screenShare.isLocal ||
      !screenShare.hasAudio ||
      screenShare.audioState !== 'ready' ||
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
    screenShare.audioState,
    screenShare.hasAudio,
    screenShare.id,
    screenShare.isLocal,
  ]);

  useEffect(() => {
    if (!import.meta.env.DEV || !isDiagnosticsOpen) return;

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
  }, [getDiagnostics, isDiagnosticsOpen, screenShare.id, videoRef]);

  function activateAudio() {
    const audio = audioRef.current;
    if (!audio) return;

    void audio.play().then(
      () => setRequiresAudioActivation(false),
      () => setRequiresAudioActivation(true),
    );
  }

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-full w-full bg-black object-contain"
        aria-label={`Tela compartilhada por ${screenShare.participantName}`}
      />
      {!screenShare.isLocal && screenShare.hasAudio ? <audio ref={audioRef} autoPlay /> : null}
      {requiresAudioActivation ? (
        <button
          type="button"
          onClick={activateAudio}
          className="absolute bottom-4 left-4 z-10 min-h-11 rounded-md bg-black/65 px-3 py-1.5 text-sm font-medium text-white outline-none backdrop-blur-sm hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white"
        >
          Ativar áudio
        </button>
      ) : null}
      {import.meta.env.DEV ? (
        <div className="absolute top-3 right-3 z-20">
          <button
            type="button"
            onClick={() => setIsDiagnosticsOpen((isOpen) => !isOpen)}
            className="rounded-md border border-white/15 bg-black/65 px-2 py-1 font-mono text-[0.6875rem] font-semibold tracking-wide text-white/80 outline-none backdrop-blur-sm hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white"
            aria-expanded={isDiagnosticsOpen}
            aria-controls="screen-share-diagnostics"
          >
            DEV
          </button>
          {isDiagnosticsOpen ? (
            <div
              id="screen-share-diagnostics"
              className="absolute top-8 right-0 w-56 rounded-lg border border-white/15 bg-black/85 p-3 text-[0.6875rem] text-white/80 shadow-xl backdrop-blur-md"
              aria-label="Diagnóstico de mídia"
            >
              <p className="mb-2 text-xs font-semibold text-white">Diagnóstico de mídia</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono">
                <dt>Origem</dt>
                <dd>{screenShare.isLocal ? 'local' : 'remota'}</dd>
                <dt>Estado</dt>
                <dd>{screenShare.watchState}</dd>
                <dt>Vídeo</dt>
                <dd>
                  {videoDimensions ? `${videoDimensions.width}×${videoDimensions.height}` : '—'}
                </dd>
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
      ) : null}
    </div>
  );
}
