import type { Channel, Community, NavigationMode, ResolvedNavigationMode } from '@xama/domain';
import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

import { CommunityNavigation } from '@/features/navigation/CommunityNavigation';
import { CommunityRail } from '@/features/navigation/CommunityRail';
import type { ModularNavigationSection } from '@/features/navigation/navigation';

type MobileNavigationProps = Readonly<{
  community: Community;
  selectedChannel: Channel;
  requestedMode: NavigationMode;
  resolvedMode: ResolvedNavigationMode;
  activeModularSection: ModularNavigationSection;
  favoriteChannelIds: readonly string[];
  onRequestedModeChange: (mode: NavigationMode) => void;
  onActiveModularSectionChange: (section: ModularNavigationSection) => void;
  onToggleFavorite: (channelId: string) => void;
  onClose: () => void;
}>;

export function MobileNavigation({
  community,
  selectedChannel,
  requestedMode,
  resolvedMode,
  activeModularSection,
  favoriteChannelIds,
  onRequestedModeChange,
  onActiveModularSectionChange,
  onToggleFavorite,
  onClose,
}: MobileNavigationProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  function containFocus(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') {
      return;
    }

    const focusableElements = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((element) => element.tabIndex >= 0 && !element.closest('[hidden]'));
    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements.at(-1);

    if (!firstFocusableElement || !lastFocusableElement) {
      return;
    }

    if (event.shiftKey && document.activeElement === firstFocusableElement) {
      event.preventDefault();
      lastFocusableElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastFocusableElement) {
      event.preventDefault();
      firstFocusableElement.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-background/80" aria-hidden="true" />

      <section
        ref={dialogRef}
        id="mobile-navigation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-navigation-title"
        onKeyDown={containFocus}
        className="relative flex h-full w-[min(92vw,23rem)] flex-col bg-background p-2"
        data-testid="mobile-navigation"
      >
        <header className="flex min-h-13 items-center justify-between px-2">
          <h2 id="mobile-navigation-title" className="text-sm font-semibold text-foreground">
            Navegação
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="grid size-11 place-items-center rounded-md text-2xl text-text-secondary outline-none hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Fechar navegação"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[4rem_minmax(0,1fr)] gap-2">
          <CommunityRail
            selectedCommunityId={community.id}
            onNavigate={onClose}
            className="rounded-md"
          />
          <CommunityNavigation
            community={community}
            selectedChannel={selectedChannel}
            requestedMode={requestedMode}
            resolvedMode={resolvedMode}
            activeModularSection={activeModularSection}
            favoriteChannelIds={favoriteChannelIds}
            onRequestedModeChange={onRequestedModeChange}
            onActiveModularSectionChange={onActiveModularSectionChange}
            onToggleFavorite={onToggleFavorite}
            onNavigate={onClose}
            className="rounded-md"
          />
        </div>
      </section>
    </div>
  );
}
