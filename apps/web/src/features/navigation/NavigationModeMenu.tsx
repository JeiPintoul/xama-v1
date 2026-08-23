import type { NavigationMode, ResolvedNavigationMode } from '@xama/domain';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { cn } from '@/lib/utils';

type NavigationModeMenuProps = Readonly<{
  communityName: string;
  communityDescription: string;
  requestedMode: NavigationMode;
  resolvedMode: ResolvedNavigationMode;
  onRequestedModeChange: (mode: NavigationMode) => void;
}>;

const navigationModes = [
  { value: 'automatic', label: 'Automático' },
  { value: 'simplified', label: 'Simplificado' },
  { value: 'modular', label: 'Modular' },
] as const satisfies readonly Readonly<{ value: NavigationMode; label: string }>[];

const POPUP_GUTTER = 8;
const POPUP_GAP = 6;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function positionMenu(trigger: HTMLButtonElement, menu: HTMLDivElement) {
  const viewport = window.visualViewport;
  const viewportLeft = viewport?.offsetLeft ?? 0;
  const viewportTop = viewport?.offsetTop ?? 0;
  const viewportWidth = viewport?.width ?? window.innerWidth;
  const viewportHeight = viewport?.height ?? window.innerHeight;
  const viewportRight = viewportLeft + viewportWidth;
  const viewportBottom = viewportTop + viewportHeight;
  const triggerBounds = trigger.getBoundingClientRect();
  const maximumMenuWidth = Math.max(0, viewportWidth - POPUP_GUTTER * 2);

  menu.style.width = `${Math.min(Math.max(triggerBounds.width, 224), maximumMenuWidth)}px`;
  menu.style.maxHeight = `${Math.max(0, viewportHeight - POPUP_GUTTER * 2)}px`;

  const menuBounds = menu.getBoundingClientRect();
  const minimumLeft = viewportLeft + POPUP_GUTTER;
  const maximumLeft = Math.max(minimumLeft, viewportRight - menuBounds.width - POPUP_GUTTER);
  const belowTop = triggerBounds.bottom + POPUP_GAP;
  const aboveTop = triggerBounds.top - POPUP_GAP - menuBounds.height;
  const spaceBelow = viewportBottom - POPUP_GUTTER - belowTop;
  const spaceAbove = triggerBounds.top - POPUP_GAP - viewportTop - POPUP_GUTTER;
  const requestedTop =
    spaceBelow >= menuBounds.height || spaceBelow >= spaceAbove ? belowTop : aboveTop;
  const minimumTop = viewportTop + POPUP_GUTTER;
  const maximumTop = Math.max(minimumTop, viewportBottom - menuBounds.height - POPUP_GUTTER);

  menu.style.left = `${clamp(triggerBounds.left, minimumLeft, maximumLeft)}px`;
  menu.style.top = `${clamp(requestedTop, minimumTop, maximumTop)}px`;
  menu.style.visibility = 'visible';
}

function getNavigationModeLabel(mode: NavigationMode): string {
  return navigationModes.find((option) => option.value === mode)?.label ?? mode;
}

export function NavigationModeMenu({
  communityName,
  communityDescription,
  requestedMode,
  resolvedMode,
  onRequestedModeChange,
}: NavigationModeMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const idPrefix = `community-menu-${useId().replaceAll(':', '')}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const requestedModeLabel = getNavigationModeLabel(requestedMode);

  useLayoutEffect(() => {
    if (isOpen && triggerRef.current && menuRef.current) {
      positionMenu(triggerRef.current, menuRef.current);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function dismissOutside(event: PointerEvent | FocusEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function dismissForViewportChange() {
      setIsOpen(false);
    }

    function dismissForExternalScroll(event: Event) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    const viewport = window.visualViewport;

    document.addEventListener('pointerdown', dismissOutside, true);
    document.addEventListener('focusin', dismissOutside);
    window.addEventListener('resize', dismissForViewportChange);
    window.addEventListener('scroll', dismissForExternalScroll, true);
    viewport?.addEventListener('resize', dismissForViewportChange);
    viewport?.addEventListener('scroll', dismissForViewportChange);

    return () => {
      document.removeEventListener('pointerdown', dismissOutside, true);
      document.removeEventListener('focusin', dismissOutside);
      window.removeEventListener('resize', dismissForViewportChange);
      window.removeEventListener('scroll', dismissForExternalScroll, true);
      viewport?.removeEventListener('resize', dismissForViewportChange);
      viewport?.removeEventListener('scroll', dismissForViewportChange);
    };
  }, [isOpen]);

  function focusOption(index: number) {
    window.requestAnimationFrame(() => optionRefs.current[index]?.focus());
  }

  function openMenu() {
    setIsOpen(true);
    focusOption(navigationModes.findIndex((option) => option.value === requestedMode));
  }

  function closeMenu(restoreFocus: boolean) {
    setIsOpen(false);

    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  function selectMode(mode: NavigationMode) {
    onRequestedModeChange(mode);
    closeMenu(true);
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu();
    } else if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      closeMenu(true);
    }
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    let nextIndex: number;

    switch (event.key) {
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % navigationModes.length;
        break;
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + navigationModes.length) % navigationModes.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = navigationModes.length - 1;
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        closeMenu(true);
        return;
      case 'Tab':
        setIsOpen(false);
        return;
      default:
        return;
    }

    event.preventDefault();
    focusOption(nextIndex);
  }

  return (
    <div ref={containerRef} className="relative border-b border-border">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Modo de navegação: ${requestedModeLabel}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={`${idPrefix}-menu`}
        onClick={() => (isOpen ? closeMenu(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className="flex w-full min-w-0 items-center gap-2 px-3 py-3 text-left outline-none transition-colors hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{communityName}</p>
          <p className="mt-0.5 truncate text-[0.6875rem] text-text-muted">{communityDescription}</p>
        </div>
        <svg
          viewBox="0 0 20 20"
          className={cn(
            'size-3.5 shrink-0 text-text-muted transition-transform',
            isOpen && 'rotate-180',
          )}
          aria-hidden="true"
        >
          <path
            d="m5.5 7.5 4.5 4.5 4.5-4.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      </button>

      <span className="sr-only" aria-live="polite">
        Exibindo {resolvedMode === 'simplified' ? 'Simplificado' : 'Modular'}
      </span>

      {isOpen ? (
        <div
          ref={menuRef}
          id={`${idPrefix}-menu`}
          role="menu"
          aria-label="Modos de navegação"
          className="fixed z-[70] overflow-y-auto rounded-md border border-border bg-popover p-1.5 shadow-lg shadow-background/30"
          style={{ left: 0, top: 0, visibility: 'hidden' }}
        >
          <p className="px-2.5 pt-1.5 pb-1 text-[0.625rem] font-semibold tracking-[0.12em] text-text-muted uppercase">
            Modo de navegação
          </p>

          {navigationModes.map((option, index) => {
            const isSelected = option.value === requestedMode;

            return (
              <button
                key={option.value}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                role="menuitemradio"
                tabIndex={-1}
                aria-checked={isSelected}
                onClick={() => selectMode(option.value)}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
                className={cn(
                  'flex min-h-9 w-full items-center justify-between gap-3 rounded-sm px-2.5 text-left text-[0.8125rem] text-text-secondary outline-none transition-colors',
                  'hover:bg-surface-raised hover:text-foreground focus-visible:bg-surface-raised focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                  isSelected && 'text-foreground',
                )}
              >
                <span>{option.label}</span>
                <svg
                  viewBox="0 0 20 20"
                  className={cn('size-3.5 shrink-0 text-primary', !isSelected && 'invisible')}
                  aria-hidden="true"
                >
                  <path
                    d="m4.5 10.25 3.25 3.25 7.75-7.75"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.75"
                  />
                </svg>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
