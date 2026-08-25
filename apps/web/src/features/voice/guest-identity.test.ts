import { beforeEach, describe, expect, it } from 'vitest';

import {
  getOrCreateGuestIdentity,
  guestIdentityStorageKey,
  loadGuestIdentity,
} from '@/features/voice/guest-identity';

describe('guest identity', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('creates a stable identity and updates the locally stored display name', () => {
    const firstIdentity = getOrCreateGuestIdentity(window.localStorage, ' Ana ', () => 'guest-id');
    const secondIdentity = getOrCreateGuestIdentity(window.localStorage, 'Bia', () => 'other-id');

    expect(firstIdentity).toEqual({ id: 'guest-id', displayName: 'Ana' });
    expect(secondIdentity).toEqual({ id: 'guest-id', displayName: 'Bia' });
    expect(loadGuestIdentity(window.localStorage)).toEqual(secondIdentity);
  });

  it('ignores malformed stored values', () => {
    window.localStorage.setItem(guestIdentityStorageKey, '{not-json');

    expect(loadGuestIdentity(window.localStorage)).toBeNull();
  });
});
