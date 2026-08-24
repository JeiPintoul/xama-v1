import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ScreenShare } from '@/features/voice/media-session';
import { ScreenSharePresentation } from '@/features/voice/ScreenSharePresentation';

const firstScreenShare: ScreenShare = {
  id: 'guest-a:track-a',
  participantIdentity: 'guest-a',
  participantName: 'Ana',
  isLocal: false,
  hasAudio: true,
  audioState: 'available',
  audioTrackId: 'audio-a',
  watchState: 'available',
  volume: 1,
  viewers: [],
};

const secondScreenShare: ScreenShare = {
  id: 'guest-b:track-b',
  participantIdentity: 'guest-b',
  participantName: 'Bia',
  isLocal: false,
  hasAudio: true,
  audioState: 'available',
  audioTrackId: 'audio-b',
  watchState: 'available',
  volume: 0.4,
  viewers: [],
};

const readyFirstScreenShare: ScreenShare = {
  ...firstScreenShare,
  audioState: 'ready',
  watchState: 'ready',
};

const defaultProps = {
  onFocusModeChange: vi.fn(),
  onWatch: vi.fn(),
  onStopWatching: vi.fn(),
  onVolumeChange: vi.fn(),
  onAttachVideo: vi.fn(),
  onDetachVideo: vi.fn(),
  onAttachAudio: vi.fn(),
  onDetachAudio: vi.fn(),
  getDiagnostics: vi.fn().mockResolvedValue(null),
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('screen share presentation', () => {
  it('starts playback only after selecting a share and can stop watching it', () => {
    const onWatch = vi.fn();
    const onStopWatching = vi.fn();
    const onAttachVideo = vi.fn();
    const onDetachVideo = vi.fn();
    const { container, rerender } = render(
      <ScreenSharePresentation
        screenShares={[firstScreenShare, secondScreenShare]}
        {...defaultProps}
        onWatch={onWatch}
        onStopWatching={onStopWatching}
        onAttachVideo={onAttachVideo}
        onDetachVideo={onDetachVideo}
      />,
    );

    expect(container.querySelectorAll('video')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Assistir tela de Ana' }));

    expect(onWatch).toHaveBeenCalledWith(firstScreenShare.id);
    expect(container.querySelectorAll('video')).toHaveLength(0);

    rerender(
      <ScreenSharePresentation
        screenShares={[{ ...firstScreenShare, watchState: 'subscribing' }, secondScreenShare]}
        {...defaultProps}
        onWatch={onWatch}
        onStopWatching={onStopWatching}
        onAttachVideo={onAttachVideo}
        onDetachVideo={onDetachVideo}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Assinando transmissÃ£oâ€¦');

    rerender(
      <ScreenSharePresentation
        screenShares={[readyFirstScreenShare, secondScreenShare]}
        {...defaultProps}
        onWatch={onWatch}
        onStopWatching={onStopWatching}
        onAttachVideo={onAttachVideo}
        onDetachVideo={onDetachVideo}
      />,
    );
    expect(screen.getByLabelText('Tela compartilhada por Ana')).toBeInTheDocument();
    expect(onAttachVideo).toHaveBeenCalledWith(firstScreenShare.id, expect.any(HTMLVideoElement));
    expect(screen.queryByLabelText('Tela compartilhada por Bia')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Parar de assistir a tela de Ana' }));

    expect(onStopWatching).toHaveBeenCalledTimes(1);
    rerender(
      <ScreenSharePresentation
        screenShares={[firstScreenShare, secondScreenShare]}
        {...defaultProps}
        onWatch={onWatch}
        onStopWatching={onStopWatching}
        onAttachVideo={onAttachVideo}
        onDetachVideo={onDetachVideo}
      />,
    );
    expect(onDetachVideo).toHaveBeenCalledWith(firstScreenShare.id, expect.any(HTMLVideoElement));
    expect(screen.getByRole('button', { name: 'Assistir tela de Ana' })).toBeInTheDocument();
  });

  it('keeps the selected volume in sync with the focused control', () => {
    const onVolumeChange = vi.fn();
    const { rerender } = render(
      <ScreenSharePresentation
        screenShares={[readyFirstScreenShare]}
        {...defaultProps}
        onVolumeChange={onVolumeChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Volume de Ana: 100%' }));
    fireEvent.change(screen.getByLabelText('Volume de Ana'), { target: { value: '25' } });
    expect(onVolumeChange).toHaveBeenCalledWith(firstScreenShare.id, 0.25);

    rerender(
      <ScreenSharePresentation
        screenShares={[{ ...readyFirstScreenShare, volume: 0.25 }]}
        {...defaultProps}
        onVolumeChange={onVolumeChange}
      />,
    );
    expect(screen.getByLabelText('Volume de Ana')).toHaveValue('25');
  });

  it('hides focused controls after inactivity and restores them with pointer activity', () => {
    vi.useFakeTimers();
    render(<ScreenSharePresentation screenShares={[readyFirstScreenShare]} {...defaultProps} />);
    act(() => vi.advanceTimersByTime(2800));

    const controls = screen.getByRole('button', { name: 'Parar de assistir a tela de Ana' })
      .parentElement?.parentElement;
    expect(controls).toHaveClass('pointer-events-none');

    fireEvent.pointerMove(screen.getByTestId('screen-share-focus-stage'));
    expect(controls).toHaveClass('opacity-100');
  });

  it('uses an icon control to request browser fullscreen', () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    });

    render(<ScreenSharePresentation screenShares={[readyFirstScreenShare]} {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Entrar em tela cheia' }));

    expect(requestFullscreen).toHaveBeenCalledTimes(1);
  });
});
