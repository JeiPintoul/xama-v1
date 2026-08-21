import type { Channel, Community, ResolvedNavigationMode } from '@xama/domain';
import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { ChannelActionsMenu } from '@/features/navigation/ChannelActionsMenu';
import type {
  ChannelActionsRequest,
  ChannelListKind,
} from '@/features/navigation/ChannelActionsMenu';
import { ChannelList } from '@/features/navigation/ChannelList';
import type { ModularNavigationSection } from '@/features/navigation/navigation';
import { cn } from '@/lib/utils';

type AdaptiveChannelNavigationProps = Readonly<{
  community: Community;
  selectedChannel: Channel;
  resolvedMode: ResolvedNavigationMode;
  activeModularSection: ModularNavigationSection;
  favoriteChannelIds: readonly string[];
  onActiveModularSectionChange: (section: ModularNavigationSection) => void;
  onNavigate?: () => void;
  onToggleFavorite: (communityId: string, channelId: string) => void;
}>;

const allModularSections = [
  { id: 'text', label: 'Canais' },
  { id: 'favorites', label: 'Favoritos' },
  { id: 'voice', label: 'Voz' },
  { id: 'activity', label: 'Atividade' },
] as const satisfies readonly Readonly<{ id: ModularNavigationSection; label: string }>[];

type ChannelSectionProps = Readonly<{
  title: string;
  channels: readonly Channel[];
  community: Community;
  selectedChannelId: string;
  favoriteChannelIds: readonly string[];
  kind?: ChannelListKind;
  actionMenuId: string;
  activeActionKey?: string;
  onNavigate?: () => void;
  onOpenChannelActions: (request: ChannelActionsRequest) => void;
  onCloseChannelActions: () => void;
}>;

function ChannelSection({
  title,
  channels,
  community,
  selectedChannelId,
  favoriteChannelIds,
  kind = 'regular',
  actionMenuId,
  activeActionKey,
  onNavigate,
  onOpenChannelActions,
  onCloseChannelActions,
}: ChannelSectionProps) {
  if (channels.length === 0) {
    return null;
  }

  return (
    <section>
      <h3 className="px-2 text-[0.6875rem] font-semibold tracking-[0.14em] text-text-muted uppercase">
        {title}
      </h3>
      <div className="mt-2">
        <ChannelList
          channels={channels}
          community={community}
          selectedChannelId={selectedChannelId}
          favoriteChannelIds={favoriteChannelIds}
          kind={kind}
          actionMenuId={actionMenuId}
          activeActionKey={activeActionKey}
          onNavigate={onNavigate}
          onOpenChannelActions={onOpenChannelActions}
          onCloseChannelActions={onCloseChannelActions}
        />
      </div>
    </section>
  );
}

export function AdaptiveChannelNavigation({
  community,
  selectedChannel,
  resolvedMode,
  activeModularSection,
  favoriteChannelIds,
  onActiveModularSectionChange,
  onNavigate,
  onToggleFavorite,
}: AdaptiveChannelNavigationProps) {
  const navigationRef = useRef<HTMLElement>(null);
  const channelActionsContextKey = `${community.id}:${selectedChannel.id}:${resolvedMode}:${activeModularSection}`;
  const [channelActionsState, setChannelActionsState] = useState<{
    contextKey: string;
    request: ChannelActionsRequest | null;
  }>({ contextKey: channelActionsContextKey, request: null });
  const tabIdPrefix = `community-navigation-${useId().replaceAll(':', '')}`;
  const actionMenuId = `${tabIdPrefix}-channel-actions`;
  const textChannels = community.channels.filter((channel) => channel.type === 'text');
  const voiceChannels = community.channels.filter((channel) => channel.type === 'voice');
  const favoriteChannels = community.channels.filter((channel) =>
    favoriteChannelIds.includes(channel.id),
  );
  const visibleModularSections = allModularSections.filter(
    (section) => section.id !== 'favorites' || favoriteChannels.length > 0,
  );
  if (channelActionsState.contextKey !== channelActionsContextKey) {
    setChannelActionsState({ contextKey: channelActionsContextKey, request: null });
  }

  const channelActions =
    channelActionsState.contextKey === channelActionsContextKey
      ? channelActionsState.request
      : null;
  const activeChannelActions = channelActions?.communityId === community.id ? channelActions : null;
  const activeActionKey = activeChannelActions?.key;

  function selectModularSection(section: ModularNavigationSection) {
    onActiveModularSectionChange(section);
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentSection: ModularNavigationSection,
  ) {
    const currentIndex = visibleModularSections.findIndex(
      (section) => section.id === currentSection,
    );
    let nextIndex: number;

    switch (event.key) {
      case 'ArrowLeft':
        nextIndex =
          (currentIndex - 1 + visibleModularSections.length) % visibleModularSections.length;
        break;
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % visibleModularSections.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = visibleModularSections.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextSection = visibleModularSections[nextIndex];

    if (!nextSection) {
      return;
    }

    selectModularSection(nextSection.id);
    document.getElementById(`${tabIdPrefix}-tab-${nextSection.id}`)?.focus();
  }

  function closeChannelActions(restoreFocus: boolean) {
    const returnFocusTo = activeChannelActions?.returnFocusTo;
    setChannelActionsState({ contextKey: channelActionsContextKey, request: null });

    if (restoreFocus) {
      window.requestAnimationFrame(() => {
        if (returnFocusTo?.isConnected) {
          returnFocusTo.focus();
        } else {
          navigationRef.current?.focus();
        }
      });
    }
  }

  function toggleFavoriteFromMenu() {
    if (!activeChannelActions) {
      return;
    }

    const isRemovingLastFavorite =
      favoriteChannelIds.includes(activeChannelActions.channel.id) && favoriteChannels.length === 1;
    const shouldLeaveFavoritesTab = activeModularSection === 'favorites' && isRemovingLastFavorite;
    const returnFocusTo = activeChannelActions.returnFocusTo;
    const restoreRowFocus = activeChannelActions.source === 'regular';

    onToggleFavorite(activeChannelActions.communityId, activeChannelActions.channel.id);
    setChannelActionsState({ contextKey: channelActionsContextKey, request: null });

    if (shouldLeaveFavoritesTab) {
      selectModularSection(selectedChannel.type);
    }

    window.requestAnimationFrame(() => {
      if (shouldLeaveFavoritesTab) {
        document.getElementById(`${tabIdPrefix}-tab-${selectedChannel.type}`)?.focus();
      } else if (restoreRowFocus && returnFocusTo.isConnected) {
        returnFocusTo.focus();
      } else {
        navigationRef.current?.focus();
      }
    });
  }

  const channelListProps = {
    community,
    selectedChannelId: selectedChannel.id,
    favoriteChannelIds,
    actionMenuId,
    activeActionKey,
    onNavigate,
    onOpenChannelActions: (request: ChannelActionsRequest) =>
      setChannelActionsState({ contextKey: channelActionsContextKey, request }),
    onCloseChannelActions: () => closeChannelActions(false),
  } as const;

  return (
    <nav
      ref={navigationRef}
      tabIndex={-1}
      aria-label={`Navegação de ${community.name}`}
      className="min-h-0 flex-1 overflow-y-auto rounded-md px-2 py-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      {resolvedMode === 'simplified' ? (
        <>
          {favoriteChannels.length > 0 ? (
            <ChannelSection
              title="Favoritos"
              channels={favoriteChannels}
              kind="favorites"
              {...channelListProps}
            />
          ) : null}

          <div className={cn('space-y-5', favoriteChannels.length > 0 && 'mt-5')}>
            <ChannelSection title="Canais de texto" channels={textChannels} {...channelListProps} />
            <ChannelSection title="Canais de voz" channels={voiceChannels} {...channelListProps} />
          </div>
        </>
      ) : (
        <div>
          <div
            role="tablist"
            aria-label={`Seções de ${community.name}`}
            className={cn(
              'grid gap-1 rounded-md bg-background p-1',
              favoriteChannels.length > 0 ? 'grid-cols-[0.9fr_1.25fr_0.65fr_1.2fr]' : 'grid-cols-3',
            )}
          >
            {visibleModularSections.map((section) => {
              const isActive = section.id === activeModularSection;

              return (
                <button
                  key={section.id}
                  id={`${tabIdPrefix}-tab-${section.id}`}
                  type="button"
                  role="tab"
                  tabIndex={isActive ? 0 : -1}
                  aria-selected={isActive}
                  aria-controls={`${tabIdPrefix}-panel-${section.id}`}
                  onClick={() => selectModularSection(section.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, section.id)}
                  className={cn(
                    'min-h-11 min-w-0 truncate rounded-sm px-0.5 text-[0.6875rem] font-medium tracking-tight text-text-muted outline-none transition-colors',
                    'hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                    isActive && 'bg-surface-raised text-foreground',
                  )}
                >
                  {section.label}
                </button>
              );
            })}
          </div>

          <section
            id={`${tabIdPrefix}-panel-text`}
            role="tabpanel"
            aria-labelledby={`${tabIdPrefix}-tab-text`}
            hidden={activeModularSection !== 'text'}
            className="mt-5"
          >
            <ChannelSection title="Canais de texto" channels={textChannels} {...channelListProps} />
          </section>

          {favoriteChannels.length > 0 ? (
            <section
              id={`${tabIdPrefix}-panel-favorites`}
              role="tabpanel"
              aria-labelledby={`${tabIdPrefix}-tab-favorites`}
              hidden={activeModularSection !== 'favorites'}
              className="mt-5"
            >
              <ChannelList channels={favoriteChannels} kind="favorites" {...channelListProps} />
            </section>
          ) : null}

          <section
            id={`${tabIdPrefix}-panel-voice`}
            role="tabpanel"
            aria-labelledby={`${tabIdPrefix}-tab-voice`}
            hidden={activeModularSection !== 'voice'}
            className="mt-5"
          >
            {voiceChannels.length > 0 ? (
              <ChannelSection
                title="Canais de voz"
                channels={voiceChannels}
                {...channelListProps}
              />
            ) : (
              <p className="px-2 text-sm leading-6 text-text-muted">
                Esta comunidade ainda não tem canais de voz.
              </p>
            )}
          </section>

          <section
            id={`${tabIdPrefix}-panel-activity`}
            role="tabpanel"
            tabIndex={0}
            aria-labelledby={`${tabIdPrefix}-tab-activity`}
            hidden={activeModularSection !== 'activity'}
            className="mt-5 px-2"
          >
            <p className="text-sm font-medium text-foreground">Nenhuma atividade para mostrar.</p>
            <p className="mt-2 text-xs leading-5 text-text-muted">
              Esta área permanece experimental por enquanto.
            </p>
          </section>
        </div>
      )}

      {activeChannelActions ? (
        <ChannelActionsMenu
          id={actionMenuId}
          request={activeChannelActions}
          isFavorite={favoriteChannelIds.includes(activeChannelActions.channel.id)}
          onToggleFavorite={toggleFavoriteFromMenu}
          onClose={closeChannelActions}
        />
      ) : null}
    </nav>
  );
}
