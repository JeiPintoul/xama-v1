import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { useFeedback } from '@/features/feedback/feedback-context';
import { getOrCreateGuestIdentity, loadGuestIdentity } from '@/features/voice/guest-identity';
import { ScreenSharePresentation } from '@/features/voice/ScreenSharePresentation';
import { useVoiceSession } from '@/features/voice/voice-session-context';
import { joinQuickRoom } from '@/features/quick-share/quick-room-client';
import { formatQuickRoomCode, getQuickRoomName } from '@/features/quick-share/room-code';
import { supportsScreenSharePublishing } from '@/features/quick-share/screen-share-capability';

type QuickShareRoomProps = Readonly<{
  code: string;
}>;

function getInitialDisplayName(): string {
  return loadGuestIdentity(window.localStorage)?.displayName ?? '';
}

function getScreenShareActionLabel(
  operation: 'idle' | 'starting' | 'stopping',
  isLocalScreenSharing: boolean,
): string {
  if (operation === 'starting') return 'Iniciando compartilhamento…';
  if (operation === 'stopping') return 'Parando compartilhamento…';
  return isLocalScreenSharing ? 'Parar compartilhamento' : 'Compartilhar tela';
}

export function QuickShareRoom({ code }: QuickShareRoomProps) {
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();
  const {
    snapshot,
    join,
    leave,
    startScreenShare,
    stopScreenShare,
    setScreenShareVolume,
    attachScreenShareVideo,
    detachScreenShareVideo,
    attachScreenShareAudio,
    detachScreenShareAudio,
    getScreenShareDiagnostics,
    watchScreenShare,
    stopWatchingScreenShare,
  } = useVoiceSession();
  const [displayName, setDisplayName] = useState(getInitialDisplayName);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const didAttemptSavedIdentityJoin = useRef(false);
  const roomName = getQuickRoomName(code);
  const isCurrentRoom = snapshot.roomName === roomName;
  const isConnected = isCurrentRoom && snapshot.connectionState === 'connected';
  const isConnecting = isCurrentRoom && snapshot.connectionState === 'connecting';
  const canPublish = supportsScreenSharePublishing();

  useEffect(() => {
    if (!snapshot.error || !isCurrentRoom) return;
    showFeedback(snapshot.error, 'error');
  }, [isCurrentRoom, showFeedback, snapshot.error]);

  useEffect(() => {
    const savedName = getInitialDisplayName();
    if (!savedName || didAttemptSavedIdentityJoin.current || isCurrentRoom) return;
    didAttemptSavedIdentityJoin.current = true;
    void enterRoom(savedName);
  });

  async function enterRoom(submittedName = displayName) {
    const name = submittedName.trim();
    if (!name) {
      showFeedback('Informe seu nome para entrar.', 'error');
      return;
    }

    const identity = getOrCreateGuestIdentity(window.localStorage, name, () => crypto.randomUUID());
    await join({
      roomName,
      getConnectionDetails: () =>
        joinQuickRoom(
          import.meta.env.VITE_QUICK_ROOM_ENDPOINT ?? '',
          code,
          identity.id,
          identity.displayName,
        ),
    });
  }

  async function copy(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      showFeedback(message);
    } catch {
      showFeedback('Não foi possível copiar. Tente selecionar o texto.', 'error');
    }
  }

  async function exitRoom() {
    await leave();
    navigate('/');
  }

  if (!isConnected && !(isCurrentRoom && snapshot.connectionState === 'reconnecting')) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background px-5 py-8 text-foreground">
        <section className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl shadow-black/20 sm:p-6">
          <img src="/brand/xama-lockup.png" alt="Xama" className="h-8 w-auto" />
          <p className="mt-8 text-sm font-medium tracking-[0.14em] text-primary uppercase">
            Quick Share
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Sala {formatQuickRoomCode(code)}
          </h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            Entre para assistir e compartilhar telas nesta sala temporária.
          </p>
          <form
            className="mt-7 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void enterRoom();
            }}
          >
            <div>
              <label htmlFor="quick-room-display-name" className="text-sm font-medium">
                Seu nome
              </label>
              <input
                id="quick-room-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={64}
                autoComplete="name"
                disabled={isConnecting}
                className="mt-2 min-h-12 w-full rounded-md border border-border bg-background px-3 text-base outline-none placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                placeholder="Como você quer aparecer?"
              />
            </div>
            <button
              type="submit"
              disabled={isConnecting}
              className="min-h-12 w-full rounded-md bg-primary px-4 text-base font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isConnecting ? 'Entrando…' : 'Entrar na sala'}
            </button>
          </form>
        </section>
      </main>
    );
  }

  const roomLink = `${window.location.origin}/r/${formatQuickRoomCode(code)}`;
  const screenShareActionLabel = getScreenShareActionLabel(
    snapshot.screenShareOperation,
    snapshot.isLocalScreenSharing,
  );
  const isScreenSharePending = snapshot.screenShareOperation !== 'idle';

  return (
    <main className="min-h-svh bg-background text-foreground">
      {!isFocusMode ? (
        <header className="border-b border-border bg-surface px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <img src="/brand/xama-symbol.png" alt="Xama" className="h-7 w-auto" />
              <div>
                <p className="text-xs font-medium tracking-[0.12em] text-primary uppercase">
                  Quick Share
                </p>
                <p className="text-sm font-semibold">Sala {formatQuickRoomCode(code)}</p>
              </div>
              <span className="hidden text-sm text-text-muted sm:inline">
                {snapshot.participants.length}{' '}
                {snapshot.participants.length === 1 ? 'pessoa na sala' : 'pessoas na sala'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copy(formatQuickRoomCode(code), 'Código copiado.')}
                className="min-h-11 rounded-md border border-border px-3 text-sm font-medium text-text-secondary outline-none hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                Copiar código
              </button>
              <button
                type="button"
                onClick={() => void copy(roomLink, 'Link copiado.')}
                className="min-h-11 rounded-md border border-border px-3 text-sm font-medium text-text-secondary outline-none hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                Copiar link
              </button>
            </div>
          </div>
        </header>
      ) : null}
      <div className={isFocusMode ? '' : 'mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7'}>
        {!isFocusMode ? (
          <section
            className="mb-5 rounded-xl border border-border bg-surface/70 p-4 sm:p-5"
            aria-label="Participantes da sala"
          >
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Na sala</h2>
                <p className="mt-1 text-sm text-text-muted">Pessoas conectadas agora</p>
              </div>
              <span className="shrink-0 text-sm text-text-muted">
                {snapshot.participants.length}{' '}
                {snapshot.participants.length === 1 ? 'pessoa' : 'pessoas'}
              </span>
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {snapshot.participants.map((participant) => (
                <li
                  key={participant.identity}
                  className="flex min-w-0 items-center gap-3 rounded-lg border border-border/70 bg-background/70 px-3 py-2.5"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {participant.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {participant.name}
                    </span>
                    <span className="block text-xs text-text-muted">
                      {participant.isLocal ? 'Você' : 'Conectado'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <ScreenSharePresentation
          screenShares={snapshot.screenShares}
          onFocusModeChange={setIsFocusMode}
          onWatch={watchScreenShare}
          onStopWatching={stopWatchingScreenShare}
          onVolumeChange={setScreenShareVolume}
          onAttachVideo={attachScreenShareVideo}
          onDetachVideo={detachScreenShareVideo}
          onAttachAudio={attachScreenShareAudio}
          onDetachAudio={detachScreenShareAudio}
          getDiagnostics={getScreenShareDiagnostics}
        />
        {!isFocusMode ? (
          <section className="mt-5 flex flex-wrap items-center gap-3">
            {canPublish ? (
              <button
                type="button"
                disabled={snapshot.connectionState !== 'connected' || isScreenSharePending}
                onClick={() =>
                  void (snapshot.isLocalScreenSharing ? stopScreenShare() : startScreenShare())
                }
                className="min-h-12 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                {screenShareActionLabel}
              </button>
            ) : (
              <p className="max-w-md text-sm leading-6 text-text-secondary">
                Compartilhamento de tela ainda não é suportado por este navegador. Você ainda pode
                assistir às transmissões.
              </p>
            )}
            <button
              type="button"
              onClick={() => void exitRoom()}
              className="min-h-12 rounded-md border border-border px-4 text-sm font-medium text-text-secondary outline-none hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              Sair
            </button>
            {snapshot.connectionState === 'reconnecting' ? (
              <span className="text-sm text-warning">Reconectando…</span>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
