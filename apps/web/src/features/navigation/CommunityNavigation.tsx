import type { Channel, Community, NavigationMode, ResolvedNavigationMode } from '@xama/domain';

import { AdaptiveChannelNavigation } from '@/features/navigation/AdaptiveChannelNavigation';
import { CurrentUserArea } from '@/features/navigation/CurrentUserArea';
import { NavigationModeMenu } from '@/features/navigation/NavigationModeMenu';
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
  onToggleFavorite: (communityId: string, channelId: string) => void;
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
            <p className="text-[0.6875rem] font-semibold tracking-[0.12em] text-text-muted uppercase">
              Modo
            </p>
            <span className="rounded-sm bg-surface-raised px-1.5 py-0.5 text-[0.625rem] font-semibold tracking-wide text-text-muted uppercase">
              Dev
            </span>
          </div>
          <NavigationModeMenu
            requestedMode={requestedMode}
            resolvedMode={resolvedMode}
            onRequestedModeChange={onRequestedModeChange}
          />
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
