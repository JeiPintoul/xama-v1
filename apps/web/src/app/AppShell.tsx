import { resolveNavigationMode } from '@xama/domain';
import type { Channel, Community, NavigationMode } from '@xama/domain';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { CommunityNavigation } from '@/features/navigation/CommunityNavigation';
import { CommunityRail } from '@/features/navigation/CommunityRail';
import { MobileNavigation } from '@/features/navigation/MobileNavigation';
import { mockCurrentUser } from '@/features/navigation/mock-navigation';
import type { ModularNavigationSection } from '@/features/navigation/navigation';
import { PrimaryContent } from '@/features/navigation/PrimaryContent';
import { SidebarResizeHandle } from '@/features/navigation/SidebarResizeHandle';

type AppShellProps = Readonly<{
  community: Community;
  channel: Channel;
}>;

const DEFAULT_SIDEBAR_WIDTH = 272;
const MINIMUM_SIDEBAR_WIDTH = 224;
const MAXIMUM_SIDEBAR_WIDTH = 360;

type FavoriteChannelIdsByCommunity = Readonly<Record<string, readonly string[]>>;
type ModularSectionSelection = Readonly<{
  contextKey: string;
  section: ModularNavigationSection;
}>;

export function AppShell({ community, channel }: AppShellProps) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const [requestedNavigationMode, setRequestedNavigationMode] =
    useState<NavigationMode>('automatic');
  const [modularSectionSelection, setModularSectionSelection] = useState<ModularSectionSelection>({
    contextKey: '',
    section: 'text',
  });
  const [favoriteChannelIdsByCommunity, setFavoriteChannelIdsByCommunity] =
    useState<FavoriteChannelIdsByCommunity>(mockCurrentUser.favoriteChannelIdsByCommunity);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const shouldRestoreMobileMenuFocus = useRef(false);
  const resolvedNavigationMode = resolveNavigationMode(requestedNavigationMode, community);
  const favoriteChannelIds = favoriteChannelIdsByCommunity[community.id] ?? [];
  const modularSectionContextKey = `${resolvedNavigationMode}:${community.id}:${channel.id}`;
  const activeModularSection =
    modularSectionSelection.contextKey === modularSectionContextKey
      ? modularSectionSelection.section
      : channel.type;
  const layoutStyle = {
    '--community-navigation-width': `${sidebarWidth}px`,
  } as CSSProperties;

  const openMobileNavigation = useCallback(() => {
    shouldRestoreMobileMenuFocus.current = true;
    setIsMobileNavigationOpen(true);
  }, []);

  const closeMobileNavigation = useCallback(() => {
    setIsMobileNavigationOpen(false);
  }, []);

  const toggleFavorite = useCallback(
    (channelId: string) => {
      setFavoriteChannelIdsByCommunity((currentFavorites) => {
        const communityFavorites = currentFavorites[community.id] ?? [];
        const nextCommunityFavorites = communityFavorites.includes(channelId)
          ? communityFavorites.filter((favoriteChannelId) => favoriteChannelId !== channelId)
          : [...communityFavorites, channelId];

        return {
          ...currentFavorites,
          [community.id]: nextCommunityFavorites,
        };
      });
    },
    [community.id],
  );

  const changeActiveModularSection = useCallback(
    (section: ModularNavigationSection) => {
      setModularSectionSelection({ contextKey: modularSectionContextKey, section });
    },
    [modularSectionContextKey],
  );

  useEffect(() => {
    if (!isMobileNavigationOpen && shouldRestoreMobileMenuFocus.current) {
      shouldRestoreMobileMenuFocus.current = false;
      mobileMenuButtonRef.current?.focus();
    }
  }, [isMobileNavigationOpen]);

  useEffect(() => {
    if (!isMobileNavigationOpen || typeof window.matchMedia !== 'function') {
      return;
    }

    const desktopLayout = window.matchMedia('(min-width: 64rem)');
    const closeAtDesktopWidth = (event: MediaQueryListEvent) => {
      if (event.matches) {
        shouldRestoreMobileMenuFocus.current = false;
        setIsMobileNavigationOpen(false);
      }
    };

    desktopLayout.addEventListener('change', closeAtDesktopWidth);

    return () => desktopLayout.removeEventListener('change', closeAtDesktopWidth);
  }, [isMobileNavigationOpen]);

  return (
    <div className="relative min-h-svh bg-background text-foreground lg:h-svh lg:overflow-hidden">
      <div
        className="grid min-h-svh min-w-0 grid-cols-1 lg:h-full lg:min-h-0 lg:grid-cols-[4rem_var(--community-navigation-width)_minmax(0,1fr)] lg:gap-2 lg:p-2"
        style={layoutStyle}
        inert={isMobileNavigationOpen}
        aria-hidden={isMobileNavigationOpen ? 'true' : undefined}
      >
        <div className="hidden min-h-0 lg:block" data-testid="desktop-community-rail">
          <CommunityRail selectedCommunityId={community.id} />
        </div>

        <div
          className="relative hidden min-h-0 min-w-0 lg:block"
          data-testid="desktop-community-navigation"
        >
          <CommunityNavigation
            community={community}
            selectedChannel={channel}
            requestedMode={requestedNavigationMode}
            resolvedMode={resolvedNavigationMode}
            activeModularSection={activeModularSection}
            favoriteChannelIds={favoriteChannelIds}
            onRequestedModeChange={setRequestedNavigationMode}
            onActiveModularSectionChange={changeActiveModularSection}
            onToggleFavorite={toggleFavorite}
          />
          <SidebarResizeHandle
            width={sidebarWidth}
            minimumWidth={MINIMUM_SIDEBAR_WIDTH}
            maximumWidth={MAXIMUM_SIDEBAR_WIDTH}
            onWidthChange={setSidebarWidth}
          />
        </div>

        <PrimaryContent
          community={community}
          channel={channel}
          menuButtonRef={mobileMenuButtonRef}
          isNavigationOpen={isMobileNavigationOpen}
          onOpenNavigation={openMobileNavigation}
        />
      </div>

      {isMobileNavigationOpen ? (
        <MobileNavigation
          community={community}
          selectedChannel={channel}
          requestedMode={requestedNavigationMode}
          resolvedMode={resolvedNavigationMode}
          activeModularSection={activeModularSection}
          favoriteChannelIds={favoriteChannelIds}
          onRequestedModeChange={setRequestedNavigationMode}
          onActiveModularSectionChange={changeActiveModularSection}
          onToggleFavorite={toggleFavorite}
          onClose={closeMobileNavigation}
        />
      ) : null}
    </div>
  );
}
