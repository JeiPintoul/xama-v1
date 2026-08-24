import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ScreenShareCollection } from '@/features/voice/ScreenShareCollection';
import type { ScreenShare } from '@/features/voice/livekit-voice-session';

const mediaStream = new MediaStream();

const firstScreenShare: ScreenShare = {
  id: 'guest-a:track-a',
  participantIdentity: 'guest-a',
  participantName: 'Ana',
  isLocal: true,
  hasAudio: false,
  audioTrackId: null,
  volume: 1,
  mediaStream,
};

const secondScreenShare: ScreenShare = {
  id: 'guest-b:track-b',
  participantIdentity: 'guest-b',
  participantName: 'Bia',
  isLocal: false,
  hasAudio: false,
  audioTrackId: null,
  volume: 1,
  mediaStream,
};

describe('screen share collection', () => {
  it('renders every active share and removes tiles no longer present', () => {
    const { rerender } = render(
      <ScreenShareCollection screenShares={[firstScreenShare, secondScreenShare]} />,
    );

    expect(screen.getByText('2 ativas')).toBeInTheDocument();
    expect(screen.getByLabelText('Tela compartilhada por Ana')).toBeInTheDocument();
    expect(screen.getByLabelText('Tela compartilhada por Bia')).toBeInTheDocument();

    rerender(<ScreenShareCollection screenShares={[secondScreenShare]} />);

    expect(screen.queryByLabelText('Tela compartilhada por Ana')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Tela compartilhada por Bia')).toBeInTheDocument();
  });
});
