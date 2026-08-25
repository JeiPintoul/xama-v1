import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  onToggleMute: vi.fn(),
  onAttachVideo: vi.fn(),
  onDetachVideo: vi.fn(),
  onAttachAudio: vi.fn(),
  onDetachAudio: vi.fn(),
  getDiagnostics: vi.fn().mockResolvedValue(null),
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, 'pictureInPictureEnabled');
  Reflect.deleteProperty(document, 'pictureInPictureElement');
  Reflect.deleteProperty(document, 'exitPictureInPicture');
  Reflect.deleteProperty(HTMLVideoElement.prototype, 'requestPictureInPicture');
});

describe('screen share presentation', () => {
  it('subscribes from the compact list and opens an inline viewer', async () => {
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
    expect(screen.getByRole('status')).toHaveTextContent('Assinando transmissão…');

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
    expect(screen.getByTestId('screen-share-stage').parentElement).not.toHaveClass('fixed');
    expect(screen.getByRole('button', { name: 'Assistir tela de Bia' })).toBeInTheDocument();
    expect(onAttachVideo).toHaveBeenCalledWith(firstScreenShare.id, expect.any(HTMLVideoElement));

    fireEvent.click(screen.getByRole('button', { name: 'Parar de assistir a tela de Ana' }));
    await waitFor(() => expect(onStopWatching).toHaveBeenCalledTimes(1));

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
  });

  it('enters and leaves Focus explicitly without stopping the watched share', () => {
    const onFocusModeChange = vi.fn();
    const onStopWatching = vi.fn();
    render(
      <ScreenSharePresentation
        screenShares={[readyFirstScreenShare]}
        {...defaultProps}
        onFocusModeChange={onFocusModeChange}
        onStopWatching={onStopWatching}
      />,
    );

    expect(screen.getByTestId('screen-share-stage').parentElement).not.toHaveClass('fixed');
    fireEvent.click(screen.getByRole('button', { name: 'Entrar no modo Foco' }));

    expect(screen.getByTestId('screen-share-stage').parentElement).toHaveClass('fixed');
    expect(onFocusModeChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: 'Voltar para visualização inline' }));
    expect(screen.getByTestId('screen-share-stage').parentElement).not.toHaveClass('fixed');
    expect(onStopWatching).not.toHaveBeenCalled();
    expect(onFocusModeChange).toHaveBeenLastCalledWith(false);
  });

  it('keeps volume, mute, and adjustment as separate actions', () => {
    const onVolumeChange = vi.fn();
    const onToggleMute = vi.fn();
    const { rerender } = render(
      <ScreenSharePresentation
        screenShares={[readyFirstScreenShare]}
        {...defaultProps}
        onVolumeChange={onVolumeChange}
        onToggleMute={onToggleMute}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ajustar volume de Ana: 100%' }));
    fireEvent.change(screen.getByLabelText(/Volume/), { target: { value: '25' } });
    expect(onVolumeChange).toHaveBeenCalledWith(firstScreenShare.id, 0.25);

    fireEvent.click(screen.getByRole('button', { name: 'Silenciar áudio de Ana' }));
    expect(onToggleMute).toHaveBeenCalledWith(firstScreenShare.id);

    rerender(
      <ScreenSharePresentation
        screenShares={[{ ...readyFirstScreenShare, volume: 0 }]}
        {...defaultProps}
        onVolumeChange={onVolumeChange}
        onToggleMute={onToggleMute}
      />,
    );
    expect(screen.getByRole('button', { name: 'Ativar áudio de Ana' })).toBeInTheDocument();
  });

  it('keeps the volume slider reachable while crossing from its controls', () => {
    vi.useFakeTimers();
    render(<ScreenSharePresentation screenShares={[readyFirstScreenShare]} {...defaultProps} />);
    const volumeRegion = screen.getByRole('button', {
      name: 'Ajustar volume de Ana: 100%',
    }).parentElement;
    expect(volumeRegion).not.toBeNull();

    fireEvent.mouseEnter(volumeRegion!);
    expect(screen.getByRole('slider')).toBeInTheDocument();
    fireEvent.mouseLeave(volumeRegion!);
    act(() => vi.advanceTimersByTime(150));
    expect(screen.getByRole('slider')).toBeInTheDocument();

    fireEvent.mouseEnter(volumeRegion!);
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByRole('slider')).toBeInTheDocument();
    fireEvent.mouseLeave(volumeRegion!);
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('hides controls after Focus inactivity and restores them with pointer activity', () => {
    vi.useFakeTimers();
    render(<ScreenSharePresentation screenShares={[readyFirstScreenShare]} {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Entrar no modo Foco' }));
    act(() => vi.advanceTimersByTime(2800));

    const controls = screen.getByRole('button', { name: 'Parar de assistir a tela de Ana' })
      .parentElement?.parentElement;
    expect(controls).toHaveClass('pointer-events-none');

    fireEvent.pointerMove(screen.getByTestId('screen-share-stage'));
    expect(controls).toHaveClass('opacity-100');
  });

  it('uses an icon control to request browser fullscreen and keeps Focus state', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    });

    render(<ScreenSharePresentation screenShares={[readyFirstScreenShare]} {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Entrar em tela cheia' }));

    await waitFor(() => expect(requestFullscreen).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('screen-share-stage').parentElement).toHaveClass('fixed');
  });

  it('requests and exits native Picture-in-Picture without stopping early', async () => {
    const requestPictureInPicture = vi.fn().mockResolvedValue(undefined);
    const exitPictureInPicture = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, 'pictureInPictureEnabled', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'requestPictureInPicture', {
      configurable: true,
      value: requestPictureInPicture,
    });
    Object.defineProperty(document, 'exitPictureInPicture', {
      configurable: true,
      value: exitPictureInPicture,
    });
    const onStopWatching = vi.fn();
    render(
      <ScreenSharePresentation
        screenShares={[readyFirstScreenShare]}
        {...defaultProps}
        onStopWatching={onStopWatching}
      />,
    );

    const video = screen.getByLabelText('Tela compartilhada por Ana');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Picture-in-Picture' }));
    await waitFor(() => expect(requestPictureInPicture).toHaveBeenCalledTimes(1));
    expect(onStopWatching).not.toHaveBeenCalled();

    Object.defineProperty(document, 'pictureInPictureElement', {
      configurable: true,
      value: video,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Parar de assistir a tela de Ana' }));

    await waitFor(() => expect(exitPictureInPicture).toHaveBeenCalledTimes(1));
    expect(onStopWatching).toHaveBeenCalledTimes(1);
  });
});
