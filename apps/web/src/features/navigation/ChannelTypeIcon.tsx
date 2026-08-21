import type { ChannelType } from '@xama/domain';

import { cn } from '@/lib/utils';

type ChannelTypeIconProps = Readonly<{
  type: ChannelType;
  className?: string;
}>;

export function ChannelTypeIcon({ type, className }: ChannelTypeIconProps) {
  if (type === 'text') {
    return (
      <span className={cn('text-base leading-none', className)} aria-hidden="true">
        #
      </span>
    );
  }

  return (
    <svg
      viewBox="0 0 20 20"
      className={cn('size-4', className)}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 8h3l4-3v10l-4-3H3V8Z" fill="currentColor" />
      <path
        d="M13 7.25a4 4 0 0 1 0 5.5M15.25 5a7.2 7.2 0 0 1 0 10"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
