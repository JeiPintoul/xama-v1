import type { Community } from '@xama/domain';
import { Link } from 'react-router';

import { mockCommunities } from '@/features/navigation/mock-navigation';
import {
  defaultNavigationPath,
  getChannelPath,
  getDefaultChannel,
} from '@/features/navigation/navigation';
import { cn } from '@/lib/utils';

type CommunityRailProps = Readonly<{
  selectedCommunityId: string;
  onNavigate?: () => void;
  className?: string;
}>;

function getCommunityInitials(community: Community): string {
  return community.name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

export function CommunityRail({ selectedCommunityId, onNavigate, className }: CommunityRailProps) {
  return (
    <aside
      className={cn(
        'flex h-full min-h-0 flex-col items-center rounded-lg bg-surface px-2 py-3',
        className,
      )}
    >
      <Link
        to={defaultNavigationPath}
        onClick={onNavigate}
        className="grid size-11 shrink-0 place-items-center rounded-md outline-none transition-colors hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Início do Xama"
      >
        <img className="h-9 w-auto object-contain" src="/brand/xama-symbol.png" alt="" />
      </Link>

      <div className="my-3 h-px w-8 shrink-0 bg-border" aria-hidden="true" />

      <nav aria-label="Comunidades" className="min-h-0 w-full flex-1 overflow-y-auto">
        <ul className="flex flex-col items-center gap-2">
          {mockCommunities.map((community) => {
            const isSelected = community.id === selectedCommunityId;

            return (
              <li key={community.id} className="relative">
                <Link
                  to={getChannelPath(community, getDefaultChannel(community))}
                  onClick={onNavigate}
                  aria-label={`Abrir comunidade ${community.name}`}
                  aria-current={isSelected ? 'page' : undefined}
                  title={community.name}
                  className={cn(
                    'grid size-11 place-items-center rounded-md border border-border bg-surface-raised text-xs font-semibold text-text-secondary outline-none transition-colors',
                    'hover:border-primary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected &&
                      'border-primary bg-primary text-primary-foreground hover:text-primary-foreground',
                  )}
                >
                  {getCommunityInitials(community)}
                </Link>
                <span
                  className={cn(
                    'absolute top-1/2 -left-2.5 h-2 w-0.5 -translate-y-1/2 rounded-full bg-primary opacity-0',
                    isSelected && 'h-6 opacity-100',
                  )}
                  aria-hidden="true"
                />
              </li>
            );
          })}
        </ul>
      </nav>

      <button
        type="button"
        disabled
        className="mt-3 grid size-11 shrink-0 cursor-not-allowed place-items-center rounded-md border border-dashed border-border text-xl text-text-muted"
        aria-label="Adicionar ou entrar em uma comunidade (em breve)"
        title="Disponível em breve"
      >
        +
      </button>
    </aside>
  );
}
