import { mockCurrentUser } from '@/features/navigation/mock-navigation';

export function CurrentUserArea() {
  return (
    <section
      aria-label="Usuário atual"
      className="flex min-w-0 items-center gap-3 border-t border-border px-3 py-3"
    >
      <div className="relative grid size-10 shrink-0 place-items-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
        {mockCurrentUser.initials}
        <span
          className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-surface bg-success"
          aria-hidden="true"
        />
      </div>

      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold text-foreground">
          {mockCurrentUser.displayName}
        </p>
        <p className="mt-1 truncate text-xs text-text-muted">{mockCurrentUser.handle}</p>
      </div>
    </section>
  );
}
