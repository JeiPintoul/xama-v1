import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';

import { supportsScreenSharePublishing } from '@/features/quick-share/screen-share-capability';
import { getOrCreateGuestIdentity, loadGuestIdentity } from '@/features/voice/guest-identity';
import { CloudflareScreenShareSession } from '@/features/voice/cloudflare-screen-share-session';
import type { ScreenShare } from '@/features/voice/media-session';

type CloudflareRealtimeProofProps = Readonly<{
  roomId?: string;
}>;

function normalizeRoomId(value: string): string {
  return value
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, '-')
    .slice(0, 64);
}

function ScreenShareProofVideo({
  screenShare,
  session,
}: Readonly<{ screenShare: ScreenShare; session: CloudflareScreenShareSession }>) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || screenShare.watchState !== 'ready') return;
    video.muted = screenShare.isLocal;
    session.attachScreenShareVideo(screenShare.id, video);
    void video.play();
    return () => session.detachScreenShareVideo(screenShare.id, video);
  }, [screenShare.id, screenShare.isLocal, screenShare.watchState, session]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="aspect-video w-full rounded-lg bg-black object-contain"
      aria-label={`Tela compartilhada por ${screenShare.participantName}`}
    />
  );
}

export function CloudflareRealtimeProof({ roomId: routeRoomId }: CloudflareRealtimeProofProps) {
  const navigate = useNavigate();
  const [session] = useState(
    () =>
      new CloudflareScreenShareSession({
        endpoint: import.meta.env.VITE_REALTIME_ENDPOINT ?? '',
      }),
  );
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  const [displayName, setDisplayName] = useState(
    () => loadGuestIdentity(window.localStorage)?.displayName ?? '',
  );
  const [roomInput, setRoomInput] = useState(routeRoomId ?? 'cf0-proof');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const isConnected = snapshot.connectionState === 'connected';

  useEffect(() => () => void session.leave(), [session]);

  async function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const participantName = displayName.trim();
    const roomId = normalizeRoomId(roomInput);
    if (!participantName || !roomId) {
      setJoinError('Informe seu nome e uma sala de teste válida.');
      return;
    }
    setJoinError(null);
    setIsJoining(true);
    const identity = getOrCreateGuestIdentity(window.localStorage, participantName, () =>
      crypto.randomUUID(),
    );
    const didJoin = await session.join({
      roomId,
      participantId: identity.id,
      participantName: identity.displayName,
      providerMode: 'cloudflare',
    });
    if (!didJoin) setJoinError(session.getSnapshot().error ?? 'Não foi possível entrar na sala.');
    setIsJoining(false);
  }

  async function leaveRoom() {
    await session.leave();
    navigate('/cf0');
  }

  return (
    <main className="min-h-svh bg-background px-4 py-5 text-foreground sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
              CF0 infrastructure spike
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Cloudflare Realtime proof
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Uma faixa de tela, descoberta antes da assinatura e recebida apenas após Assistir.
            </p>
          </div>
          <img src="/brand/xama-lockup.png" alt="Xama" className="h-7 w-auto" />
        </header>

        {!isConnected ? (
          <form
            onSubmit={(event) => void joinRoom(event)}
            className="mt-6 grid gap-4 rounded-xl border border-border bg-surface p-4 sm:max-w-xl sm:grid-cols-2"
          >
            <label className="text-sm font-medium">
              Seu nome
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={64}
                className="mt-1.5 min-h-11 w-full rounded-md border border-border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="text-sm font-medium">
              Sala de teste
              <input
                value={roomInput}
                onChange={(event) => setRoomInput(event.target.value)}
                maxLength={64}
                className="mt-1.5 min-h-11 w-full rounded-md border border-border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <button
              type="submit"
              disabled={isJoining}
              className="min-h-11 cursor-pointer rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground outline-none hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:col-span-2"
            >
              {isJoining ? 'Conectando…' : 'Entrar via Cloudflare'}
            </button>
            {joinError ? (
              <p role="alert" className="text-sm text-danger sm:col-span-2">
                {joinError}
              </p>
            ) : null}
          </form>
        ) : (
          <>
            <section className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3">
              <span className="text-sm font-semibold">Sala {snapshot.roomName}</span>
              <span className="text-xs text-text-muted">
                {snapshot.participants.length} participante(s) · Cloudflare Realtime SFU
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                {supportsScreenSharePublishing() ? (
                  <button
                    type="button"
                    disabled={snapshot.screenShareOperation !== 'idle'}
                    onClick={() =>
                      void (snapshot.isLocalScreenSharing
                        ? session.stopScreenShare()
                        : session.startScreenShare('high'))
                    }
                    className="min-h-11 cursor-pointer rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  >
                    {snapshot.isLocalScreenSharing ? 'Parar compartilhamento' : 'Compartilhar tela'}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void leaveRoom()}
                  className="min-h-11 cursor-pointer rounded-md border border-border px-4 text-sm font-medium text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Sair
                </button>
              </div>
            </section>

            {snapshot.screenShareError || snapshot.error ? (
              <p role="alert" className="mt-3 text-sm text-danger">
                {snapshot.screenShareError ?? snapshot.error}
              </p>
            ) : null}

            <section className="mt-5" aria-label="Transmissões Cloudflare disponíveis">
              <h2 className="text-sm font-semibold">Transmissões</h2>
              {snapshot.screenShares.length === 0 ? (
                <p className="mt-2 rounded-lg border border-dashed border-border p-5 text-sm text-text-muted">
                  Nenhuma tela publicada. Abra esta sala em outro navegador para o teste A → B.
                </p>
              ) : (
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  {snapshot.screenShares.map((screenShare) => (
                    <article
                      key={screenShare.id}
                      className="rounded-xl border border-border bg-surface p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold">{screenShare.participantName}</h3>
                          <p className="text-xs text-text-muted">
                            {screenShare.isLocal ? 'Prévia local' : 'Tela remota disponível'}
                          </p>
                        </div>
                        {!screenShare.isLocal ? (
                          <button
                            type="button"
                            onClick={() =>
                              screenShare.watchState === 'available'
                                ? session.watchScreenShare(screenShare.id)
                                : session.stopWatchingScreenShare(screenShare.id)
                            }
                            className="min-h-11 cursor-pointer rounded-md border border-border px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {screenShare.watchState === 'available'
                              ? 'Assistir'
                              : screenShare.watchState === 'subscribing'
                                ? 'Cancelar'
                                : 'Parar de assistir'}
                          </button>
                        ) : null}
                      </div>
                      {screenShare.watchState === 'ready' ? (
                        <ScreenShareProofVideo screenShare={screenShare} session={session} />
                      ) : (
                        <div className="grid aspect-video place-items-center rounded-lg bg-black/45 px-4 text-center text-sm text-text-muted">
                          {screenShare.watchState === 'subscribing'
                            ? 'Assinando a faixa selecionada…'
                            : 'A faixa existe no coordenador, mas ainda não está sendo recebida.'}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
