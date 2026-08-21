import type { Channel, Community, NavigationMode, ResolvedNavigationMode } from '@xama/domain';
import { useId } from 'react';

import { AdaptiveChannelNavigation } from '@/features/navigation/AdaptiveChannelNavigation';
import { CurrentUserArea } from '@/features/navigation/CurrentUserArea';
import type { ModularNavigationSection } from '@/features/navigation/navigation';
import { cn } from '@/lib/utils';

type CommunityNavigationProps = Readonly<{
  community: Community;
  selectedChannel: Channel;
  requestedMode: NavigationMode;
  resolvedMode: ResolvedNavigationMode;
  activeModularSection: ModularNavigationSection;
  favoriteChannelIds: readonly string[];
  onRequestedModeChange: (mode: NavigationMode) => void;
  onActiveModularSectionChange: (section: ModularNavigationSection) => void;
  onToggleFavorite: (channelId: string) => void;
  onNavigate?: () => void;
  className?: string;
}>;

export function CommunityNavigation({
  community,
  selectedChannel,
  requestedMode,
  resolvedMode,
  activeModularSection,
  favoriteChannelIds,
  onRequestedModeChange,
  onActiveModularSectionChange,
  onToggleFavorite,
  onNavigate,
  className,
}: CommunityNavigationProps) {
  const modeControlId = `navigation-mode-${useId().replaceAll(':', '')}`;

  function changeRequestedMode(value: string) {
    if (value === 'automatic' || value === 'simplified' || value === 'modular') {
      onRequestedModeChange(value);
    }
  }

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg bg-surface',
        className,
      )}
    >
      <header className="border-b border-border px-4 py-4">
        <p className="truncate text-base font-semibold text-foreground">{community.name}</p>
        <p className="mt-1 truncate text-xs text-text-muted">{community.description}</p>
      </header>

      {import.meta.env.DEV ? (
        <section className="border-b border-border px-3 py-3" aria-label="Ferramentas de navegação">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor={modeControlId}
              className="text-[0.6875rem] font-semibold tracking-[0.12em] text-text-muted uppercase"
            >
              Modo
            </label>
            <span className="rounded-sm bg-surface-raised px-1.5 py-0.5 text-[0.625rem] font-semibold tracking-wide text-text-muted uppercase">
              Dev
            </span>
          </div>
          <select
            id={modeControlId}
            value={requestedMode}
            onChange={(event) => changeRequestedMode(event.currentTarget.value)}
            className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="automatic">Automático</option>
            <option value="simplified">Simplificado</option>
            <option value="modular">Modular</option>
          </select>
          <p className="mt-2 text-xs text-text-muted" aria-live="polite">
            Exibindo {resolvedMode === 'simplified' ? 'Simplificado' : 'Modular'}
          </p>
        </section>
      ) : null}

      <AdaptiveChannelNavigation
        community={community}
        selectedChannel={selectedChannel}
        resolvedMode={resolvedMode}
        activeModularSection={activeModularSection}
        favoriteChannelIds={favoriteChannelIds}
        onActiveModularSectionChange={onActiveModularSectionChange}
        onNavigate={onNavigate}
        onToggleFavorite={onToggleFavorite}
      />

      <CurrentUserArea />
    </aside>
  );
}
