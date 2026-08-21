import { useEffect, useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

type SidebarResizeHandleProps = Readonly<{
  width: number;
  minimumWidth: number;
  maximumWidth: number;
  onWidthChange: (width: number) => void;
}>;

const KEYBOARD_RESIZE_STEP = 16;

function clampWidth(width: number, minimumWidth: number, maximumWidth: number): number {
  return Math.min(maximumWidth, Math.max(minimumWidth, width));
}

export function SidebarResizeHandle({
  width,
  minimumWidth,
  maximumWidth,
  onWidthChange,
}: SidebarResizeHandleProps) {
  const isResizing = useRef(false);
  const previousCursor = useRef('');
  const previousUserSelect = useRef('');
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(width);

  useEffect(
    () => () => {
      if (isResizing.current) {
        document.body.style.cursor = previousCursor.current;
        document.body.style.userSelect = previousUserSelect.current;
      }
    },
    [],
  );

  function updateWidth(nextWidth: number) {
    onWidthChange(clampWidth(nextWidth, minimumWidth, maximumWidth));
  }

  function startResize(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    isResizing.current = true;
    previousCursor.current = document.body.style.cursor;
    previousUserSelect.current = document.body.style.userSelect;
    resizeStartX.current = event.clientX;
    resizeStartWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function resize(event: PointerEvent<HTMLDivElement>) {
    if (!isResizing.current) {
      return;
    }

    updateWidth(resizeStartWidth.current + event.clientX - resizeStartX.current);
  }

  function stopResize(event: PointerEvent<HTMLDivElement>) {
    if (!isResizing.current) {
      return;
    }

    isResizing.current = false;
    document.body.style.cursor = previousCursor.current;
    document.body.style.userSelect = previousUserSelect.current;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyboardResize(event: KeyboardEvent<HTMLDivElement>) {
    let nextWidth: number;

    switch (event.key) {
      case 'ArrowLeft':
        nextWidth = width - KEYBOARD_RESIZE_STEP;
        break;
      case 'ArrowRight':
        nextWidth = width + KEYBOARD_RESIZE_STEP;
        break;
      case 'Home':
        nextWidth = minimumWidth;
        break;
      case 'End':
        nextWidth = maximumWidth;
        break;
      default:
        return;
    }

    event.preventDefault();
    updateWidth(nextWidth);
  }

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label="Redimensionar navegação da comunidade"
      aria-orientation="vertical"
      aria-valuemin={minimumWidth}
      aria-valuemax={maximumWidth}
      aria-valuenow={width}
      aria-valuetext={`${width} pixels`}
      onKeyDown={handleKeyboardResize}
      onPointerDown={startResize}
      onPointerMove={resize}
      onPointerUp={stopResize}
      onPointerCancel={stopResize}
      onLostPointerCapture={stopResize}
      className="group absolute inset-y-2 -right-2 z-10 hidden h-auto w-2 touch-none cursor-col-resize outline-none lg:block"
    >
      <span
        className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 rounded-full bg-transparent transition-colors group-hover:bg-border group-focus-visible:bg-primary"
        aria-hidden="true"
      />
    </div>
  );
}
