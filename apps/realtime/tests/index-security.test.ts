import { afterEach, describe, expect, it, vi } from 'vitest';

import worker, { RoomCoordinator, type Env } from '../src/index';
import type { ProviderTrackClosure, StoredRealtimeRoom } from '../src/room-state';
import { hashSecret, participantOperations } from '../src/security';

type MemoryStorage = Readonly<{
  values: Map<string, unknown>;
  state: DurableObjectState;
}>;

function createMemoryStorage(
  room?: StoredRealtimeRoom,
  pendingClosures: readonly ProviderTrackClosure[] = [],
  options: Readonly<{ failRoomPuts?: number }> = {},
): MemoryStorage {
  const values = new Map<string, unknown>();
  if (room) values.set('room', room);
  if (pendingClosures.length > 0) values.set('pending-provider-closures', pendingClosures);
  let remainingRoomPutFailures = options.failRoomPuts ?? 0;
  const storage = {
    get: async <T>(key: string): Promise<T | undefined> => values.get(key) as T | undefined,
    put: async (key: string, value: unknown): Promise<void> => {
      if (key === 'room' && remainingRoomPutFailures > 0) {
        remainingRoomPutFailures -= 1;
        throw new Error('Injected room persistence failure.');
      }
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
        sessionSlotId: 'slot-one',
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
              sessionSlotId: 'slot-two',
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

function authorizedRoomRequest(action: string, capability: string, body: unknown = {}): Request {
  const request = roomRequest(action, 'POST', body);
  request.headers.set('Authorization', `Bearer ${capability}`);
  return request;
}

function createLogicalLeaseSpendGuard(): {
  fetch: (request: Request) => Promise<Response>;
  paths: string[];
} {
  let leaseActive = false;
  const paths: string[] = [];
  return {
    paths,
    fetch: async (request) => {
      const path = new URL(request.url).pathname;
      paths.push(path);
      if (path === '/leases/acquire') {
        if (leaseActive) return Response.json({ allowed: false, reason: 'already-active' });
        leaseActive = true;
        return Response.json({ allowed: true, leaseId: 'lease-one', expiresAt: Date.now() + 40_000 });
      }
      if (path === '/leases/release') leaseActive = false;
      return Response.json({ marked: true, released: true });
    },
  };
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

describe('RoomCoordinator pull accounting invariant', () => {
  it('allows repeated concurrent subscribe requests to create only one provider pull', async () => {
    const capability = 'a'.repeat(43);
    const memory = createMemoryStorage(await createStoredRoom(capability, true));
    const spend = createLogicalLeaseSpendGuard();
    const gatewayFetch = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        sessionDescription: { type: 'offer', sdp: 'provider-offer' },
        tracks: [{ location: 'remote', mid: 'remote-mid' }],
      }),
    );
    vi.stubGlobal('fetch', gatewayFetch);
    const coordinator = new RoomCoordinator(memory.state, createEnv(spend.fetch));

    const responses = await Promise.all([
      coordinator.fetch(
        authorizedRoomRequest('subscribe', capability, { screenShareId: 'share-two' }),
      ),
      coordinator.fetch(
        authorizedRoomRequest('subscribe', capability, { screenShareId: 'share-two' }),
      ),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(
      gatewayFetch.mock.calls.filter(([input]) => String(input).includes('/tracks/new')),
    ).toHaveLength(1);
    const persisted = memory.values.get('room') as StoredRealtimeRoom;
    expect(persisted.participants[0]?.subscriptions['share-two']).toMatchObject({
      mid: 'remote-mid',
      leaseId: 'lease-one',
    });
  });

  it('closes a provider pull before releasing its lease after a later persistence failure', async () => {
    const capability = 'a'.repeat(43);
    const memory = createMemoryStorage(await createStoredRoom(capability, true), [], {
      failRoomPuts: 1,
    });
    const spend = createLogicalLeaseSpendGuard();
    const gatewayFetch = vi.fn<typeof fetch>(async (input) =>
      String(input).includes('/tracks/new')
        ? Response.json({
            sessionDescription: { type: 'offer', sdp: 'provider-offer' },
            tracks: [{ location: 'remote', mid: 'remote-mid' }],
          })
        : Response.json({ tracks: [] }),
    );
    vi.stubGlobal('fetch', gatewayFetch);
    const coordinator = new RoomCoordinator(memory.state, createEnv(spend.fetch));

    const response = await coordinator.fetch(
      authorizedRoomRequest('subscribe', capability, { screenShareId: 'share-two' }),
    );

    expect(response.status).toBe(502);
    expect(gatewayFetch.mock.calls.map(([input]) => String(input))).toEqual([
      expect.stringContaining('/tracks/new'),
      expect.stringContaining('/tracks/close'),
    ]);
    expect(spend.paths).toEqual(
      expect.arrayContaining(['/leases/acquire', '/leases/closing', '/leases/release']),
    );
    expect(memory.values.has('pending-provider-closures')).toBe(false);
  });

  it('retains durable closure and accounting responsibility when provider close fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const capability = 'a'.repeat(43);
    const memory = createMemoryStorage(await createStoredRoom(capability, true), [], {
      failRoomPuts: 1,
    });
    const spend = createLogicalLeaseSpendGuard();
    let closeSucceeds = false;
    const gatewayFetch = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.includes('/tracks/new')) {
        return Response.json({
          sessionDescription: { type: 'offer', sdp: 'provider-offer' },
          tracks: [{ location: 'remote', mid: 'remote-mid' }],
        });
      }
      return closeSucceeds
        ? Response.json({ tracks: [] })
        : Response.json({ errorCode: 'provider-close-failed' }, { status: 503 });
    });
    vi.stubGlobal('fetch', gatewayFetch);
    const coordinator = new RoomCoordinator(memory.state, createEnv(spend.fetch));

    const response = await coordinator.fetch(
      authorizedRoomRequest('subscribe', capability, { screenShareId: 'share-two' }),
    );

    expect(response.status).toBe(502);
    expect(spend.paths).not.toContain('/leases/release');
    expect(memory.values.get('pending-provider-closures')).toEqual([
      expect.objectContaining({ mid: 'remote-mid', leaseId: 'lease-one', failureCount: 1 }),
    ]);

    closeSucceeds = true;
    await coordinator.alarm();

    expect(spend.paths).toContain('/leases/release');
    expect(memory.values.has('pending-provider-closures')).toBe(false);
  });
});

describe('Cloudflare session slot lifecycle', () => {
  it('releases the global slot when createSession fails', async () => {
    const memory = createMemoryStorage();
    const paths: string[] = [];
    const env = {
      ...createEnv(async (request) => {
        const path = new URL(request.url).pathname;
        paths.push(path);
        if (path === '/status') {
          return Response.json({ cloudflareExcludedForNewRooms: false });
        }
        if (path === '/sessions/acquire') {
          return Response.json({ allowed: true, sessionSlotId: 'slot-one', expiresAt: Date.now() });
        }
        return Response.json({ released: true });
      }),
      ALLOW_CLIENT_PROVIDER_OVERRIDE: 'true',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({ errorCode: 'session-failed' }, { status: 503 }),
      ),
    );
    const coordinator = new RoomCoordinator(memory.state, env);

    const response = await coordinator.fetch(
      roomRequest('join', 'POST', { participantName: 'Viewer', providerMode: 'cloudflare' }),
    );

    expect(response.status).toBe(502);
    expect(paths).toEqual(['/status', '/sessions/acquire', '/sessions/release']);
  });

  it('releases the global slot on leave and stale cleanup', async () => {
    const capability = 'a'.repeat(43);
    const room = await createStoredRoom(capability);
    const leavePaths: string[] = [];
    const leaveCoordinator = new RoomCoordinator(
      createMemoryStorage(room).state,
      createEnv(async (request) => {
        leavePaths.push(new URL(request.url).pathname);
        return Response.json({ released: true });
      }),
    );

    expect(
      (
        await leaveCoordinator.fetch(authorizedRoomRequest('leave', capability))
      ).status,
    ).toBe(200);
    expect(leavePaths).toContain('/sessions/release');

    const staleRoom: StoredRealtimeRoom = {
      ...room,
      participants: room.participants.map((participant) => ({
        ...participant,
        lastSeenAt: Date.now() - 60_000,
      })),
    };
    const stalePaths: string[] = [];
    const staleCoordinator = new RoomCoordinator(
      createMemoryStorage(staleRoom).state,
      createEnv(async (request) => {
        stalePaths.push(new URL(request.url).pathname);
        return Response.json({ released: true });
      }),
    );

    await staleCoordinator.alarm();
    expect(stalePaths).toContain('/sessions/release');
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
