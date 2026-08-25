import { describe, expect, it } from 'vitest';

import {
  addScreenShareWatchSelection,
  getScreenShareViewerIdentities,
  getScreenShareWatchSelections,
  removeScreenShareWatchSelection,
  replaceScreenShareWatchSelections,
  type ScreenShareWatchSelections,
} from '@/features/voice/screen-share-watch-selections';

describe('screen share watch selections', () => {
  it('watches multiple shares and stops one without affecting the other', () => {
    const selections: ScreenShareWatchSelections = new Map();

    addScreenShareWatchSelection(selections, 'viewer-c', 'share-a');
    addScreenShareWatchSelection(selections, 'viewer-c', 'share-b');
    removeScreenShareWatchSelection(selections, 'viewer-c', 'share-a');

    expect([...getScreenShareWatchSelections(selections, 'viewer-c')]).toEqual(['share-b']);

    removeScreenShareWatchSelection(selections, 'viewer-c', 'share-b');
    expect(getScreenShareWatchSelections(selections, 'viewer-c')).toEqual(new Set());
  });

  it('represents the same viewer on multiple watched shares and clears on disconnect', () => {
    const selections: ScreenShareWatchSelections = new Map();
    replaceScreenShareWatchSelections(selections, 'viewer-c', ['share-a', 'share-b']);

    expect(getScreenShareViewerIdentities(selections, 'share-a')).toEqual(['viewer-c']);
    expect(getScreenShareViewerIdentities(selections, 'share-b')).toEqual(['viewer-c']);

    selections.delete('viewer-c');
    expect(getScreenShareViewerIdentities(selections, 'share-a')).toEqual([]);
    expect(getScreenShareViewerIdentities(selections, 'share-b')).toEqual([]);
  });

  it('supports local preview and a remote share in the same watched set', () => {
    const selections: ScreenShareWatchSelections = new Map();
    addScreenShareWatchSelection(selections, 'viewer-c', 'viewer-c:local-share');
    addScreenShareWatchSelection(selections, 'viewer-c', 'publisher-a:remote-share');

    expect(getScreenShareWatchSelections(selections, 'viewer-c')).toEqual(
      new Set(['viewer-c:local-share', 'publisher-a:remote-share']),
    );
  });
});
