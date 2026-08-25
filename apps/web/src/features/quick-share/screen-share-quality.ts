import type { ScreenShareQuality } from '@/features/voice/media-session';

const screenShareQualityStorageKey = 'xama.quick-share.quality';

export function loadScreenShareQuality(storage: Pick<Storage, 'getItem'>): ScreenShareQuality {
  return storage.getItem(screenShareQualityStorageKey) === 'balanced' ? 'balanced' : 'high';
}

export function saveScreenShareQuality(
  storage: Pick<Storage, 'setItem'>,
  quality: ScreenShareQuality,
): void {
  storage.setItem(screenShareQualityStorageKey, quality);
}
