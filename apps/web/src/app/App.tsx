import { Route, Routes } from 'react-router';

import { cn } from '@/lib/utils';

function FoundationPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-8 text-foreground sm:px-8">
      <section
        className={cn(
          'min-w-0 w-full max-w-xl rounded-lg border border-border bg-surface px-6 py-10 text-center',
          'sm:px-12 sm:py-14',
        )}
      >
        <img
          className="mx-auto h-auto w-full max-w-64 sm:max-w-72"
          src="/brand/xama-lockup.png"
          alt="Xama"
        />

        <div className="mx-auto mt-2 max-w-md">
          <p className="text-sm font-medium tracking-[0.18em] text-primary uppercase">
            Fundação pronta
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Um novo espaço para conversar.
          </h1>
          <p className="mt-4 text-base leading-7 text-text-secondary sm:text-lg">
            A experiência Xama está em construção com uma base leve, responsiva e preparada para
            evoluir.
          </p>
        </div>

        <div className="mx-auto mt-8 flex w-fit max-w-full items-center justify-center gap-2 rounded-md bg-surface-raised px-4 py-2 text-center text-sm text-text-secondary">
          <span className="size-2 shrink-0 rounded-full bg-success" aria-hidden="true" />
          <span>Ambiente de desenvolvimento configurado</span>
        </div>
      </section>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="*" element={<FoundationPage />} />
    </Routes>
  );
}
