import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter, Route, Routes } from 'react-router';

import { FeedbackContext } from '@/features/feedback/feedback-context';
import { QuickShareLanding } from '@/features/quick-share/QuickShareLanding';
import type { VoiceSessionContextValue } from '@/features/voice/voice-session-context';
import { VoiceSessionContext } from '@/features/voice/voice-session-context';

const quickRoomClientMocks = vi.hoisted(() => ({
  createQuickRoom: vi.fn(),
  joinQuickRoom: vi.fn(),
}));

vi.mock('@/features/quick-share/quick-room-client', async () => {
  const actual = await vi.importActual<typeof import('@/features/quick-share/quick-room-client')>(
    '@/features/quick-share/quick-room-client',
  );
  return {
    ...actual,
    createQuickRoom: quickRoomClientMocks.createQuickRoom,
    joinQuickRoom: quickRoomClientMocks.joinQuickRoom,
  };
});

const connection = {
  code: 'XK7P4D2Q',
  token: 'token',
  serverUrl: 'wss://xama.livekit.cloud',
};

function createVoiceSessionValue(join: VoiceSessionContextValue['join']): VoiceSessionContextValue {
  return {
    snapshot: {
      roomName: null,
      connectionState: 'idle',
      participants: [],
      screenShares: [],
      isLocalScreenSharing: false,
      screenShareOperation: 'idle',
      screenShareError: null,
      error: null,
    },
    join,
    leave: vi.fn(),
    startScreenShare: vi.fn(),
    stopScreenShare: vi.fn(),
    setScreenShareVolume: vi.fn(),
    toggleScreenShareMute: vi.fn(),
    attachScreenShareVideo: vi.fn(),
    detachScreenShareVideo: vi.fn(),
    attachScreenShareAudio: vi.fn(),
    detachScreenShareAudio: vi.fn(),
    getScreenShareDiagnostics: vi.fn(),
    watchScreenShare: vi.fn(),
    stopWatchingScreenShare: vi.fn(),
  };
}

function renderLanding(path = '/', join = vi.fn().mockResolvedValue(true)) {
  window.history.replaceState(null, '', path);
  const showFeedback = vi.fn();
  render(
    <FeedbackContext.Provider value={{ showFeedback }}>
      <VoiceSessionContext.Provider value={createVoiceSessionValue(join)}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<QuickShareLanding />} />
            <Route path="/r/:code" element={<h1>Destino da sala</h1>} />
          </Routes>
        </BrowserRouter>
      </VoiceSessionContext.Provider>
    </FeedbackContext.Provider>,
  );
  return { join, showFeedback };
}

function fillJoinForm(code = 'XK7P-4D2Q') {
  fireEvent.change(screen.getByLabelText('Seu nome'), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByLabelText('Código da sala'), { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

afterEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('Quick Share landing join flow', () => {
  it('validates the room and connects before navigating', async () => {
    quickRoomClientMocks.joinQuickRoom.mockResolvedValue(connection);
    const join = vi.fn(async () => {
      expect(quickRoomClientMocks.joinQuickRoom).toHaveBeenCalledTimes(1);
      return true;
    });
    renderLanding('/', join);

    fillJoinForm();

    await waitFor(() => expect(quickRoomClientMocks.joinQuickRoom).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(join).toHaveBeenCalledTimes(1));
    expect(join).toHaveBeenCalledWith(expect.objectContaining({ roomName: 'quick:XK7P4D2Q' }));
    expect(await screen.findByRole('heading', { name: 'Destino da sala' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/r/XK7P-4D2Q');
  });

  it('keeps malformed codes on the landing with an inline error', () => {
    renderLanding();

    fillJoinForm('SHORT');

    expect(screen.getByRole('alert')).toHaveTextContent('Use um código de sala válido.');
    expect(quickRoomClientMocks.joinQuickRoom).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/');
  });

  it('keeps nonexistent rooms on the landing with the safe not-found error', async () => {
    quickRoomClientMocks.joinQuickRoom.mockRejectedValue(
      new Error('Esta sala não foi encontrada ou já expirou.'),
    );
    renderLanding();

    fillJoinForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esta sala não foi encontrada ou já expirou.',
    );
    expect(window.location.pathname).toBe('/');
  });

  it('does not navigate when the media session cannot connect', async () => {
    quickRoomClientMocks.joinQuickRoom.mockResolvedValue(connection);
    renderLanding('/', vi.fn().mockResolvedValue(false));

    fillJoinForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível entrar na sala. Tente novamente.',
    );
    expect(window.location.pathname).toBe('/');
  });

  it('prefills a room code from the direct-link query string', () => {
    renderLanding('/?room=xk7p-4d2q');

    expect(screen.getByLabelText('Código da sala')).toHaveValue('XK7P-4D2Q');
    expect(quickRoomClientMocks.joinQuickRoom).not.toHaveBeenCalled();
  });

  it('still creates, connects, and navigates to a new room', async () => {
    quickRoomClientMocks.createQuickRoom.mockResolvedValue(connection);
    const { join } = renderLanding();
    fireEvent.change(screen.getByLabelText('Seu nome'), { target: { value: 'Ana' } });

    fireEvent.click(screen.getByRole('button', { name: 'Criar uma sala' }));

    await waitFor(() => expect(quickRoomClientMocks.createQuickRoom).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(join).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('heading', { name: 'Destino da sala' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/r/XK7P-4D2Q');
  });
});
