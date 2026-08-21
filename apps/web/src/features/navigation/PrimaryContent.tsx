import type { Channel, Community } from '@xama/domain';
import type { Ref } from 'react';

type PrimaryContentProps = Readonly<{
  community: Community;
  channel: Channel;
  menuButtonRef: Ref<HTMLButtonElement>;
  isNavigationOpen: boolean;
  onOpenNavigation: () => void;
}>;

export function PrimaryContent({
  community,
  channel,
  menuButtonRef,
  isNavigationOpen,
  onOpenNavigation,
}: PrimaryContentProps) {
  return (
    <main className="flex min-h-svh min-w-0 flex-col overflow-hidden bg-surface lg:min-h-0 lg:rounded-lg">
      <header className="flex min-h-16 min-w-0 items-center gap-3 border-b border-border px-3 sm:px-5">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={onOpenNavigation}
          className="grid size-11 shrink-0 place-items-center rounded-md text-xl text-text-secondary outline-none hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          aria-label="Abrir navegação"
          aria-haspopup="dialog"
          aria-controls="mobile-navigation-dialog"
          aria-expanded={isNavigationOpen}
        >
          <span aria-hidden="true">☰</span>
        </button>

        <span className="text-xl text-text-muted" aria-hidden="true">
          #
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">
            {channel.name}
          </h1>
          <p className="truncate text-xs text-text-muted">{community.name}</p>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 items-center overflow-y-auto px-6 py-12 sm:px-10 lg:px-14">
        <div className="w-full max-w-2xl">
          <div className="grid size-12 place-items-center rounded-md bg-surface-raised text-2xl text-text-secondary">
            <span aria-hidden="true">#</span>
          </div>
          <p className="mt-6 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
            {community.name}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Bem-vindo a #{channel.name}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary sm:text-base sm:leading-7">
            {channel.description}
          </p>
          <p className="mt-8 border-t border-border pt-5 text-sm text-text-muted">
            Este espaço vai receber a experiência do canal nos próximos marcos.
          </p>
        </div>
      </section>
    </main>
  );
}
