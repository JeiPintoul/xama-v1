import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import type { ScreenShare } from '@/features/voice/media-session';

type ScreenShareVideoProps = Readonly<{
  screenShare: ScreenShare;
  videoRef: RefObject<HTMLVideoElement | null>;
  onAttachVideo: (screenShareId: string, element: HTMLVideoElement) => void;
  onDetachVideo: (screenShareId: string, element: HTMLVideoElement) => void;
  onAttachAudio?: (screenShareId: string, element: HTMLAudioElement) => void;
  onDetachAudio?: (screenShareId: string, element: HTMLAudioElement) => void;
}>;

export function ScreenShareVideo({
  screenShare,
  videoRef,
  onAttachVideo,
  onDetachVideo,
  onAttachAudio,
  onDetachAudio,
}: ScreenShareVideoProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [requiresAudioActivation, setRequiresAudioActivation] = useState(false);

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
          className="absolute bottom-4 left-4 z-10 min-h-11 cursor-pointer rounded-md bg-black/65 px-3 py-1.5 text-sm font-medium text-white outline-none backdrop-blur-sm transition-colors hover:bg-black/85 active:bg-black focus-visible:ring-2 focus-visible:ring-white"
        >
          Ativar áudio
        </button>
      ) : null}
    </div>
  );
}
