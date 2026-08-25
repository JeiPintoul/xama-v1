export type GuestIdentity = Readonly<{
  id: string;
  displayName: string;
}>;

export const guestIdentityStorageKey = 'xama.alpha.guest-identity';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function isGuestIdentity(value: unknown): value is GuestIdentity {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.displayName === 'string' &&
    candidate.displayName.trim().length > 0
  );
}

export function loadGuestIdentity(storage: StorageLike): GuestIdentity | null {
  try {
    const storedValue = storage.getItem(guestIdentityStorageKey);
    if (!storedValue) {
      return null;
    }

    const parsedValue: unknown = JSON.parse(storedValue);
    return isGuestIdentity(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

export function saveGuestIdentity(storage: StorageLike, identity: GuestIdentity): void {
  storage.setItem(guestIdentityStorageKey, JSON.stringify(identity));
}

export function getOrCreateGuestIdentity(
  storage: StorageLike,
  displayName: string,
  createId: () => string,
): GuestIdentity {
  const normalizedDisplayName = displayName.trim();
  const existingIdentity = loadGuestIdentity(storage);
  const identity: GuestIdentity = {
    id: existingIdentity?.id ?? createId(),
    displayName: normalizedDisplayName,
  };

  saveGuestIdentity(storage, identity);
  return identity;
}
