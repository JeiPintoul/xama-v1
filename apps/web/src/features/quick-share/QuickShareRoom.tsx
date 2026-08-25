import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';

import { useFeedback } from '@/features/feedback/feedback-context';
import { formatQuickRoomCode, getQuickRoomName } from '@/features/quick-share/room-code';
import { supportsScreenSharePublishing } from '@/features/quick-share/screen-share-capability';
import {
  loadScreenShareQuality,
  saveScreenShareQuality,
} from '@/features/quick-share/screen-share-quality';
import type { ScreenShareQuality } from '@/features/voice/media-session';
import { ScreenSharePresentation } from '@/features/voice/ScreenSharePresentation';
import { useVoiceSession } from '@/features/voice/voice-session-context';

type QuickShareRoomProps = Readonly<{
  code: string;
}>;

const qualityOptions: readonly Readonly<{
  value: ScreenShareQuality;
  label: string;
  target: string;
}>[] = [
  { value: 'balanced', label: 'Equilibrada', target: '720p · 30 FPS' },
  { value: 'high', label: 'Alta', target: '1080p · 30 FPS' },
];

function getScreenShareActionLabel(
  operation: 'idle' | 'starting' | 'stopping',
  isLocalScreenSharing: boolean,
): string {
  if (operation === 'starting') return 'Iniciando compartilhamento…';
  if (operation === 'stopping') return 'Parando compartilhamento…';
  return isLocalScreenSharing ? 'Parar compartilhamento' : 'Compartilhar tela';
}

function QualityPicker({
  quality,
  onChange,
}: Readonly<{
  quality: ScreenShareQuality;
  onChange: (quality: ScreenShareQuality) => void;
}>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = qualityOptions.find((option) => option.value === quality);

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="min-h-11 cursor-pointer rounded-md border border-border px-3 text-xs font-semibold text-text-secondary outline-none transition hover:border-primary/50 hover:bg-surface-raised hover:text-foreground active:translate-y-px active:bg-surface focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Qualidade alvo: ${selectedOption?.label}`}
        aria-expanded={isOpen}
      >
        {selectedOption?.label} · {selectedOption?.target.split(' · ')[0]}
      </button>
      {isOpen ? (
        <div className="absolute bottom-[calc(100%+0.5rem)] left-0 z-30 w-64 rounded-lg border border-border bg-surface p-1.5 shadow-xl shadow-black/30">
          <p className="px-2 py-1.5 text-xs text-text-muted">Qualidade alvo da transmissão</p>
          {qualityOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 text-left outline-none transition hover:bg-surface-raised active:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring ${
                option.value === quality ? 'bg-primary/10 text-primary' : 'text-foreground'
              }`}
            >
              <span className="text-sm font-medium">{option.label}</span>
              <span className="text-xs text-text-muted">{option.target}</span>
            </button>
          ))}
          <p className="px-2 py-1.5 text-[0.6875rem] leading-4 text-text-muted">
            O navegador e a rede podem adaptar o resultado.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function QuickShareRoom({ code }: QuickShareRoomProps) {
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();
  const {
    snapshot,
    leave,
    startScreenShare,
    stopScreenShare,
    setScreenShareVolume,
    toggleScreenShareMute,
    attachScreenShareVideo,
    detachScreenShareVideo,
    attachScreenShareAudio,
    detachScreenShareAudio,
    getScreenShareDiagnostics,
    watchScreenShare,
    stopWatchingScreenShare,
  } = useVoiceSession();
  const [quality, setQuality] = useState(() => loadScreenShareQuality(window.localStorage));
  const [isFocusMode, setIsFocusMode] = useState(false);
  const roomName = getQuickRoomName(code);
  const isCurrentRoom = snapshot.roomName === roomName;
  const isConnecting = isCurrentRoom && snapshot.connectionState === 'connecting';
  const canPublish = supportsScreenSharePublishing();

  useEffect(() => {
    if (!snapshot.error || !isCurrentRoom) return;
    showFeedback(snapshot.error, 'error');
  }, [isCurrentRoom, showFeedback, snapshot.error]);

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

  function changeQuality(nextQuality: ScreenShareQuality) {
    setQuality(nextQuality);
    saveScreenShareQuality(window.localStorage, nextQuality);
  }

  if (
    !isCurrentRoom ||
    !['connecting', 'connected', 'reconnecting'].includes(snapshot.connectionState)
  ) {
    return <Navigate to={`/?room=${encodeURIComponent(formatQuickRoomCode(code))}`} replace />;
  }

  if (isConnecting) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background px-5 py-6 text-foreground">
        <section
          className="w-full max-w-sm rounded-xl border border-border bg-surface p-4 text-center shadow-2xl shadow-black/20 sm:p-5"
          aria-label={`Entrando na sala ${formatQuickRoomCode(code)}`}
        >
          <img src="/brand/xama-lockup.png" alt="Xama" className="h-7 w-auto" />
          <p className="mt-5 text-sm text-text-secondary" role="status">
            Entrando na sala…
          </p>
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
        <header className="border-b border-border bg-surface px-4 py-2 sm:px-5">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <img src="/brand/xama-symbol.png" alt="Xama" className="h-6 w-auto" />
              <div>
                <p className="text-[0.6875rem] font-medium tracking-[0.12em] text-primary uppercase">
                  Quick Share
                </p>
                <p className="text-sm font-semibold">Sala {formatQuickRoomCode(code)}</p>
              </div>
              <span className="hidden text-xs text-text-muted sm:inline">
                {snapshot.participants.length}{' '}
                {snapshot.participants.length === 1 ? 'pessoa na sala' : 'pessoas na sala'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copy(formatQuickRoomCode(code), 'Código copiado.')}
                className="min-h-11 cursor-pointer rounded-md border border-border px-3 text-xs font-medium text-text-secondary outline-none transition hover:border-primary/40 hover:bg-surface-raised hover:text-foreground active:translate-y-px active:bg-surface focus-visible:ring-2 focus-visible:ring-ring"
              >
                Copiar código
              </button>
              <button
                type="button"
                onClick={() => void copy(roomLink, 'Link copiado.')}
                className="min-h-11 cursor-pointer rounded-md border border-border px-3 text-xs font-medium text-text-secondary outline-none transition hover:border-primary/40 hover:bg-surface-raised hover:text-foreground active:translate-y-px active:bg-surface focus-visible:ring-2 focus-visible:ring-ring"
              >
                Copiar link
              </button>
            </div>
          </div>
        </header>
      ) : null}
      <div className={isFocusMode ? '' : 'mx-auto max-w-5xl px-4 py-3.5 sm:px-5 sm:py-4'}>
        {!isFocusMode ? (
          <section
            className="mb-3 rounded-xl border border-border bg-surface/70 p-3 sm:p-3.5"
            aria-label="Participantes da sala"
          >
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Na sala</h2>
                <p className="mt-0.5 text-xs text-text-muted">Pessoas conectadas agora</p>
              </div>
              <span className="shrink-0 text-xs text-text-muted">
                {snapshot.participants.length}{' '}
                {snapshot.participants.length === 1 ? 'pessoa' : 'pessoas'}
              </span>
            </div>
            <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {snapshot.participants.map((participant) => (
                <li
                  key={participant.identity}
                  className="flex min-w-0 items-center gap-2.5 rounded-lg border border-border/70 bg-background/70 px-2.5 py-1.5"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-[0.6875rem] font-semibold text-primary">
                    {participant.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {participant.name}
                    </span>
                    <span className="block text-[0.6875rem] text-text-muted">
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
          onToggleMute={toggleScreenShareMute}
          onAttachVideo={attachScreenShareVideo}
          onDetachVideo={detachScreenShareVideo}
          onAttachAudio={attachScreenShareAudio}
          onDetachAudio={detachScreenShareAudio}
          getDiagnostics={getScreenShareDiagnostics}
        />
        {!isFocusMode ? (
          <section className="mt-3 flex flex-wrap items-center gap-2.5">
            {canPublish ? (
              <>
                <button
                  type="button"
                  disabled={snapshot.connectionState !== 'connected' || isScreenSharePending}
                  onClick={() =>
                    void (snapshot.isLocalScreenSharing
                      ? stopScreenShare()
                      : startScreenShare(quality))
                  }
                  className="min-h-11 cursor-pointer rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground outline-none transition hover:bg-primary/85 active:translate-y-px active:bg-primary/75 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {screenShareActionLabel}
                </button>
                {!snapshot.isLocalScreenSharing ? (
                  <QualityPicker quality={quality} onChange={changeQuality} />
                ) : null}
              </>
            ) : (
              <p className="max-w-md text-sm leading-6 text-text-secondary">
                Compartilhamento de tela ainda não é suportado por este navegador. Você ainda pode
                assistir às transmissões.
              </p>
            )}
            <button
              type="button"
              onClick={() => void exitRoom()}
              className="min-h-11 cursor-pointer rounded-md border border-border px-4 text-sm font-medium text-text-secondary outline-none transition hover:border-primary/40 hover:bg-surface-raised hover:text-foreground active:translate-y-px active:bg-surface focus-visible:ring-2 focus-visible:ring-ring"
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
