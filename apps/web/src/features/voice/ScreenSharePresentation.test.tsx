import { act, fireEvent, render, screen } from '@testing-library/react';
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
  audioTrackId: 'audio-a',
  volume: 1,
  mediaStream,
};

const secondScreenShare: ScreenShare = {
  id: 'guest-b:track-b',
  participantIdentity: 'guest-b',
  participantName: 'Bia',
  isLocal: false,
  hasAudio: true,
  audioTrackId: 'audio-b',
  volume: 0.4,
  mediaStream,
};

const defaultProps = {
  onFocusModeChange: vi.fn(),
  onVolumeChange: vi.fn(),
  onAttachAudio: vi.fn(),
  onDetachAudio: vi.fn(),
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('screen share presentation', () => {
  it('focuses one share and returns to the complete grid without duplicating its video', () => {
    const { container } = render(
      <ScreenSharePresentation
        screenShares={[firstScreenShare, secondScreenShare]}
        {...defaultProps}
      />,
    );

    expect(screen.getAllByLabelText(/Tela compartilhada por/)).toHaveLength(2);
    expect(container.querySelectorAll('audio')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Focar tela de Ana' }));

    expect(screen.getByRole('button', { name: 'Voltar à grade' })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Tela compartilhada por Ana')).toHaveLength(1);
    expect(screen.queryByLabelText('Tela compartilhada por Bia')).not.toBeInTheDocument();
    expect(container.querySelectorAll('audio')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Voltar à grade' }));

    expect(screen.getAllByLabelText(/Tela compartilhada por/)).toHaveLength(2);
    expect(container.querySelectorAll('audio')).toHaveLength(2);
  });

  it('returns to the grid when the focused share is removed', () => {
    const { rerender } = render(
      <ScreenSharePresentation
        screenShares={[firstScreenShare, secondScreenShare]}
        {...defaultProps}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Focar tela de Ana' }));
    rerender(<ScreenSharePresentation screenShares={[secondScreenShare]} {...defaultProps} />);

    expect(screen.queryByRole('button', { name: 'Voltar à grade' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Tela compartilhada por Bia')).toBeInTheDocument();
  });

  it('keeps independent remote share volumes when switching between grid and focus', () => {
    const onVolumeChange = vi.fn();
    const firstScreenShareAtQuarterVolume = { ...firstScreenShare, volume: 0.25 };
    const secondScreenShareAtMute = { ...secondScreenShare, volume: 0 };
    const { rerender } = render(
      <ScreenSharePresentation
        screenShares={[firstScreenShare, secondScreenShare]}
        {...defaultProps}
        onVolumeChange={onVolumeChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Volume de Ana: 100%' }));
    fireEvent.change(screen.getByLabelText('Volume de Ana'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Volume de Bia: 40%' }));
    fireEvent.change(screen.getByLabelText('Volume de Bia'), { target: { value: '0' } });

    expect(onVolumeChange).toHaveBeenNthCalledWith(1, firstScreenShare.id, 0.25);
    expect(onVolumeChange).toHaveBeenNthCalledWith(2, secondScreenShare.id, 0);

    rerender(
      <ScreenSharePresentation
        screenShares={[firstScreenShareAtQuarterVolume, secondScreenShareAtMute]}
        {...defaultProps}
        onVolumeChange={onVolumeChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Focar tela de Ana' }));

    expect(screen.getByLabelText('Volume de Ana')).toHaveValue('25');

    fireEvent.click(screen.getByRole('button', { name: 'Voltar à grade' }));
    fireEvent.click(screen.getByRole('button', { name: 'Volume de Ana: 25%' }));

    expect(screen.getByLabelText('Volume de Ana')).toHaveValue('25');
    expect(screen.getByRole('button', { name: 'Volume de Bia: 0%' })).toBeInTheDocument();
  });

  it('keeps mobile-equivalent focus controls available when fullscreen is unsupported', () => {
    render(<ScreenSharePresentation screenShares={[firstScreenShare]} {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Focar tela de Ana' }));

    expect(screen.getByRole('button', { name: 'Voltar à grade' })).toBeInTheDocument();
  });

  it('hides focused viewing controls after inactivity and restores them with pointer activity', () => {
    vi.useFakeTimers();
    render(<ScreenSharePresentation screenShares={[firstScreenShare]} {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Focar tela de Ana' }));
    act(() => vi.advanceTimersByTime(2800));

    const overlay = screen.getByRole('button', { name: 'Voltar à grade' }).parentElement
      ?.parentElement;
    expect(overlay).toHaveClass('pointer-events-none');

    fireEvent.pointerMove(screen.getByTestId('screen-share-focus-stage'));
    expect(overlay).toHaveClass('opacity-100');
  });

  it('requests browser fullscreen for the selected share', () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    });

    render(<ScreenSharePresentation screenShares={[firstScreenShare]} {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Focar tela de Ana' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tela cheia' }));

    expect(requestFullscreen).toHaveBeenCalledTimes(1);
  });
});
