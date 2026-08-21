import type { Channel, Community } from '@xama/domain';
import { Link } from 'react-router';

import { CurrentUserArea } from '@/features/navigation/CurrentUserArea';
import { getChannelPath } from '@/features/navigation/navigation';
import { cn } from '@/lib/utils';

type CommunityNavigationProps = Readonly<{
  community: Community;
  selectedChannel: Channel;
  onNavigate?: () => void;
  className?: string;
}>;

export function CommunityNavigation({
  community,
  selectedChannel,
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

      <nav
        aria-label={`Canais de ${community.name}`}
        className="min-h-0 flex-1 overflow-y-auto px-2 py-4"
      >
        <p className="px-2 text-[0.6875rem] font-semibold tracking-[0.14em] text-text-muted uppercase">
          Canais
        </p>
        <ul className="mt-2 space-y-1">
          {community.channels.map((channel) => {
            const isSelected = channel.id === selectedChannel.id;

            return (
              <li key={channel.id}>
                <Link
                  to={getChannelPath(community, channel)}
                  onClick={onNavigate}
                  aria-current={isSelected ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 min-w-0 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-text-secondary outline-none transition-colors',
                    'hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected && 'bg-surface-raised text-foreground',
                  )}
                >
                  <span
                    className={cn('text-base text-text-muted', isSelected && 'text-primary')}
                    aria-hidden="true"
                  >
                    #
                  </span>
                  <span className="truncate">{channel.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <CurrentUserArea />
    </aside>
  );
}
