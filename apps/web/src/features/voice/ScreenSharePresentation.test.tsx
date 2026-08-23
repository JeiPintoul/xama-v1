import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ScreenSharePresentation } from '@/features/voice/ScreenSharePresentation';
import type { ScreenShare } from '@/features/voice/livekit-voice-session';

const mediaStream = new MediaStream();

const firstScreenShare: ScreenShare = {
  id: 'guest-a:track-a',
  participantIdentity: 'guest-a',
  participantName: 'Ana',
  isLocal: false,
  hasAudio: true,
  mediaStream,
};

const secondScreenShare: ScreenShare = {
  id: 'guest-b:track-b',
  participantIdentity: 'guest-b',
  participantName: 'Bia',
  isLocal: false,
  hasAudio: false,
  mediaStream,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('screen share presentation', () => {
  it('focuses one share and returns to the complete grid without duplicating its video', () => {
    render(
      <ScreenSharePresentation
        screenShares={[firstScreenShare, secondScreenShare]}
        onFocusModeChange={vi.fn()}
        onToggleScreenShare={vi.fn()}
        screenShareActionLabel="Compartilhar tela"
        isScreenShareActionDisabled={false}
        onLeave={vi.fn()}
      />,
    );

    expect(screen.getAllByLabelText(/Tela compartilhada por/)).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Focar tela de Ana' }));

    expect(screen.getByRole('button', { name: 'Voltar à grade' })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Tela compartilhada por Ana')).toHaveLength(1);
    expect(screen.queryByLabelText('Tela compartilhada por Bia')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Voltar à grade' }));

    expect(screen.getAllByLabelText(/Tela compartilhada por/)).toHaveLength(2);
  });

  it('returns to the grid when the focused share is removed', () => {
    const { rerender } = render(
      <ScreenSharePresentation
        screenShares={[firstScreenShare, secondScreenShare]}
        onFocusModeChange={vi.fn()}
        onToggleScreenShare={vi.fn()}
        screenShareActionLabel="Compartilhar tela"
        isScreenShareActionDisabled={false}
        onLeave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Focar tela de Ana' }));
    rerender(
      <ScreenSharePresentation
        screenShares={[secondScreenShare]}
        onFocusModeChange={vi.fn()}
        onToggleScreenShare={vi.fn()}
        screenShareActionLabel="Compartilhar tela"
        isScreenShareActionDisabled={false}
        onLeave={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Voltar à grade' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Tela compartilhada por Bia')).toBeInTheDocument();
  });

  it('requests browser fullscreen for the selected share', () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    });

    render(
      <ScreenSharePresentation
        screenShares={[firstScreenShare]}
        onFocusModeChange={vi.fn()}
        onToggleScreenShare={vi.fn()}
        screenShareActionLabel="Compartilhar tela"
        isScreenShareActionDisabled={false}
        onLeave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Focar tela de Ana' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tela cheia' }));

    expect(requestFullscreen).toHaveBeenCalledTimes(1);
  });
});
