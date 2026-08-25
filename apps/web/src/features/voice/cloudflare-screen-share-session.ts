import type { MediaProviderMode } from '@xama/media-core';

import {
  CloudflareRealtimeClient,
  type CloudflareSessionDescription,
  type RealtimeRoomView,
} from '@/features/voice/cloudflare-realtime-client';
import type {
  BrowserMediaSession,
  ScreenShare,
  ScreenShareMediaDiagnostics,
  ScreenShareQuality,
  VoiceSessionSnapshot,
} from '@/features/voice/media-session';

type CloudflareJoinRequest = Readonly<{
  roomId: string;
  participantId: string;
  participantName: string;
  providerMode?: MediaProviderMode;
  turnstileToken?: string;
}>;

type SessionOptions = Readonly<{
  endpoint: string;
  client?: CloudflareRealtimeClient;
  createPeerConnection?: () => RTCPeerConnection;
}>;

const initialSnapshot: VoiceSessionSnapshot = {
  roomName: null,
  connectionState: 'idle',
  participants: [],
  screenShares: [],
  isLocalScreenSharing: false,
  screenShareOperation: 'idle',
  screenShareError: null,
  error: null,
};

function toSessionDescription(
  description: RTCSessionDescription | null,
): CloudflareSessionDescription {
  if (!description || (description.type !== 'offer' && description.type !== 'answer')) {
    throw new Error('O navegador não criou uma descrição WebRTC válida.');
  }
  return { type: description.type, sdp: description.sdp };
}

async function waitForIceGatheringComplete(peerConnection: RTCPeerConnection): Promise<void> {
  if (peerConnection.iceGatheringState === 'complete') return;
  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(finish, 5_000);
    function finish() {
      window.clearTimeout(timeout);
      peerConnection.removeEventListener('icegatheringstatechange', handleStateChange);
      resolve();
    }
    function handleStateChange() {
      if (peerConnection.iceGatheringState === 'complete') finish();
    }
    peerConnection.addEventListener('icegatheringstatechange', handleStateChange);
  });
}

export function createCloudflareScreenShares(
  room: RealtimeRoomView,
  localParticipantId: string,
  watchedScreenShareIds: ReadonlySet<string>,
  readyScreenShareIds: ReadonlySet<string>,
): readonly ScreenShare[] {
  return room.screenShares.map((screenShare) => {
    const isLocal = screenShare.participantId === localParticipantId;
    const isWatched = isLocal || watchedScreenShareIds.has(screenShare.id);
    return {
      id: screenShare.id,
      participantIdentity: screenShare.participantId,
      participantName: screenShare.participantName,
      isLocal,
      hasAudio: false,
      audioState: 'none',
      audioTrackId: null,
      watchState: !isWatched
        ? 'available'
        : isLocal || readyScreenShareIds.has(screenShare.id)
          ? 'ready'
          : 'subscribing',
      volume: 1,
      viewers: [],
    };
  });
}

function getCaptureConstraints(quality: ScreenShareQuality): DisplayMediaStreamOptions {
  const highQuality = quality === 'high';
  return {
    video: {
      width: { ideal: highQuality ? 1920 : 1280 },
      height: { ideal: highQuality ? 1080 : 720 },
      frameRate: { ideal: 30, max: 30 },
    },
    audio: false,
  };
}

export class CloudflareScreenShareSession implements BrowserMediaSession {
  private readonly client: CloudflareRealtimeClient;
  private readonly createPeerConnection: () => RTCPeerConnection;
  private snapshot: VoiceSessionSnapshot = initialSnapshot;
  private readonly listeners = new Set<() => void>();
  private peerConnection: RTCPeerConnection | null = null;
  private room: RealtimeRoomView | null = null;
  private roomId: string | null = null;
  private participantId: string | null = null;
  private capability: string | null = null;
  private localTrack: MediaStreamTrack | null = null;
  private localTransceiver: RTCRtpTransceiver | null = null;
  private localScreenShareId: string | null = null;
  private localTrackEndedListener: (() => void) | null = null;
  private readonly watchedScreenShareIds = new Set<string>();
  private readonly readyScreenShareIds = new Set<string>();
  private readonly pendingRemoteMids = new Map<string, string>();
  private readonly remoteTracks = new Map<string, MediaStreamTrack>();
  private roomPollTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private negotiationQueue: Promise<void> = Promise.resolve();

  constructor({ endpoint, client, createPeerConnection }: SessionOptions) {
    this.client = client ?? new CloudflareRealtimeClient(endpoint);
    this.createPeerConnection =
      createPeerConnection ??
      (() => new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }] }));
  }

  getSnapshot = (): VoiceSessionSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async join({
    roomId,
    participantId: requestedParticipantId,
    participantName,
    providerMode = 'cloudflare',
    turnstileToken,
  }: CloudflareJoinRequest): Promise<boolean> {
    void requestedParticipantId;
    await this.leave();
    this.setSnapshot({ ...initialSnapshot, roomName: roomId, connectionState: 'connecting' });
    try {
      const result = await this.client.join(roomId, participantName, providerMode, turnstileToken);
      if (result.provider !== 'cloudflare') {
        throw new Error('Esta sala foi atribuída ao LiveKit. Use a experiência Quick Share atual.');
      }
      const peerConnection = this.createPeerConnection();
      peerConnection.addEventListener('track', this.handleRemoteTrack);
      peerConnection.addEventListener('connectionstatechange', this.handleConnectionState);
      this.peerConnection = peerConnection;
      this.roomId = roomId;
      this.participantId = result.participantId;
      this.capability = result.capability;
      this.room = result.room;
      this.publishRoomState(result.room, { connectionState: 'connected', error: null });
      this.roomPollTimer = window.setInterval(() => void this.pollRoom(), 1_500);
      this.heartbeatTimer = window.setInterval(() => void this.sendHeartbeat(), 10_000);
      return true;
    } catch (error) {
      await this.reset();
      this.setSnapshot({
        ...initialSnapshot,
        error: error instanceof Error ? error.message : 'Não foi possível entrar na sala.',
      });
      return false;
    }
  }

  async leave(): Promise<void> {
    const roomId = this.roomId;
    const capability = this.capability;
    await this.reset();
    if (roomId && capability) {
      await this.client.leave(roomId, capability).catch(() => undefined);
    }
    this.setSnapshot(initialSnapshot);
  }

  async startScreenShare(quality: ScreenShareQuality = 'high'): Promise<void> {
    const peerConnection = this.peerConnection;
    const roomId = this.roomId;
    const capability = this.capability;
    if (!peerConnection || !roomId || !capability || this.localTrack) return;
    this.setSnapshot({
      ...this.snapshot,
      screenShareOperation: 'starting',
      screenShareError: null,
    });
    let captureTrack: MediaStreamTrack | null = null;
    try {
      const capture = await navigator.mediaDevices.getDisplayMedia(getCaptureConstraints(quality));
      captureTrack = capture.getVideoTracks()[0] ?? null;
      if (!captureTrack) throw new Error('Nenhuma faixa de vídeo foi capturada.');
      const transceiver = peerConnection.addTransceiver(captureTrack, {
        direction: 'sendonly',
        streams: [capture],
      });
      const endedListener = () => void this.stopScreenShare();
      captureTrack.addEventListener('ended', endedListener, { once: true });
      this.localTrack = captureTrack;
      this.localTransceiver = transceiver;
      this.localTrackEndedListener = endedListener;

      await this.enqueueNegotiation(async () => {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        await waitForIceGatheringComplete(peerConnection);
        if (!transceiver.mid) throw new Error('O navegador não identificou a faixa publicada.');
        const response = await this.client.publish(
          roomId,
          capability,
          transceiver.mid,
          toSessionDescription(peerConnection.localDescription),
        );
        this.localScreenShareId = response.screenShareId;
        await peerConnection.setRemoteDescription(response.sessionDescription);
      });
      await this.pollRoom();
      this.setSnapshot({ ...this.snapshot, screenShareOperation: 'idle', screenShareError: null });
    } catch {
      if (this.localScreenShareId) {
        await this.client
          .stopPublishing(roomId, capability, this.localScreenShareId)
          .catch(() => undefined);
        this.localScreenShareId = null;
      }
      if (captureTrack && captureTrack === this.localTrack) this.clearLocalTrack();
      else captureTrack?.stop();
      this.setSnapshot({
        ...this.snapshot,
        screenShareOperation: 'idle',
        screenShareError: 'O compartilhamento de tela não foi iniciado. Tente novamente.',
      });
    }
  }

  async stopScreenShare(): Promise<void> {
    const roomId = this.roomId;
    const capability = this.capability;
    const screenShareId = this.localScreenShareId;
    if (!this.localTrack) return;
    this.setSnapshot({
      ...this.snapshot,
      screenShareOperation: 'stopping',
      screenShareError: null,
    });
    this.clearLocalTrack();
    if (roomId && capability && screenShareId) {
      await this.client.stopPublishing(roomId, capability, screenShareId).catch(() => undefined);
    }
    this.localScreenShareId = null;
    if (this.room) await this.pollRoom();
    this.setSnapshot({ ...this.snapshot, screenShareOperation: 'idle', screenShareError: null });
  }

  watchScreenShare(screenShareId: string): void {
    const screenShare = this.snapshot.screenShares.find(
      (candidate) => candidate.id === screenShareId,
    );
    if (!screenShare || screenShare.isLocal || this.watchedScreenShareIds.has(screenShareId))
      return;
    this.watchedScreenShareIds.add(screenShareId);
    if (this.room) this.publishRoomState(this.room);
    void this.enqueueNegotiation(() => this.pullScreenShare(screenShareId));
  }

  stopWatchingScreenShare(screenShareId: string): void {
    if (!this.watchedScreenShareIds.has(screenShareId)) return;
    this.watchedScreenShareIds.delete(screenShareId);
    this.readyScreenShareIds.delete(screenShareId);
    this.remoteTracks.get(screenShareId)?.stop();
    this.remoteTracks.delete(screenShareId);
    if (this.room) this.publishRoomState(this.room);
    void this.enqueueNegotiation(() => this.unpullScreenShare(screenShareId));
  }

  attachScreenShareVideo(screenShareId: string, element: HTMLVideoElement): void {
    const track =
      screenShareId === this.localScreenShareId
        ? this.localTrack
        : this.remoteTracks.get(screenShareId);
    if (track) element.srcObject = new MediaStream([track]);
  }

  detachScreenShareVideo(_screenShareId: string, element: HTMLVideoElement): void {
    element.srcObject = null;
  }

  attachScreenShareAudio(screenShareId: string, element: HTMLAudioElement): void {
    void screenShareId;
    void element;
  }

  detachScreenShareAudio(screenShareId: string, element: HTMLAudioElement): void {
    void screenShareId;
    void element;
  }

  setScreenShareVolume(screenShareId: string, volume: number): void {
    void screenShareId;
    void volume;
  }

  toggleScreenShareMute(screenShareId: string): void {
    void screenShareId;
  }

  async getScreenShareDiagnostics(
    screenShareId: string,
  ): Promise<ScreenShareMediaDiagnostics | null> {
    const peerConnection = this.peerConnection;
    const screenShare = this.snapshot.screenShares.find(
      (candidate) => candidate.id === screenShareId,
    );
    if (!peerConnection || !screenShare) return null;
    const stats = await peerConnection.getStats();
    let framesPerSecond: number | null = null;
    let codec: string | null = null;
    stats.forEach((stat) => {
      const candidate = stat as RTCStats & {
        codecId?: string;
        framesPerSecond?: number;
        kind?: string;
        mediaType?: string;
      };
      const expectedType = screenShare.isLocal ? 'outbound-rtp' : 'inbound-rtp';
      if (
        candidate.type === expectedType &&
        (candidate.kind === 'video' || candidate.mediaType === 'video')
      ) {
        framesPerSecond = candidate.framesPerSecond ?? null;
        const codecStat = candidate.codecId ? stats.get(candidate.codecId) : undefined;
        codec = (codecStat as (RTCStats & { mimeType?: string }) | undefined)?.mimeType ?? null;
      }
    });
    return {
      provider: 'Cloudflare Realtime',
      bitrateKbps: null,
      framesPerSecond,
      codec,
      streamState: 'unknown',
    };
  }

  private readonly handleRemoteTrack = (event: RTCTrackEvent) => {
    const mid = event.transceiver.mid;
    const screenShareId = mid ? this.pendingRemoteMids.get(mid) : undefined;
    if (!screenShareId) return;
    this.pendingRemoteMids.delete(mid ?? '');
    this.remoteTracks.get(screenShareId)?.stop();
    this.remoteTracks.set(screenShareId, event.track);
    if (this.room) this.publishRoomState(this.room);
    event.track.addEventListener(
      'ended',
      () => {
        this.remoteTracks.delete(screenShareId);
        this.readyScreenShareIds.delete(screenShareId);
        if (this.room) this.publishRoomState(this.room);
      },
      { once: true },
    );
  };

  private readonly handleConnectionState = () => {
    const connectionState = this.peerConnection?.connectionState;
    if (connectionState === 'failed' || connectionState === 'closed') {
      this.setSnapshot({ ...this.snapshot, connectionState: 'disconnected' });
    }
  };

  private async pullScreenShare(screenShareId: string): Promise<void> {
    const peerConnection = this.peerConnection;
    const roomId = this.roomId;
    const capability = this.capability;
    if (!peerConnection || !roomId || !capability) return;
    try {
      const response = await this.client.subscribe(roomId, capability, screenShareId);
      this.pendingRemoteMids.set(response.mid, screenShareId);
      await this.answerProviderOffer(response.sessionDescription);
      this.readyScreenShareIds.add(screenShareId);
      if (this.room) this.publishRoomState(this.room);
    } catch {
      this.watchedScreenShareIds.delete(screenShareId);
      this.readyScreenShareIds.delete(screenShareId);
      if (this.room)
        this.publishRoomState(this.room, { error: 'Não foi possível assistir à transmissão.' });
    }
  }

  private async unpullScreenShare(screenShareId: string): Promise<void> {
    const roomId = this.roomId;
    const capability = this.capability;
    if (!roomId || !capability) return;
    try {
      const offer = await this.client.unsubscribe(roomId, capability, screenShareId);
      if (offer?.type === 'offer') await this.answerProviderOffer(offer);
    } catch {
      if (this.room)
        this.publishRoomState(this.room, { error: 'Não foi possível encerrar a assinatura.' });
    }
  }

  private async answerProviderOffer(offer: CloudflareSessionDescription): Promise<void> {
    const peerConnection = this.peerConnection;
    const roomId = this.roomId;
    const capability = this.capability;
    if (!peerConnection || !roomId || !capability) return;
    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    await waitForIceGatheringComplete(peerConnection);
    await this.client.renegotiate(
      roomId,
      capability,
      toSessionDescription(peerConnection.localDescription),
    );
  }

  private async pollRoom(): Promise<void> {
    const roomId = this.roomId;
    const capability = this.capability;
    if (!roomId || !capability) return;
    try {
      const room = await this.client.getRoom(roomId, capability);
      this.room = room;
      const activeScreenShareIds = new Set(room.screenShares.map((screenShare) => screenShare.id));
      for (const screenShareId of [...this.watchedScreenShareIds]) {
        if (!activeScreenShareIds.has(screenShareId)) {
          this.watchedScreenShareIds.delete(screenShareId);
          this.readyScreenShareIds.delete(screenShareId);
          this.remoteTracks.get(screenShareId)?.stop();
          this.remoteTracks.delete(screenShareId);
        }
      }
      this.publishRoomState(room);
    } catch {
      return;
    }
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.roomId || !this.capability) return;
    await this.client.heartbeat(this.roomId, this.capability).catch(() => undefined);
  }

  private publishRoomState(
    room: RealtimeRoomView,
    overrides: Partial<Pick<VoiceSessionSnapshot, 'connectionState' | 'error'>> = {},
  ): void {
    const participantId = this.participantId;
    if (!participantId) return;
    const screenShares = createCloudflareScreenShares(
      room,
      participantId,
      this.watchedScreenShareIds,
      this.readyScreenShareIds,
    );
    this.setSnapshot({
      ...this.snapshot,
      roomName: room.roomId,
      connectionState: overrides.connectionState ?? this.snapshot.connectionState,
      participants: room.participants.map((participant) => ({
        identity: participant.id,
        name: participant.name,
        isLocal: participant.id === participantId,
      })),
      screenShares,
      isLocalScreenSharing: screenShares.some((screenShare) => screenShare.isLocal),
      error: overrides.error === undefined ? this.snapshot.error : overrides.error,
    });
  }

  private enqueueNegotiation(operation: () => Promise<void>): Promise<void> {
    const result = this.negotiationQueue.then(operation, operation);
    this.negotiationQueue = result.catch(() => undefined);
    return result;
  }

  private clearLocalTrack(): void {
    if (this.localTrackEndedListener) {
      this.localTrack?.removeEventListener('ended', this.localTrackEndedListener);
    }
    void this.localTransceiver?.sender.replaceTrack(null);
    this.localTrack?.stop();
    this.localTrack = null;
    this.localTransceiver = null;
    this.localTrackEndedListener = null;
  }

  private async reset(): Promise<void> {
    if (this.roomPollTimer !== null) window.clearInterval(this.roomPollTimer);
    if (this.heartbeatTimer !== null) window.clearInterval(this.heartbeatTimer);
    this.roomPollTimer = null;
    this.heartbeatTimer = null;
    this.clearLocalTrack();
    this.localScreenShareId = null;
    this.remoteTracks.forEach((track) => track.stop());
    this.remoteTracks.clear();
    this.pendingRemoteMids.clear();
    this.watchedScreenShareIds.clear();
    this.readyScreenShareIds.clear();
    this.peerConnection?.removeEventListener('track', this.handleRemoteTrack);
    this.peerConnection?.removeEventListener('connectionstatechange', this.handleConnectionState);
    this.peerConnection?.close();
    this.peerConnection = null;
    this.room = null;
    this.negotiationQueue = Promise.resolve();
    this.roomId = null;
    this.participantId = null;
    this.capability = null;
  }

  private setSnapshot(snapshot: VoiceSessionSnapshot): void {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }
}
