import { afterEach, describe, expect, it, vi } from 'vitest';

import worker, { RoomCoordinator, type Env } from '../src/index';
import type { ProviderTrackClosure, StoredRealtimeRoom } from '../src/room-state';
import { hashSecret, participantOperations } from '../src/security';

type MemoryStorage = Readonly<{
  values: Map<string, unknown>;
  state: DurableObjectState;
}>;

function createMemoryStorage(
  room: StoredRealtimeRoom,
  pendingClosures: readonly ProviderTrackClosure[] = [],
): MemoryStorage {
  const values = new Map<string, unknown>([
    ['room', room],
    ['pending-provider-closures', pendingClosures],
  ]);
  const storage = {
    get: async <T>(key: string): Promise<T | undefined> => values.get(key) as T | undefined,
    put: async (key: string, value: unknown): Promise<void> => {
      values.set(key, value);
    },
    delete: async (key: string): Promise<boolean> => values.delete(key),
    deleteAll: async (): Promise<void> => {
      values.clear();
    },
    setAlarm: async (): Promise<void> => undefined,
  };
  const state = {
    storage,
    blockConcurrencyWhile: async <T>(callback: () => Promise<T>): Promise<T> => callback(),
  } as unknown as DurableObjectState;
  return { values, state };
}

function createNamespace(
  stubFetch: (request: Request) => Promise<Response>,
): DurableObjectNamespace {
  return {
    idFromName: () => ({}) as DurableObjectId,
    get: () =>
      ({
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          stubFetch(input instanceof Request ? input : new Request(input, init)),
      }) as unknown as DurableObjectStub,
  } as unknown as DurableObjectNamespace;
}

function createEnv(spendFetch: (request: Request) => Promise<Response>): Env {
  return {
    ROOMS: createNamespace(async () => Response.json({ error: 'unused' }, { status: 500 })),
    SPEND_GUARD: createNamespace(spendFetch),
    CLOUDFLARE_REALTIME_APP_ID: 'development-app',
    CLOUDFLARE_REALTIME_APP_SECRET: 'development-secret',
    CLOUDFLARE_ENABLED: 'true',
    ENVIRONMENT: 'development',
  };
}

async function createStoredRoom(
  rawCapability = 'a'.repeat(43),
  includeSecondParticipant = false,
): Promise<StoredRealtimeRoom> {
  const now = Date.now();
  return {
    roomId: 'room-one',
    provider: 'cloudflare',
    participants: [
      {
        id: 'participant-one',
        name: 'One',
        realtimeSessionId: 'session-one',
        capabilityHash: await hashSecret(rawCapability),
        capabilityExpiresAt: now + 60_000,
        allowedOperations: participantOperations,
        lastSeenAt: now,
        subscriptions: {},
      },
      ...(includeSecondParticipant
        ? [
            {
              id: 'participant-two',
              name: 'Two',
              realtimeSessionId: 'session-two',
              capabilityHash: await hashSecret('b'.repeat(43)),
              capabilityExpiresAt: now + 60_000,
              allowedOperations: participantOperations,
              lastSeenAt: now,
              subscriptions: {},
            },
          ]
        : []),
    ],
    screenShares: includeSecondParticipant
      ? [
          {
            id: 'share-two',
            ownerParticipantId: 'participant-two',
            ownerName: 'Two',
            realtimeSessionId: 'session-two',
            providerTrackName: 'provider-track-two',
            publisherMid: '0',
          },
        ]
      : [],
  };
}

function roomRequest(action: string, method: 'GET' | 'POST' = 'POST', body: unknown = {}): Request {
  return new Request(`https://realtime.example/rooms/room-one/${action}`, {
    method,
    ...(method === 'GET'
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RoomCoordinator capability authorization', () => {
  it.each([
    ['state', 'GET'],
    ['heartbeat', 'POST'],
    ['publish', 'POST'],
    ['stop-publishing', 'POST'],
    ['subscribe', 'POST'],
    ['unsubscribe', 'POST'],
    ['renegotiate', 'POST'],
    ['leave', 'POST'],
  ] as const)('requires a capability for %s', async (action, method) => {
    const gatewayFetch = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', gatewayFetch);
    const memory = createMemoryStorage(await createStoredRoom());
    const coordinator = new RoomCoordinator(
      memory.state,
      createEnv(async () => Response.json({ revokedLeaseIds: [] })),
    );

    const response = await coordinator.fetch(roomRequest(action, method));

    expect(response.status).toBe(401);
    expect(gatewayFetch).not.toHaveBeenCalled();
  });

  it('does not let a spoofed participantId control another participant publication', async () => {
    const gatewayFetch = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', gatewayFetch);
    const capability = 'a'.repeat(43);
    const memory = createMemoryStorage(await createStoredRoom(capability, true));
    const coordinator = new RoomCoordinator(
      memory.state,
      createEnv(async () => Response.json({ revokedLeaseIds: [] })),
    );
    const request = roomRequest('stop-publishing', 'POST', {
      participantId: 'participant-two',
      screenShareId: 'share-two',
    });
    request.headers.set('Authorization', `Bearer ${capability}`);

    const response = await coordinator.fetch(request);

    expect(response.status).toBe(404);
    expect(gatewayFetch).not.toHaveBeenCalled();
  });

  it('closes a provider pull when its SpendGuard lease is revoked', async () => {
    const gatewayFetch = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ tracks: [] }));
    vi.stubGlobal('fetch', gatewayFetch);
    const room = await createStoredRoom('a'.repeat(43), true);
    const participants = room.participants.map((participant) =>
      participant.id === 'participant-one'
        ? {
            ...participant,
            subscriptions: {
              'share-two': { mid: '1', leaseId: 'lease-one' },
            },
          }
        : participant,
    );
    const memory = createMemoryStorage({ ...room, participants });
    const spendFetch = vi.fn(async (request: Request) => {
      const path = new URL(request.url).pathname;
      if (path === '/leases/enforce') {
        return Response.json({ activeLeaseIds: [], revokedLeaseIds: ['lease-one'] });
      }
      return Response.json({ released: true });
    });
    const coordinator = new RoomCoordinator(memory.state, createEnv(spendFetch));

    await coordinator.alarm();

    expect(gatewayFetch).toHaveBeenCalledWith(
      expect.stringContaining('/sessions/session-one/tracks/close'),
      expect.objectContaining({ method: 'PUT' }),
    );
    const persisted = memory.values.get('room') as StoredRealtimeRoom;
    expect(persisted.participants[0]?.subscriptions).toEqual({});
    expect(spendFetch).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://spend-guard.internal/leases/release' }),
    );
  });
});

describe('SpendGuard admin authentication', () => {
  it('rejects the kill switch without the separate admin secret', async () => {
    const spendFetch = vi.fn(async () => Response.json({ emergencyStop: false }));
    const env = {
      ...createEnv(spendFetch),
      REALTIME_ADMIN_SECRET: 'expected-admin-secret-that-is-long-enough',
    };

    const response = await worker.fetch(
      new Request('https://realtime.example/admin/spend-guard/emergency-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      }),
      env,
    );

    expect(response.status).toBe(401);
    expect(spendFetch).not.toHaveBeenCalled();
  });

  it('allows the emergency kill switch with the correct admin secret', async () => {
    const secret = 'expected-admin-secret-that-is-long-enough';
    const spendFetch = vi.fn(async () => Response.json({ emergencyStop: false }));
    const env = { ...createEnv(spendFetch), REALTIME_ADMIN_SECRET: secret };
    const request = new Request('https://realtime.example/admin/spend-guard/emergency-stop', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(200);
    expect(spendFetch).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://spend-guard.internal/admin/emergency-stop' }),
    );
  });
});

describe('control-plane rate limiting', () => {
  it('rejects abuse before room admission without acting as SpendGuard accounting', async () => {
    const spendFetch = vi.fn(async () => Response.json({ estimatedEgressBytes: 0 }));
    const roomFetch = vi.fn(async () => Response.json({ error: 'unexpected' }, { status: 500 }));
    const env: Env = {
      ...createEnv(spendFetch),
      ROOMS: createNamespace(roomFetch),
      JOIN_RATE_LIMITER: { limit: async () => ({ success: false }) },
    };

    const response = await worker.fetch(
      new Request('https://realtime.example/rooms/room-one/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName: 'Viewer' }),
      }),
      env,
    );

    expect(response.status).toBe(429);
    expect(roomFetch).not.toHaveBeenCalled();
    expect(spendFetch).not.toHaveBeenCalled();
  });

  it('fails closed when a production-like deployment has no exact allowed origins', async () => {
    const spendFetch = vi.fn(async () => Response.json({ estimatedEgressBytes: 0 }));
    const roomFetch = vi.fn(async () => Response.json({ error: 'unexpected' }, { status: 500 }));
    const env: Env = {
      ...createEnv(spendFetch),
      ENVIRONMENT: 'production',
      ALLOWED_ORIGINS: undefined,
      ROOMS: createNamespace(roomFetch),
    };

    const response = await worker.fetch(
      new Request('https://realtime.example/rooms/room-one/join', {
        method: 'POST',
        headers: { Origin: 'https://xama.example', 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName: 'Viewer' }),
      }),
      env,
    );

    expect(response.status).toBe(503);
    expect(roomFetch).not.toHaveBeenCalled();
    expect(spendFetch).not.toHaveBeenCalled();
  });
});
