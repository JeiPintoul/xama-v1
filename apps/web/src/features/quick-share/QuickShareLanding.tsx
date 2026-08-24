import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';

import { useFeedback } from '@/features/feedback/feedback-context';
import { getOrCreateGuestIdentity, loadGuestIdentity } from '@/features/voice/guest-identity';
import { useVoiceSession } from '@/features/voice/voice-session-context';
import { createQuickRoom } from '@/features/quick-share/quick-room-client';
import {
  formatQuickRoomCode,
  getQuickRoomName,
  normalizeQuickRoomCode,
} from '@/features/quick-share/room-code';

function getInitialDisplayName(): string {
  return loadGuestIdentity(window.localStorage)?.displayName ?? '';
}

export function QuickShareLanding() {
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();
  const { join } = useVoiceSession();
  const [displayName, setDisplayName] = useState(getInitialDisplayName);
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  async function createRoom() {
    const name = displayName.trim();
    if (!name) {
      showFeedback('Informe seu nome para criar uma sala.', 'error');
      return;
    }

    setIsCreating(true);
    const identity = getOrCreateGuestIdentity(window.localStorage, name, () => crypto.randomUUID());
    try {
      const connection = await createQuickRoom(
        import.meta.env.VITE_QUICK_ROOM_ENDPOINT ?? '',
        identity.id,
        identity.displayName,
      );
      const code = normalizeQuickRoomCode(connection.code);
      if (!code) {
        throw new Error('Não foi possível criar a sala. Tente novamente.');
      }

      void join({
        roomName: getQuickRoomName(code),
        getConnectionDetails: async () => connection,
      });
      navigate(`/r/${formatQuickRoomCode(code)}`);
    } catch (error) {
      showFeedback(
        error instanceof Error ? error.message : 'Não foi possível criar a sala. Tente novamente.',
        'error',
      );
    } finally {
      setIsCreating(false);
    }
  }

  function goToRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = normalizeQuickRoomCode(roomCode);
    if (!code) {
      showFeedback('Use um código de sala válido.', 'error');
      return;
    }

    navigate(`/r/${formatQuickRoomCode(code)}`);
  }

  return (
    <main className="relative flex min-h-svh overflow-hidden bg-background px-5 py-6 text-foreground sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,oklch(0.35_0.08_260_/_0.18),transparent_32rem)]" />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col">
        <header>
          <img src="/brand/xama-lockup.png" alt="Xama" className="h-8 w-auto sm:h-10" />
        </header>
        <section className="flex flex-1 items-center py-12 sm:py-16">
          <div className="w-full max-w-xl">
            <p className="text-sm font-medium tracking-[0.16em] text-primary uppercase">
              Quick Share Beta
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
              Compartilhe sua tela.
              <br />
              Sem complicação.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-text-secondary sm:text-lg">
              Crie uma sala e envie o link. Quem receber entra para assistir ou compartilhar também.
            </p>

            <div className="mt-10 rounded-xl border border-border bg-surface/90 p-5 shadow-2xl shadow-black/20 sm:p-6">
              <label htmlFor="quick-display-name" className="text-sm font-medium">
                Seu nome
              </label>
              <input
                id="quick-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={64}
                autoComplete="name"
                placeholder="Como você quer aparecer?"
                className="mt-2 min-h-12 w-full rounded-md border border-border bg-background px-3 text-base outline-none placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="button"
                disabled={isCreating}
                onClick={() => void createRoom()}
                className="mt-4 min-h-12 w-full rounded-md bg-primary px-4 text-base font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? 'Criando sala…' : 'Criar uma sala'}
              </button>

              <div className="my-5 flex items-center gap-3 text-xs text-text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                ou
              </div>
              <form onSubmit={goToRoom} className="flex gap-2">
                <label className="sr-only" htmlFor="quick-room-code">
                  Código da sala
                </label>
                <input
                  id="quick-room-code"
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                  placeholder="Código da sala"
                  autoComplete="off"
                  className="min-h-12 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-base tracking-[0.08em] outline-none placeholder:tracking-normal placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="submit"
                  className="min-h-12 rounded-md border border-border px-4 text-sm font-semibold text-text-secondary outline-none hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Entrar
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
