import type { ScreenShare } from '@/features/voice/media-session';

type ScreenShareCollectionProps = Readonly<{
  screenShares: readonly ScreenShare[];
  onWatch: (screenShareId: string) => void;
}>;

function WatchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="13" rx="2" />
      <path d="m10 9 5 2.5-5 2.5V9Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function getViewerLabel(screenShare: ScreenShare): string {
  const viewerNames = screenShare.viewers.map((viewer) => viewer.name);
  if (viewerNames.length === 0) return 'Ninguém assistindo';
  if (viewerNames.length === 1) return `${viewerNames[0] ?? '1 pessoa'} assistindo`;
  if (viewerNames.length === 2) return `${viewerNames.join(' e ')} assistindo`;

  return `${viewerNames.slice(0, 2).join(', ')} e mais ${viewerNames.length - 2} assistindo`;
}

export function ScreenShareCollection({ screenShares, onWatch }: ScreenShareCollectionProps) {
  return (
    <section
      className="rounded-xl border border-border bg-surface/70 p-4 sm:p-5"
      aria-label="Telas compartilhadas"
    >
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Telas compartilhadas</h3>
          <p className="mt-1 text-sm text-text-muted">Escolha uma tela para assistir.</p>
        </div>
        <span className="shrink-0 text-sm text-text-muted">
          {screenShares.length === 0
            ? 'Nenhuma ativa'
            : `${screenShares.length} ativa${screenShares.length === 1 ? '' : 's'}`}
        </span>
      </div>
      {screenShares.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border px-4 py-7 text-center text-sm text-text-muted">
          Quando alguém compartilhar uma tela, ela aparecerá aqui.
        </p>
      ) : (
        <div
          className={`mt-5 grid gap-3 sm:gap-4 ${
            screenShares.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
          } ${screenShares.length > 4 ? 'max-h-[calc(100svh-18rem)] overflow-y-auto pr-1' : ''}`}
        >
          {screenShares.map((screenShare) => (
            <button
              key={screenShare.id}
              type="button"
              onClick={() => onWatch(screenShare.id)}
              className="group overflow-hidden rounded-lg border border-border bg-background text-left outline-none transition hover:border-primary/60 hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Assistir tela de ${screenShare.participantName}`}
            >
              <div className="flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_50%_35%,oklch(0.36_0.07_260_/_0.35),transparent_50%),oklch(0.15_0.015_260)] text-text-muted transition group-hover:text-primary">
                <span className="size-12">
                  <WatchIcon />
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate text-sm font-medium text-foreground">
                      {screenShare.participantName}
                    </h4>
                    {screenShare.isLocal ? (
                      <span className="shrink-0 text-xs text-text-muted">Você</span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-text-muted">
                    {getViewerLabel(screenShare)}
                  </p>
                </div>
                <span className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground">
                  Assistir
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
