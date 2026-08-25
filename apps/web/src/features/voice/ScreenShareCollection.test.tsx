import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ScreenShareCollection } from '@/features/voice/ScreenShareCollection';
import type { ScreenShare } from '@/features/voice/media-session';

const firstScreenShare: ScreenShare = {
  id: 'guest-a:track-a',
  participantIdentity: 'guest-a',
  participantName: 'Ana',
  isLocal: true,
  hasAudio: false,
  audioState: 'none',
  audioTrackId: null,
  watchState: 'available',
  volume: 1,
  viewers: [],
};

const secondScreenShare: ScreenShare = {
  id: 'guest-b:track-b',
  participantIdentity: 'guest-b',
  participantName: 'Bia',
  isLocal: false,
  hasAudio: false,
  audioState: 'none',
  audioTrackId: null,
  watchState: 'available',
  volume: 1,
  viewers: [],
};

describe('screen share collection', () => {
  it('renders every active share and removes tiles no longer present', () => {
    const onWatch = vi.fn();
    const { rerender } = render(
      <ScreenShareCollection
        screenShares={[firstScreenShare, secondScreenShare]}
        onWatch={onWatch}
      />,
    );

    expect(screen.getByText('2 ativas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assistir tela de Ana' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assistir tela de Bia' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Tela compartilhada por Ana')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Assistir tela de Bia' }));
    expect(onWatch).toHaveBeenCalledWith(secondScreenShare.id);

    rerender(
      <ScreenShareCollection
        screenShares={[
          {
            ...secondScreenShare,
            viewers: [{ identity: 'guest-c', name: 'Caio', isLocal: false }],
          },
        ]}
        onWatch={onWatch}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Assistir tela de Ana' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assistir tela de Bia' })).toBeInTheDocument();
    expect(screen.getByText('Caio assistindo')).toBeInTheDocument();
  });
});
