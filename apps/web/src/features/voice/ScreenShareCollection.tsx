import type { ScreenShare } from '@/features/voice/livekit-voice-session';
import { ScreenShareVideo } from '@/features/voice/ScreenShareVideo';

type ScreenShareCollectionProps = Readonly<{
  screenShares: readonly ScreenShare[];
  onFocus?: (screenShareId: string) => void;
  onVolumeChange?: (screenShareId: string, volume: number) => void;
  onAttachAudio?: (screenShareId: string, element: HTMLAudioElement) => void;
  onDetachAudio?: (screenShareId: string, element: HTMLAudioElement) => void;
}>;

export function ScreenShareCollection({
  screenShares,
  onFocus,
  onVolumeChange,
  onAttachAudio,
  onDetachAudio,
}: ScreenShareCollectionProps) {
  return (
    <section className="mt-6 rounded-lg border border-border bg-surface-raised p-3 sm:p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-sm font-semibold text-foreground">Telas compartilhadas</h3>
        <span className="text-sm text-text-muted">
          {screenShares.length === 0
            ? 'Nenhuma ativa'
            : `${screenShares.length} ativa${screenShares.length === 1 ? '' : 's'}`}
        </span>
      </div>
      {screenShares.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">
          Compartilhe uma tela para começar a apresentar nesta sala.
        </p>
      ) : (
        <div
          className={`mt-4 grid gap-3 sm:gap-4 ${
            screenShares.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
          } ${screenShares.length > 4 ? 'max-h-[calc(100svh-18rem)] overflow-y-auto pr-1' : ''}`}
        >
          {screenShares.map((screenShare) => (
            <ScreenShareVideo
              key={screenShare.id}
              screenShare={screenShare}
              onFocus={onFocus}
              onVolumeChange={onVolumeChange}
              onAttachAudio={onAttachAudio}
              onDetachAudio={onDetachAudio}
            />
          ))}
        </div>
      )}
    </section>
  );
}
