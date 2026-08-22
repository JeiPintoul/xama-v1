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
      <NavigationModeMenu
        communityName={community.name}
        communityDescription={community.description}
        requestedMode={requestedMode}
        resolvedMode={resolvedMode}
        onRequestedModeChange={onRequestedModeChange}
      />

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
