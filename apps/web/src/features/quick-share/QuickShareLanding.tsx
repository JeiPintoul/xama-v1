import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { useFeedback } from '@/features/feedback/feedback-context';
import {
  createQuickRoom,
  getQuickRoomJoinErrorMessage,
  joinQuickRoom,
} from '@/features/quick-share/quick-room-client';
import {
  formatQuickRoomCode,
  getQuickRoomName,
  normalizeQuickRoomCode,
} from '@/features/quick-share/room-code';
import { getOrCreateGuestIdentity, loadGuestIdentity } from '@/features/voice/guest-identity';
import { useVoiceSession } from '@/features/voice/voice-session-context';

function getInitialDisplayName(): string {
  return loadGuestIdentity(window.localStorage)?.displayName ?? '';
}

export function QuickShareLanding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showFeedback } = useFeedback();
  const { join } = useVoiceSession();
  const [displayName, setDisplayName] = useState(getInitialDisplayName);
  const [roomCode, setRoomCode] = useState(() => {
    const requestedRoom = searchParams.get('room')?.trim().toUpperCase() ?? '';
    return formatQuickRoomCode(requestedRoom);
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

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
      if (!code) throw new Error('Não foi possível criar a sala. Tente novamente.');

      const didConnect = await join({
        roomName: getQuickRoomName(code),
        getConnectionDetails: async () => connection,
      });
      if (!didConnect) throw new Error('Não foi possível criar a sala. Tente novamente.');

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

  async function enterRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoinError(null);
    const name = displayName.trim();
    if (!name) {
      setJoinError('Informe seu nome para entrar.');
      return;
    }

    const code = normalizeQuickRoomCode(roomCode);
    if (!code) {
      setJoinError('Use um código de sala válido.');
      return;
    }

    setIsJoining(true);
    const identity = getOrCreateGuestIdentity(window.localStorage, name, () => crypto.randomUUID());
    try {
      const connection = await joinQuickRoom(
        import.meta.env.VITE_QUICK_ROOM_ENDPOINT ?? '',
        code,
        identity.id,
        identity.displayName,
      );
      const didConnect = await join({
        roomName: getQuickRoomName(code),
        getConnectionDetails: async () => connection,
      });
      if (!didConnect) {
        setJoinError('Não foi possível entrar na sala. Tente novamente.');
        return;
      }

      navigate(`/r/${formatQuickRoomCode(code)}`);
    } catch (error) {
      setJoinError(getQuickRoomJoinErrorMessage(error));
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <main className="relative flex min-h-svh overflow-hidden bg-background px-4 py-3 text-foreground sm:px-6 sm:py-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,oklch(0.37_0.08_260_/_0.2),transparent_30rem)]" />
      <div className="relative mx-auto flex w-full max-w-[64rem] flex-col">
        <header className="flex justify-center pt-1">
          <img
            src="/brand/xama-lockup.png"
            alt="Xama"
            className="h-[clamp(2rem,min(2.4vw,4.5vh),2.5rem)] w-auto"
          />
        </header>
        <section className="flex flex-1 items-center justify-center py-[clamp(1.5rem,4vh,3.5rem)]">
          <div className="w-full max-w-[min(100%,31rem)] text-center">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              Quick Share Beta
            </p>
            <h1 className="mt-2.5 text-[clamp(2rem,min(3.6vw,6vh),3.4rem)] leading-[1] font-semibold tracking-[-0.05em] text-balance">
              Compartilhe sua tela.
              <br />
              Sem complicação.
            </h1>
            <p className="mx-auto mt-3.5 max-w-md text-[clamp(0.9rem,1vw,1rem)] leading-6 text-text-secondary">
              Crie uma sala e envie o link. Quem receber entra para assistir ou compartilhar também.
            </p>

            <div className="mx-auto mt-5 max-w-[29rem] rounded-xl border border-border bg-surface/90 p-3.5 text-left shadow-xl shadow-black/20 sm:mt-6 sm:p-4">
              <label htmlFor="quick-display-name" className="text-sm font-medium text-foreground">
                Seu nome
              </label>
              <input
                id="quick-display-name"
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  setJoinError(null);
                }}
                maxLength={64}
                autoComplete="name"
                placeholder="Como você quer aparecer?"
                className="mt-1.5 min-h-11 w-full rounded-md border border-border bg-background px-3 text-base outline-none placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="button"
                disabled={isCreating || isJoining}
                onClick={() => void createRoom()}
                className="mt-3 min-h-11 w-full cursor-pointer rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground outline-none transition hover:bg-primary/85 active:translate-y-px active:bg-primary/75 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? 'Criando sala…' : 'Criar uma sala'}
              </button>

              <div className="my-4 flex items-center gap-3 text-xs text-text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                ou
              </div>
              <form onSubmit={(event) => void enterRoom(event)}>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="sr-only" htmlFor="quick-room-code">
                    Código da sala
                  </label>
                  <input
                    id="quick-room-code"
                    value={roomCode}
                    onChange={(event) => {
                      setRoomCode(event.target.value.toUpperCase());
                      setJoinError(null);
                    }}
                    placeholder="Código da sala"
                    autoComplete="off"
                    aria-invalid={Boolean(joinError)}
                    aria-describedby={joinError ? 'quick-room-join-error' : undefined}
                    className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-base tracking-[0.08em] outline-none placeholder:tracking-normal placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button
                    type="submit"
                    disabled={isJoining || isCreating}
                    className="min-h-11 w-full cursor-pointer rounded-md border border-border px-4 text-sm font-semibold text-text-secondary outline-none transition hover:border-primary/50 hover:bg-surface-raised hover:text-foreground active:translate-y-px active:bg-surface focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {isJoining ? 'Entrando…' : 'Entrar'}
                  </button>
                </div>
                {joinError ? (
                  <p id="quick-room-join-error" role="alert" className="mt-2 text-sm text-danger">
                    {joinError}
                  </p>
                ) : null}
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
