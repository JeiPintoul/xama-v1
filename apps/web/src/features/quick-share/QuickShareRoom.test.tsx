import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router';

import { App } from '@/app/App';
import { AppProviders } from '@/app/AppProviders';
import { FeedbackContext } from '@/features/feedback/feedback-context';
import { QuickShareRoom } from '@/features/quick-share/QuickShareRoom';
import type { VoiceSessionContextValue } from '@/features/voice/voice-session-context';
import { VoiceSessionContext } from '@/features/voice/voice-session-context';

function createConnectingSession(): VoiceSessionContextValue {
  return {
    snapshot: {
      roomName: 'quick:XK7P4D2Q',
      connectionState: 'connecting',
      participants: [],
      screenShares: [],
      isLocalScreenSharing: false,
      screenShareOperation: 'idle',
      screenShareError: null,
      error: null,
    },
    join: vi.fn(),
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

describe('Quick Share route entry', () => {
  it('redirects a direct room URL to the landing with its code preserved', async () => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/r/xk7p-4d2q');

    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );

    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(window.location.search).toBe('?room=XK7P-4D2Q');
    expect(screen.getByLabelText('Código da sala')).toHaveValue('XK7P-4D2Q');
    expect(screen.queryByRole('button', { name: 'Entrar na sala' })).not.toBeInTheDocument();
  });

  it('shows only connection progress for an already connecting room session', () => {
    window.history.replaceState(null, '', '/r/XK7P-4D2Q');

    render(
      <FeedbackContext.Provider value={{ showFeedback: vi.fn() }}>
        <VoiceSessionContext.Provider value={createConnectingSession()}>
          <BrowserRouter>
            <QuickShareRoom code="XK7P4D2Q" />
          </BrowserRouter>
        </VoiceSessionContext.Provider>
      </FeedbackContext.Provider>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Entrando na sala…');
    expect(screen.queryByLabelText('Seu nome')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Entrar na sala' })).not.toBeInTheDocument();
  });
});
