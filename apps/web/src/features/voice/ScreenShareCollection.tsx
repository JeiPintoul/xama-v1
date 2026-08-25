import type { ScreenShare } from '@/features/voice/media-session';

type ScreenShareCollectionProps = Readonly<{
  screenShares: readonly ScreenShare[];
  onWatch: (screenShareId: string) => void;
}>;

function ScreenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="13" rx="2" />
      <path d="M8 21h8m-4-3v3" />
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
      className="rounded-xl border border-border bg-surface/70 p-3 sm:p-3.5"
      aria-label="Telas compartilhadas"
    >
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Telas compartilhadas</h3>
          <p className="mt-0.5 text-xs text-text-muted">Escolha uma tela para assistir.</p>
        </div>
        <span className="shrink-0 text-xs text-text-muted">
          {screenShares.length === 0
            ? 'Nenhuma ativa'
            : `${screenShares.length} ativa${screenShares.length === 1 ? '' : 's'}`}
        </span>
      </div>
      {screenShares.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-5 text-center text-sm text-text-muted">
          Quando alguém compartilhar uma tela, ela aparecerá aqui.
        </p>
      ) : (
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          {screenShares.map((screenShare) => (
            <article
              key={screenShare.id}
              className="flex min-w-0 items-center gap-2.5 rounded-lg border border-border bg-background/80 p-2.5"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <span className="size-5">
                  <ScreenIcon />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <h4 className="truncate text-sm font-medium text-foreground">
                    {screenShare.participantName}
                  </h4>
                  {screenShare.isLocal ? (
                    <span className="shrink-0 rounded-full bg-surface-raised px-1.5 py-0.5 text-[0.6875rem] text-text-muted">
                      Você
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-xs text-text-muted">
                  {getViewerLabel(screenShare)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onWatch(screenShare.id)}
                className="min-h-11 shrink-0 cursor-pointer rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground outline-none transition hover:bg-primary/85 active:translate-y-px active:bg-primary/75 focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Assistir tela de ${screenShare.participantName}`}
              >
                Assistir
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
