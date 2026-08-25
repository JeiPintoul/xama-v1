import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  volume: 0.73,
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
  volume: 0.35,
  viewers: [],
};

const readyFirstScreenShare: ScreenShare = {
  ...firstScreenShare,
  audioState: 'ready',
  watchState: 'ready',
};

const readySecondScreenShare: ScreenShare = {
  ...secondScreenShare,
  audioState: 'ready',
  watchState: 'ready',
};

const readyLocalScreenShare: ScreenShare = {
  id: 'viewer-c:local-track',
  participantIdentity: 'viewer-c',
  participantName: 'Caio',
  isLocal: true,
  hasAudio: false,
  audioState: 'none',
  audioTrackId: null,
  watchState: 'ready',
  volume: 1,
  viewers: [],
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
  it('adds a second watched share and stops only the requested player', async () => {
    const onWatch = vi.fn();
    const onStopWatching = vi.fn();
    const onAttachVideo = vi.fn();
    const onDetachVideo = vi.fn();
    const { rerender } = render(
      <ScreenSharePresentation
        screenShares={[firstScreenShare, secondScreenShare]}
        {...defaultProps}
        onWatch={onWatch}
        onStopWatching={onStopWatching}
        onAttachVideo={onAttachVideo}
        onDetachVideo={onDetachVideo}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Assistir tela de Ana' }));
    expect(onWatch).toHaveBeenCalledWith(firstScreenShare.id);

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
    fireEvent.click(screen.getByRole('button', { name: 'Assistir tela de Bia' }));
    expect(onWatch).toHaveBeenLastCalledWith(secondScreenShare.id);

    rerender(
      <ScreenSharePresentation
        screenShares={[readyFirstScreenShare, readySecondScreenShare]}
        {...defaultProps}
        onWatch={onWatch}
        onStopWatching={onStopWatching}
        onAttachVideo={onAttachVideo}
        onDetachVideo={onDetachVideo}
      />,
    );
    expect(screen.getByLabelText('Tela compartilhada por Ana')).toBeInTheDocument();
    expect(screen.getByLabelText('Tela compartilhada por Bia')).toBeInTheDocument();
    expect(onAttachVideo).toHaveBeenCalledWith(firstScreenShare.id, expect.any(HTMLVideoElement));
    expect(onAttachVideo).toHaveBeenCalledWith(secondScreenShare.id, expect.any(HTMLVideoElement));

    fireEvent.click(screen.getByRole('button', { name: 'Parar de assistir a tela de Ana' }));
    await waitFor(() => expect(onStopWatching).toHaveBeenCalledWith(firstScreenShare.id));

    rerender(
      <ScreenSharePresentation
        screenShares={[firstScreenShare, readySecondScreenShare]}
        {...defaultProps}
        onWatch={onWatch}
        onStopWatching={onStopWatching}
        onAttachVideo={onAttachVideo}
        onDetachVideo={onDetachVideo}
      />,
    );
    expect(onDetachVideo).toHaveBeenCalledWith(firstScreenShare.id, expect.any(HTMLVideoElement));
    expect(screen.getByLabelText('Tela compartilhada por Bia')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assistir tela de Ana' })).toBeInTheDocument();
  });

  it('renders local preview and a remote watched share simultaneously', () => {
    render(
      <ScreenSharePresentation
        screenShares={[readyLocalScreenShare, readyFirstScreenShare]}
        {...defaultProps}
      />,
    );

    expect(screen.getByLabelText('Tela compartilhada por Caio')).toBeInTheDocument();
    expect(screen.getByLabelText('Tela compartilhada por Ana')).toBeInTheDocument();
  });

  it('focuses one share without stopping another and stops only the focused share', async () => {
    const onFocusModeChange = vi.fn();
    const onStopWatching = vi.fn();
    render(
      <ScreenSharePresentation
        screenShares={[readyFirstScreenShare, readySecondScreenShare]}
        {...defaultProps}
        onFocusModeChange={onFocusModeChange}
        onStopWatching={onStopWatching}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Focar transmissão de Ana' }));
    expect(screen.getByRole('region', { name: 'Tela de Ana em foco' })).toHaveClass('fixed');
    expect(screen.getByLabelText('Tela compartilhada por Bia')).toBeInTheDocument();
    expect(onFocusModeChange).toHaveBeenLastCalledWith(true);
    expect(onStopWatching).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Voltar para visualização inline' }));
    expect(screen.getByRole('region', { name: 'Assistindo Ana' })).not.toHaveClass('fixed');
    expect(screen.getByLabelText('Tela compartilhada por Bia')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Focar transmissão de Ana' }));
    fireEvent.click(screen.getByRole('button', { name: 'Parar de assistir a tela de Ana' }));
    await waitFor(() => expect(onStopWatching).toHaveBeenCalledWith(firstScreenShare.id));
    expect(onStopWatching).not.toHaveBeenCalledWith(secondScreenShare.id);
    expect(screen.getByLabelText('Tela compartilhada por Bia')).toBeInTheDocument();
  });

  it('adjusts wheel volume and mute independently for the targeted share', () => {
    const onVolumeChange = vi.fn();
    const onToggleMute = vi.fn();
    render(
      <ScreenSharePresentation
        screenShares={[readyFirstScreenShare, readySecondScreenShare]}
        {...defaultProps}
        onVolumeChange={onVolumeChange}
        onToggleMute={onToggleMute}
      />,
    );
    const anaSpeaker = screen.getByRole('button', { name: 'Silenciar áudio de Ana' });
    const anaVolumeRegion = anaSpeaker.parentElement;
    expect(anaVolumeRegion).not.toBeNull();

    const wheelEvent = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: -100,
    });
    fireEvent(anaVolumeRegion!, wheelEvent);
    expect(wheelEvent.defaultPrevented).toBe(true);
    expect(onVolumeChange).toHaveBeenCalledWith(firstScreenShare.id, 0.78);
    expect(onVolumeChange).not.toHaveBeenCalledWith(secondScreenShare.id, expect.any(Number));

    fireEvent.mouseEnter(anaVolumeRegion!);
    fireEvent.change(screen.getByRole('slider', { name: 'Volume de Ana' }), {
      target: { value: '50' },
    });
    expect(onVolumeChange).toHaveBeenLastCalledWith(firstScreenShare.id, 0.5);

    fireEvent.click(anaSpeaker);
    expect(onToggleMute).toHaveBeenCalledWith(firstScreenShare.id);
    expect(onToggleMute).not.toHaveBeenCalledWith(secondScreenShare.id);
  });

  it('keeps the desktop volume slider reachable across its delayed hover boundary', () => {
    vi.useFakeTimers();
    render(<ScreenSharePresentation screenShares={[readyFirstScreenShare]} {...defaultProps} />);
    const volumeRegion = screen.getByRole('button', {
      name: 'Silenciar áudio de Ana',
    }).parentElement;
    expect(volumeRegion).not.toBeNull();

    fireEvent.mouseEnter(volumeRegion!);
    expect(screen.getByRole('slider', { name: 'Volume de Ana' })).toBeInTheDocument();
    fireEvent.mouseLeave(volumeRegion!);
    act(() => vi.advanceTimersByTime(150));
    expect(screen.getByRole('slider', { name: 'Volume de Ana' })).toBeInTheDocument();

    fireEvent.mouseEnter(volumeRegion!);
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByRole('slider', { name: 'Volume de Ana' })).toBeInTheDocument();
  });

  it('auto-hides inline controls independently and restores only the active player', () => {
    vi.useFakeTimers();
    render(
      <ScreenSharePresentation
        screenShares={[readyFirstScreenShare, readySecondScreenShare]}
        {...defaultProps}
      />,
    );
    act(() => vi.advanceTimersByTime(2800));

    const anaControls = screen.getByTestId(`screen-share-controls-${firstScreenShare.id}`);
    const biaControls = screen.getByTestId(`screen-share-controls-${secondScreenShare.id}`);
    expect(anaControls).toHaveClass('pointer-events-none');
    expect(biaControls).toHaveClass('pointer-events-none');

    fireEvent.pointerMove(screen.getByTestId(`screen-share-stage-${firstScreenShare.id}`));
    expect(anaControls).toHaveClass('opacity-100');
    expect(biaControls).toHaveClass('pointer-events-none');
  });

  it('keeps DEV inside the auto-hidden overlay and pins controls while diagnostics are open', () => {
    vi.useFakeTimers();
    render(<ScreenSharePresentation screenShares={[readyFirstScreenShare]} {...defaultProps} />);
    const controls = screen.getByTestId(`screen-share-controls-${firstScreenShare.id}`);
    const stage = screen.getByTestId(`screen-share-stage-${firstScreenShare.id}`);
    const devButton = within(controls).getByRole('button', { name: 'DEV' });

    act(() => vi.advanceTimersByTime(2800));
    expect(controls).toHaveClass('pointer-events-none');
    expect(controls).toContainElement(devButton);

    fireEvent.pointerMove(stage);
    fireEvent.click(devButton);
    act(() => vi.advanceTimersByTime(4000));
    expect(controls).toHaveClass('opacity-100');
    expect(
      screen.getByLabelText(`Diagnóstico de mídia de ${firstScreenShare.participantName}`),
    ).toBeInTheDocument();
  });

  it('requests fullscreen for one player and keeps that share in Focus', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    });

    render(
      <ScreenSharePresentation
        screenShares={[readyFirstScreenShare, readySecondScreenShare]}
        {...defaultProps}
      />,
    );
    const anaPlayer = screen.getByRole('region', { name: 'Assistindo Ana' });
    fireEvent.click(within(anaPlayer).getByRole('button', { name: 'Entrar em tela cheia' }));

    await waitFor(() => expect(requestFullscreen).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('region', { name: 'Tela de Ana em foco' })).toHaveClass('fixed');
    expect(screen.getByLabelText('Tela compartilhada por Bia')).toBeInTheDocument();
  });

  it('keeps Picture-in-Picture cleanup specific to its share', async () => {
    let pictureInPictureElement: Element | null = null;
    let anaVideo: HTMLVideoElement | null = null;
    const requestPictureInPicture = vi.fn(() => {
      pictureInPictureElement = anaVideo;
      return Promise.resolve();
    });
    const exitPictureInPicture = vi.fn(() => {
      pictureInPictureElement = null;
      return Promise.resolve();
    });
    Object.defineProperty(document, 'pictureInPictureEnabled', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(document, 'pictureInPictureElement', {
      configurable: true,
      get: () => pictureInPictureElement,
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
        screenShares={[readyFirstScreenShare, readySecondScreenShare]}
        {...defaultProps}
        onStopWatching={onStopWatching}
      />,
    );

    const anaPlayer = screen.getByRole('region', { name: 'Assistindo Ana' });
    anaVideo = screen.getByLabelText('Tela compartilhada por Ana');
    fireEvent.click(within(anaPlayer).getByRole('button', { name: 'Abrir Picture-in-Picture' }));
    await waitFor(() => expect(requestPictureInPicture).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Parar de assistir a tela de Bia' }));
    await waitFor(() => expect(onStopWatching).toHaveBeenCalledWith(secondScreenShare.id));
    expect(exitPictureInPicture).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Parar de assistir a tela de Ana' }));
    await waitFor(() => expect(exitPictureInPicture).toHaveBeenCalledTimes(1));
    expect(onStopWatching).toHaveBeenCalledWith(firstScreenShare.id);
  });
});
