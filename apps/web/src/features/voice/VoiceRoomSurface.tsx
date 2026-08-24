import type { Channel, Community } from '@xama/domain';
import { useState } from 'react';

import { getOrCreateGuestIdentity, loadGuestIdentity } from '@/features/voice/guest-identity';
import { requestLiveKitToken } from '@/features/voice/livekit-token-client';
import { getVoiceRoomName } from '@/features/voice/room-name';
import { ScreenSharePresentation } from '@/features/voice/ScreenSharePresentation';
import { useVoiceSession } from '@/features/voice/voice-session-context';

type VoiceRoomSurfaceProps = Readonly<{
  community: Community;
  channel: Channel;
}>;

function getInitialDisplayName(): string {
  return loadGuestIdentity(window.localStorage)?.displayName ?? '';
}

function getScreenShareActionLabel(
  operation: 'idle' | 'starting' | 'stopping',
  isLocalScreenSharing: boolean,
): string {
  if (operation === 'starting') {
    return 'Iniciando compartilhamento…';
  }

  if (operation === 'stopping') {
    return 'Parando compartilhamento…';
  }

  return isLocalScreenSharing ? 'Parar compartilhamento' : 'Compartilhar tela';
}

export function VoiceRoomSurface({ community, channel }: VoiceRoomSurfaceProps) {
  const roomName = getVoiceRoomName(community.id, channel.id);
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
  const [accessCode, setAccessCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const isCurrentRoom = snapshot.roomName === roomName;
  const isConnected = isCurrentRoom && snapshot.connectionState === 'connected';
  const isConnecting = isCurrentRoom && snapshot.connectionState === 'connecting';
  const error = isCurrentRoom ? snapshot.error : formError;

  async function enterRoom() {
    const normalizedDisplayName = displayName.trim();
    const normalizedAccessCode = accessCode.trim();

    if (!normalizedDisplayName) {
      setFormError('Informe seu nome para entrar.');
      return;
    }

    if (!normalizedAccessCode) {
      setFormError('Informe o código de acesso alpha.');
      return;
    }

    setFormError(null);
    const identity = getOrCreateGuestIdentity(window.localStorage, normalizedDisplayName, () =>
      crypto.randomUUID(),
    );
    await join({
      roomName,
      getConnectionDetails: () =>
        requestLiveKitToken(import.meta.env.VITE_LIVEKIT_TOKEN_ENDPOINT ?? '', {
          room: roomName,
          identity: identity.id,
          name: identity.displayName,
          accessCode: normalizedAccessCode,
        }),
    });
    setAccessCode('');
  }

  if (isConnected || (isCurrentRoom && snapshot.connectionState === 'reconnecting')) {
    const participantCount = snapshot.participants.length;
    const isScreenShareOperationPending = snapshot.screenShareOperation !== 'idle';
    const screenShareActionLabel = getScreenShareActionLabel(
      snapshot.screenShareOperation,
      snapshot.isLocalScreenSharing,
    );
    const toggleScreenShare = () =>
      void (snapshot.isLocalScreenSharing ? stopScreenShare() : startScreenShare());

    return (
      <div
        className={
          isFocusMode
            ? 'w-[calc(100%+3rem)] -mx-6 -my-12 self-stretch sm:w-[calc(100%+5rem)] sm:-mx-10 lg:w-[calc(100%+7rem)] lg:-mx-14'
            : 'w-full max-w-2xl -translate-y-6 sm:-translate-y-8 lg:-translate-y-10'
        }
      >
        {!isFocusMode ? (
          <>
            <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
              Conectado · {community.name}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {channel.name}
            </h2>
            <p className="mt-3 text-sm text-text-secondary">
              Sala {roomName} ·{' '}
              {snapshot.connectionState === 'reconnecting' ? 'Reconectando…' : 'Conectado'}
            </p>

            <section
              className="mt-8 rounded-lg border border-border bg-surface-raised p-5"
              aria-label="Participantes da sala"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-sm font-semibold text-foreground">Participantes</h3>
                <span className="text-sm text-text-muted">
                  {participantCount} {participantCount === 1 ? 'pessoa' : 'pessoas'}
                </span>
              </div>
              <ul className="mt-4 space-y-2">
                {snapshot.participants.map((participant) => (
                  <li
                    key={participant.identity}
                    className="flex items-center gap-3 rounded-md bg-surface px-3 py-2 text-sm text-text-secondary"
                  >
                    <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <span className="truncate text-foreground">{participant.name}</span>
                    {participant.isLocal ? <span className="text-text-muted">Você</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          </>
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

        {snapshot.screenShareError ? (
          <p role="alert" className="mt-4 text-sm text-danger">
            {snapshot.screenShareError}
          </p>
        ) : null}

        {!isFocusMode ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={snapshot.connectionState !== 'connected' || isScreenShareOperationPending}
              onClick={toggleScreenShare}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              {screenShareActionLabel}
            </button>
            <button
              type="button"
              onClick={() => void leave()}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-secondary outline-none hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              Sair
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl -translate-y-6 sm:-translate-y-8 lg:-translate-y-10">
      <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
        Canal de voz · {community.name}
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {channel.name}
      </h2>
      <p className="mt-3 text-sm leading-6 text-text-secondary sm:text-base">
        {channel.description}
      </p>

      <form
        className="mt-8 space-y-4 rounded-lg border border-border bg-surface-raised p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void enterRoom();
        }}
      >
        <div>
          <label htmlFor="guest-display-name" className="text-sm font-medium text-foreground">
            Seu nome
          </label>
          <input
            id="guest-display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={64}
            autoComplete="name"
            disabled={isConnecting}
            className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Como você quer aparecer?"
          />
        </div>
        <div>
          <label htmlFor="alpha-access-code" className="text-sm font-medium text-foreground">
            Código de acesso alpha
          </label>
          <input
            id="alpha-access-code"
            type="password"
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            maxLength={256}
            autoComplete="off"
            disabled={isConnecting}
            className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Código recebido"
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isConnecting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isConnecting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
