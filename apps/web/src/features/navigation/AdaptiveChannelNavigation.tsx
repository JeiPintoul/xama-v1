import type { Channel, Community, ResolvedNavigationMode } from '@xama/domain';
import { useId, useRef } from 'react';
import type { KeyboardEvent } from 'react';

import { ChannelList } from '@/features/navigation/ChannelList';
import type { ChannelListKind } from '@/features/navigation/ChannelList';
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
  onToggleFavorite: (channelId: string) => void;
}>;

const modularSections = [
  { id: 'text', label: 'Canais' },
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
  onNavigate?: () => void;
  onToggleFavorite: (channelId: string, source: ChannelListKind) => void;
}>;

function ChannelSection({
  title,
  channels,
  community,
  selectedChannelId,
  favoriteChannelIds,
  kind = 'regular',
  onNavigate,
  onToggleFavorite,
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
          onNavigate={onNavigate}
          onToggleFavorite={onToggleFavorite}
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
  const tabIdPrefix = `community-navigation-${useId().replaceAll(':', '')}`;
  const textChannels = community.channels.filter((channel) => channel.type === 'text');
  const voiceChannels = community.channels.filter((channel) => channel.type === 'voice');
  const favoriteChannels = community.channels.filter((channel) =>
    favoriteChannelIds.includes(channel.id),
  );

  function toggleFavorite(channelId: string, source: ChannelListKind) {
    onToggleFavorite(channelId);

    if (source === 'favorites') {
      window.requestAnimationFrame(() => navigationRef.current?.focus());
    }
  }

  function selectModularSection(section: ModularNavigationSection) {
    onActiveModularSectionChange(section);
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentSection: ModularNavigationSection,
  ) {
    const currentIndex = modularSections.findIndex((section) => section.id === currentSection);
    let nextIndex: number;

    switch (event.key) {
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + modularSections.length) % modularSections.length;
        break;
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % modularSections.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = modularSections.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextSection = modularSections[nextIndex];

    if (!nextSection) {
      return;
    }

    selectModularSection(nextSection.id);
    document.getElementById(`${tabIdPrefix}-tab-${nextSection.id}`)?.focus();
  }

  return (
    <nav
      ref={navigationRef}
      tabIndex={-1}
      aria-label={`Navegação de ${community.name}`}
      className="min-h-0 flex-1 overflow-y-auto rounded-md px-2 py-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      {favoriteChannels.length > 0 ? (
        <ChannelSection
          title="Favoritos"
          channels={favoriteChannels}
          community={community}
          selectedChannelId={selectedChannel.id}
          favoriteChannelIds={favoriteChannelIds}
          kind="favorites"
          onNavigate={onNavigate}
          onToggleFavorite={toggleFavorite}
        />
      ) : null}

      {resolvedMode === 'simplified' ? (
        <div className={cn('space-y-5', favoriteChannels.length > 0 && 'mt-5')}>
          <ChannelSection
            title="Canais de texto"
            channels={textChannels}
            community={community}
            selectedChannelId={selectedChannel.id}
            favoriteChannelIds={favoriteChannelIds}
            onNavigate={onNavigate}
            onToggleFavorite={toggleFavorite}
          />
          <ChannelSection
            title="Canais de voz"
            channels={voiceChannels}
            community={community}
            selectedChannelId={selectedChannel.id}
            favoriteChannelIds={favoriteChannelIds}
            onNavigate={onNavigate}
            onToggleFavorite={toggleFavorite}
          />
        </div>
      ) : (
        <div className={cn(favoriteChannels.length > 0 && 'mt-5')}>
          <div
            role="tablist"
            aria-label={`Seções de ${community.name}`}
            className="grid grid-cols-3 gap-1 rounded-md bg-background p-1"
          >
            {modularSections.map((section) => {
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
                    'min-h-11 min-w-0 truncate rounded-sm px-1 text-xs font-medium text-text-muted outline-none transition-colors',
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
            <ChannelSection
              title="Canais de texto"
              channels={textChannels}
              community={community}
              selectedChannelId={selectedChannel.id}
              favoriteChannelIds={favoriteChannelIds}
              onNavigate={onNavigate}
              onToggleFavorite={toggleFavorite}
            />
          </section>

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
                community={community}
                selectedChannelId={selectedChannel.id}
                favoriteChannelIds={favoriteChannelIds}
                onNavigate={onNavigate}
                onToggleFavorite={toggleFavorite}
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
    </nav>
  );
}
