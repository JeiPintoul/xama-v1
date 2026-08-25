import { describe, expect, it, vi } from 'vitest';

import {
  applyRemoteScreenShareVolume,
  getViewerPresenceScreenShareIds,
  setScreenSharePublicationSubscribed,
} from '@/features/voice/livekit-voice-session';

describe('LiveKit screen share subscription intent', () => {
  it('subscribes and unsubscribes video and audio publications without duplicate requests', () => {
    const videoSetSubscribed = vi.fn();
    const audioSetSubscribed = vi.fn();
    const videoPublication = { isDesired: false, setSubscribed: videoSetSubscribed };
    const audioPublication = { isDesired: false, setSubscribed: audioSetSubscribed };

    setScreenSharePublicationSubscribed(videoPublication, true);
    setScreenSharePublicationSubscribed(audioPublication, true);

    expect(videoSetSubscribed).toHaveBeenCalledWith(true);
    expect(audioSetSubscribed).toHaveBeenCalledWith(true);

    setScreenSharePublicationSubscribed({ ...videoPublication, isDesired: true }, true);
    expect(videoSetSubscribed).toHaveBeenCalledTimes(1);

    setScreenSharePublicationSubscribed({ ...videoPublication, isDesired: true }, false);
    setScreenSharePublicationSubscribed({ ...audioPublication, isDesired: true }, false);

    expect(videoSetSubscribed).toHaveBeenLastCalledWith(false);
    expect(audioSetSubscribed).toHaveBeenLastCalledWith(false);
  });

  it('unsubscribes one watched share without changing another share subscription', () => {
    const firstSetSubscribed = vi.fn();
    const secondSetSubscribed = vi.fn();

    setScreenSharePublicationSubscribed(
      { isDesired: false, setSubscribed: firstSetSubscribed },
      true,
    );
    setScreenSharePublicationSubscribed(
      { isDesired: false, setSubscribed: secondSetSubscribed },
      true,
    );
    setScreenSharePublicationSubscribed(
      { isDesired: true, setSubscribed: firstSetSubscribed },
      false,
    );

    expect(firstSetSubscribed).toHaveBeenLastCalledWith(false);
    expect(secondSetSubscribed).toHaveBeenCalledTimes(1);
    expect(secondSetSubscribed).toHaveBeenLastCalledWith(true);
  });
});

describe('screen share viewer presence messages', () => {
  it('reads current multi-watch and legacy single-watch selections', () => {
    expect(
      getViewerPresenceScreenShareIds({
        type: 'selection',
        screenShareIds: ['share-a', 'share-b'],
      }),
    ).toEqual(['share-a', 'share-b']);
    expect(
      getViewerPresenceScreenShareIds({ type: 'selection', screenShareId: 'share-a' }),
    ).toEqual(['share-a']);
    expect(getViewerPresenceScreenShareIds({ type: 'selection', screenShareId: null })).toEqual([]);
  });
});

describe('remote screen share volume', () => {
  it.each([0, 0.8])('reapplies a stored volume of %s after audio resubscription', (volume) => {
    const setVolume = vi.fn();

    applyRemoteScreenShareVolume({ setVolume }, volume);

    expect(setVolume).toHaveBeenCalledWith(volume, expect.anything());
  });
});
