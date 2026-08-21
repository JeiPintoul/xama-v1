import type { Channel, Community } from '@xama/domain';
import { Link } from 'react-router';

import type {
  ChannelActionsRequest,
  ChannelListKind,
} from '@/features/navigation/ChannelActionsMenu';
import { ChannelTypeIcon } from '@/features/navigation/ChannelTypeIcon';
import { getChannelPath } from '@/features/navigation/navigation';
import { cn } from '@/lib/utils';

type ChannelListProps = Readonly<{
  channels: readonly Channel[];
  community: Community;
  selectedChannelId: string;
  favoriteChannelIds: readonly string[];
  kind: ChannelListKind;
  actionMenuId: string;
  activeActionKey?: string;
  onNavigate?: () => void;
  onOpenChannelActions: (request: ChannelActionsRequest) => void;
  onCloseChannelActions: () => void;
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
  actionMenuId,
  activeActionKey,
  onNavigate,
  onOpenChannelActions,
  onCloseChannelActions,
}: ChannelListProps) {
  return (
    <ul className="space-y-1">
      {channels.map((channel) => {
        const isFavorite = favoriteChannelIds.includes(channel.id);
        const isSelected = channel.id === selectedChannelId;
        const channelTypeLabel = getChannelTypeLabel(channel);
        const actionKey = `${kind}:${channel.id}`;
        const isActionMenuOpen = actionKey === activeActionKey;

        function openChannelActions(
          returnFocusTo: HTMLElement,
          position: ChannelActionsRequest['position'],
        ) {
          onOpenChannelActions({
            key: actionKey,
            communityId: community.id,
            channel,
            source: kind,
            position,
            returnFocusTo,
          });
        }

        return (
          <li key={channel.id}>
            <div
              onContextMenu={(event) => {
                event.preventDefault();
                const channelLink = event.currentTarget.querySelector<HTMLAnchorElement>('a');

                if (!channelLink) {
                  return;
                }

                channelLink.focus();
                openChannelActions(channelLink, {
                  x: event.clientX,
                  y: event.clientY,
                  align: 'start',
                });
              }}
              className={cn(
                'group flex min-w-0 items-center rounded-md transition-colors hover:bg-surface-raised focus-within:bg-surface-raised',
                isSelected && 'bg-surface-raised',
              )}
            >
              <Link
                to={getChannelPath(community, channel)}
                onClick={onNavigate}
                aria-current={isSelected ? 'page' : undefined}
                aria-label={`${channelTypeLabel} ${channel.name}${
                  kind === 'regular' && isFavorite ? ', favorito' : ''
                }`}
                onKeyDown={(event) => {
                  if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) {
                    return;
                  }

                  event.preventDefault();
                  const bounds = event.currentTarget.getBoundingClientRect();
                  openChannelActions(event.currentTarget, {
                    x: bounds.right,
                    y: bounds.top + 8,
                    align: 'end',
                  });
                }}
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
                aria-label={`Ações de ${channelTypeLabel.toLowerCase()} ${channel.name}`}
                aria-haspopup="menu"
                aria-expanded={isActionMenuOpen}
                aria-controls={isActionMenuOpen ? actionMenuId : undefined}
                onClick={(event) => {
                  if (isActionMenuOpen) {
                    onCloseChannelActions();
                    return;
                  }

                  const bounds = event.currentTarget.getBoundingClientRect();
                  openChannelActions(event.currentTarget, {
                    x: bounds.right,
                    y: bounds.bottom + 4,
                    align: 'end',
                  });
                }}
                className={cn(
                  'channel-context-trigger relative grid size-11 shrink-0 place-items-center rounded-md text-text-muted outline-none transition-[color,opacity,background-color]',
                  'hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                  kind === 'regular' && isFavorite && 'is-favorite',
                )}
              >
                <svg
                  viewBox="0 0 20 20"
                  className="channel-context-glyph size-4"
                  aria-hidden="true"
                >
                  <circle cx="5" cy="10" r="1.25" fill="currentColor" />
                  <circle cx="10" cy="10" r="1.25" fill="currentColor" />
                  <circle cx="15" cy="10" r="1.25" fill="currentColor" />
                </svg>
                {kind === 'regular' && isFavorite ? (
                  <span
                    className="channel-favorite-marker absolute text-[0.625rem] leading-none text-primary/75"
                    aria-hidden="true"
                  >
                    ★
                  </span>
                ) : null}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
