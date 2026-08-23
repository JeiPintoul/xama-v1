import { useEffect, useRef, useState } from 'react';

import { ScreenShareCollection } from '@/features/voice/ScreenShareCollection';
import { ScreenShareVideo } from '@/features/voice/ScreenShareVideo';
import type { ScreenShare } from '@/features/voice/livekit-voice-session';

type ScreenSharePresentationProps = Readonly<{
  screenShares: readonly ScreenShare[];
  onFocusModeChange: (isFocused: boolean) => void;
  onToggleScreenShare: () => void;
  screenShareActionLabel: string;
  isScreenShareActionDisabled: boolean;
  onLeave: () => void;
}>;

export function ScreenSharePresentation({
  screenShares,
  onFocusModeChange,
  onToggleScreenShare,
  screenShareActionLabel,
  isScreenShareActionDisabled,
  onLeave,
}: ScreenSharePresentationProps) {
  const [focusedScreenShareId, setFocusedScreenShareId] = useState<string | null>(null);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const fullscreenTargetRef = useRef<HTMLDivElement>(null);
  const supportsFullscreen =
    typeof HTMLElement !== 'undefined' &&
    typeof HTMLElement.prototype.requestFullscreen === 'function';
  const focusedScreenShare = screenShares.find(
    (screenShare) => screenShare.id === focusedScreenShareId,
  );

  useEffect(() => {
    onFocusModeChange(Boolean(focusedScreenShare));
  }, [focusedScreenShare, onFocusModeChange]);

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

  if (focusedScreenShare) {
    return (
      <section className="flex min-h-[calc(100svh-10rem)] flex-col" aria-label="Tela em foco">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFocusedScreenShareId(null)}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-text-secondary outline-none hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Voltar à grade
          </button>
          {supportsFullscreen ? (
            <button
              type="button"
              onClick={() => void enterFullscreen()}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
            >
              Tela cheia
            </button>
          ) : null}
          <button
            type="button"
            disabled={isScreenShareActionDisabled}
            onClick={onToggleScreenShare}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-text-secondary outline-none hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            {screenShareActionLabel}
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-text-secondary outline-none hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Sair
          </button>
        </div>
        {fullscreenError ? (
          <p role="alert" className="mb-3 text-sm text-danger">
            {fullscreenError}
          </p>
        ) : null}
        <div
          ref={fullscreenTargetRef}
          className="min-h-0 flex-1 overflow-hidden rounded-lg bg-black"
        >
          <ScreenShareVideo screenShare={focusedScreenShare} variant="focus" />
        </div>
      </section>
    );
  }

  return (
    <ScreenShareCollection
      screenShares={screenShares}
      onFocus={(screenShareId) => setFocusedScreenShareId(screenShareId)}
    />
  );
}
