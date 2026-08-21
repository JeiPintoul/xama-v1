import type { Channel } from '@xama/domain';
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';

export type ChannelListKind = 'favorites' | 'regular';

export type ChannelActionsRequest = Readonly<{
  key: string;
  communityId: string;
  channel: Channel;
  source: ChannelListKind;
  position: Readonly<{
    x: number;
    y: number;
    align: 'start' | 'end';
  }>;
  returnFocusTo: HTMLElement;
}>;

type ChannelActionsMenuProps = Readonly<{
  id: string;
  request: ChannelActionsRequest;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: (restoreFocus: boolean) => void;
}>;

const VIEWPORT_GUTTER = 8;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function positionMenu(menu: HTMLDivElement, request: ChannelActionsRequest) {
  const viewport = window.visualViewport;
  const viewportLeft = viewport?.offsetLeft ?? 0;
  const viewportTop = viewport?.offsetTop ?? 0;
  const viewportWidth = viewport?.width ?? window.innerWidth;
  const viewportHeight = viewport?.height ?? window.innerHeight;
  const minimumLeft = viewportLeft + VIEWPORT_GUTTER;
  const minimumTop = viewportTop + VIEWPORT_GUTTER;
  const maximumMenuWidth = Math.max(0, viewportWidth - VIEWPORT_GUTTER * 2);

  menu.style.maxWidth = `${maximumMenuWidth}px`;
  const menuBounds = menu.getBoundingClientRect();
  const maximumLeft = Math.max(
    minimumLeft,
    viewportLeft + viewportWidth - menuBounds.width - VIEWPORT_GUTTER,
  );
  const maximumTop = Math.max(
    minimumTop,
    viewportTop + viewportHeight - menuBounds.height - VIEWPORT_GUTTER,
  );
  const requestedLeft =
    request.position.align === 'end' ? request.position.x - menuBounds.width : request.position.x;

  menu.style.left = `${clamp(requestedLeft, minimumLeft, maximumLeft)}px`;
  menu.style.top = `${clamp(request.position.y, minimumTop, maximumTop)}px`;
  menu.style.visibility = 'visible';
}

export function ChannelActionsMenu({
  id,
  request,
  isFavorite,
  onToggleFavorite,
  onClose,
}: ChannelActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const actionLabel = isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos';

  useLayoutEffect(() => {
    if (menuRef.current) {
      positionMenu(menuRef.current, request);
    }
  }, [request]);

  useEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => actionRef.current?.focus());
    const viewport = window.visualViewport;

    function dismissOutside(event: PointerEvent | MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose(false);
      }
    }

    function dismissForViewportChange() {
      onClose(false);
    }

    document.addEventListener('pointerdown', dismissOutside, true);
    document.addEventListener('contextmenu', dismissOutside, true);
    window.addEventListener('resize', dismissForViewportChange);
    window.addEventListener('scroll', dismissForViewportChange, true);
    viewport?.addEventListener('resize', dismissForViewportChange);
    viewport?.addEventListener('scroll', dismissForViewportChange);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('pointerdown', dismissOutside, true);
      document.removeEventListener('contextmenu', dismissOutside, true);
      window.removeEventListener('resize', dismissForViewportChange);
      window.removeEventListener('scroll', dismissForViewportChange, true);
      viewport?.removeEventListener('resize', dismissForViewportChange);
      viewport?.removeEventListener('scroll', dismissForViewportChange);
    };
  }, [onClose]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      event.preventDefault();
      actionRef.current?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose(true);
    } else if (event.key === 'Tab') {
      onClose(false);
    }
  }

  return (
    <div
      ref={menuRef}
      id={id}
      role="menu"
      aria-label={`Ações de canal ${request.channel.name}`}
      onContextMenu={(event) => event.preventDefault()}
      className="fixed z-[70] w-52 max-w-[calc(100vw-1rem)] rounded-md border border-border bg-popover p-1 shadow-lg shadow-background/40"
      style={{ left: 0, top: 0, visibility: 'hidden' }}
    >
      <button
        ref={actionRef}
        type="button"
        role="menuitem"
        onClick={onToggleFavorite}
        onKeyDown={handleKeyDown}
        className="flex min-h-11 w-full items-center gap-3 rounded-sm px-3 text-left text-sm font-medium text-text-secondary outline-none transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:bg-surface-raised focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="text-sm text-primary" aria-hidden="true">
          {isFavorite ? '★' : '☆'}
        </span>
        <span>{actionLabel}</span>
      </button>
    </div>
  );
}
