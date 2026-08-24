import { useEffect, useRef, useState } from 'react';

import type { ScreenShare } from '@/features/voice/media-session';

type ScreenShareVideoProps = Readonly<{
  screenShare: ScreenShare;
  onAttachAudio?: (screenShareId: string, element: HTMLAudioElement) => void;
  onDetachAudio?: (screenShareId: string, element: HTMLAudioElement) => void;
}>;

export function ScreenShareVideo({
  screenShare,
  onAttachAudio,
  onDetachAudio,
}: ScreenShareVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [requiresAudioActivation, setRequiresAudioActivation] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

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
    </div>
  );
}
