import type { Channel, Community } from '@xama/domain';
import { Link } from 'react-router';

import { ChannelTypeIcon } from '@/features/navigation/ChannelTypeIcon';
import { getChannelPath } from '@/features/navigation/navigation';
import { cn } from '@/lib/utils';

export type ChannelListKind = 'favorites' | 'regular';

type ChannelListProps = Readonly<{
  channels: readonly Channel[];
  community: Community;
  selectedChannelId: string;
  favoriteChannelIds: readonly string[];
  kind: ChannelListKind;
  onNavigate?: () => void;
  onToggleFavorite: (channelId: string, source: ChannelListKind) => void;
}>;

function getChannelTypeLabel(channel: Channel): string {
  return channel.type === 'text' ? 'Canal de texto' : 'Canal de voz';
}

export function ChannelList({
  channels,
  community,
  selectedChannelId,
  favoriteChannelIds,
  kind,
  onNavigate,
  onToggleFavorite,
}: ChannelListProps) {
  return (
    <ul className="space-y-1">
      {channels.map((channel) => {
        const isFavorite = favoriteChannelIds.includes(channel.id);
        const isSelected = channel.id === selectedChannelId;
        const channelTypeLabel = getChannelTypeLabel(channel);
        const favoriteAction = isFavorite ? 'Remover' : 'Adicionar';

        return (
          <li key={channel.id}>
            <div
              className={cn(
                'group flex min-w-0 items-center rounded-md transition-colors hover:bg-surface-raised focus-within:bg-surface-raised',
                isSelected && 'bg-surface-raised',
              )}
            >
              <Link
                to={getChannelPath(community, channel)}
                onClick={onNavigate}
                aria-current={isSelected ? 'page' : undefined}
                aria-label={`${channelTypeLabel} ${channel.name}`}
                className={cn(
                  'flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md py-2 pr-1 pl-3 text-sm font-medium text-text-secondary outline-none',
                  'hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                  isSelected && 'text-foreground',
                )}
              >
                <ChannelTypeIcon
                  type={channel.type}
                  className={cn('shrink-0 text-text-muted', isSelected && 'text-primary')}
                />
                <span className="truncate">{channel.name}</span>
              </Link>

              <button
                type="button"
                aria-pressed={isFavorite}
                aria-label={`${favoriteAction} ${channelTypeLabel.toLowerCase()} ${channel.name} ${
                  isFavorite ? 'dos' : 'aos'
                } favoritos`}
                onClick={() => onToggleFavorite(channel.id, kind)}
                className={cn(
                  'channel-favorite-action grid size-11 shrink-0 place-items-center rounded-md text-base outline-none transition-[color,opacity,background-color]',
                  'hover:bg-background hover:text-warning focus-visible:ring-2 focus-visible:ring-ring',
                  isFavorite ? 'text-warning' : 'text-text-muted',
                )}
              >
                <span aria-hidden="true">{isFavorite ? '★' : '☆'}</span>
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
