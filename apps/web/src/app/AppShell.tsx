import type { Channel, Community } from '@xama/domain';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { CommunityNavigation } from '@/features/navigation/CommunityNavigation';
import { CommunityRail } from '@/features/navigation/CommunityRail';
import { MobileNavigation } from '@/features/navigation/MobileNavigation';
import { PrimaryContent } from '@/features/navigation/PrimaryContent';
import { SidebarResizeHandle } from '@/features/navigation/SidebarResizeHandle';

type AppShellProps = Readonly<{
  community: Community;
  channel: Channel;
}>;

const DEFAULT_SIDEBAR_WIDTH = 272;
const MINIMUM_SIDEBAR_WIDTH = 224;
const MAXIMUM_SIDEBAR_WIDTH = 360;

export function AppShell({ community, channel }: AppShellProps) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const shouldRestoreMobileMenuFocus = useRef(false);
  const layoutStyle = {
    '--community-navigation-width': `${sidebarWidth}px`,
  } as CSSProperties;

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

  function openMobileNavigation() {
    shouldRestoreMobileMenuFocus.current = true;
    setIsMobileNavigationOpen(true);
  }

  function closeMobileNavigation() {
    setIsMobileNavigationOpen(false);
  }

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
          <CommunityNavigation community={community} selectedChannel={channel} />
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
          onClose={closeMobileNavigation}
        />
      ) : null}
    </div>
  );
}
