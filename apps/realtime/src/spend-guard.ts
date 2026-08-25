import type { RealtimeEnv } from './runtime-config';
import {
  getSpendGuardConfiguration,
  SpendGuardLedger,
  type PullLeaseDecision,
  type PullLeaseRequest,
  type SpendGuardCycle,
  type SpendGuardStatus,
  type StoredSpendGuardState,
} from './spend-guard-state';

const storageKey = 'spend-guard';

export class SpendGuardRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function json(payload: unknown, status = 200): Response {
  return Response.json(payload, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export class SpendGuard {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: RealtimeEnv,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    const payload = request.method === 'POST' ? await readJson(request) : null;
    const now = Date.now();

    if (request.method === 'GET' && path === '/status') {
      return json(await this.mutate((ledger) => ledger.getStatus(now)));
    }
    if (request.method !== 'POST' || !isRecord(payload))
      return json({ error: 'Invalid request.' }, 400);

    if (path === '/session-admission') {
      return json(await this.mutate((ledger) => ledger.admitSession(now)));
    }
    if (
      path === '/leases/acquire' &&
      typeof payload.roomId === 'string' &&
      typeof payload.participantId === 'string' &&
      typeof payload.screenShareId === 'string'
    ) {
      const leaseRequest: PullLeaseRequest = {
        roomId: payload.roomId,
        participantId: payload.participantId,
        screenShareId: payload.screenShareId,
      };
      return json(
        await this.mutate((ledger) => ledger.acquireLease(leaseRequest, crypto.randomUUID(), now)),
      );
    }
    if (
      path === '/leases/renew' &&
      typeof payload.roomId === 'string' &&
      typeof payload.participantId === 'string' &&
      isStringArray(payload.leaseIds)
    ) {
      return json(
        await this.mutate((ledger) =>
          ledger.renewParticipantLeases(
            payload.roomId as string,
            payload.participantId as string,
            payload.leaseIds as readonly string[],
            now,
          ),
        ),
      );
    }
    if (path === '/leases/enforce' && isStringArray(payload.leaseIds)) {
      return json(
        await this.mutate((ledger) =>
          ledger.enforceLeases(payload.leaseIds as readonly string[], now),
        ),
      );
    }
    if (path === '/leases/release' && typeof payload.leaseId === 'string') {
      return json(
        await this.mutate((ledger) => ({
          released: ledger.releaseLease(payload.leaseId as string, now),
        })),
      );
    }
    if (path === '/admin/emergency-stop' && typeof payload.enabled === 'boolean') {
      return json(
        await this.mutate((ledger) => ledger.setEmergencyStop(payload.enabled as boolean, now)),
      );
    }
    if (path === '/admin/enabled' && typeof payload.enabled === 'boolean') {
      return json(
        await this.mutate((ledger) => ledger.setEnabled(payload.enabled as boolean, now)),
      );
    }
    if (
      path === '/admin/cycle' &&
      typeof payload.cycleId === 'string' &&
      payload.cycleId.trim().length > 0 &&
      typeof payload.startedAt === 'string' &&
      payload.startedAt.trim().length > 0 &&
      (payload.endsAt === null ||
        payload.endsAt === undefined ||
        typeof payload.endsAt === 'string')
    ) {
      const cycle: SpendGuardCycle = {
        id: payload.cycleId,
        startedAt: payload.startedAt,
        endsAt: typeof payload.endsAt === 'string' ? payload.endsAt : null,
      };
      const status = await this.mutate((ledger) => ledger.resetCycle(cycle, now));
      return status
        ? json(status)
        : json({ error: 'Active pull leases must be stopped before resetting the cycle.' }, 409);
    }
    return json({ error: 'Not found.' }, 404);
  }

  private async mutate<T>(operation: (ledger: SpendGuardLedger) => T): Promise<T> {
    return this.state.storage.transaction(async (transaction) => {
      const stored = await transaction.get<StoredSpendGuardState>(storageKey);
      const ledger = new SpendGuardLedger(getSpendGuardConfiguration(this.env), stored);
      const result = operation(ledger);
      await transaction.put(storageKey, ledger.serialize());
      return result;
    });
  }
}

function getStub(env: RealtimeEnv): DurableObjectStub {
  return env.SPEND_GUARD.get(env.SPEND_GUARD.idFromName('environment'));
}

async function callSpendGuard<T>(
  env: RealtimeEnv,
  path: string,
  body?: unknown,
  method: 'GET' | 'POST' = 'POST',
): Promise<T> {
  const response = await getStub(env).fetch(`https://spend-guard.internal${path}`, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.error === 'string'
        ? payload.error
        : `SpendGuard request failed with HTTP ${response.status}.`;
    throw new SpendGuardRequestError(response.status, message);
  }
  return payload as T;
}

export function getSpendGuardStatus(env: RealtimeEnv): Promise<SpendGuardStatus> {
  return callSpendGuard(env, '/status', undefined, 'GET');
}

export function admitCloudflareSession(
  env: RealtimeEnv,
): Promise<Readonly<{ allowed: boolean; reason?: string }>> {
  return callSpendGuard(env, '/session-admission', {});
}

export function acquirePullLease(
  env: RealtimeEnv,
  request: PullLeaseRequest,
): Promise<PullLeaseDecision> {
  return callSpendGuard(env, '/leases/acquire', request);
}

export function renewPullLeases(
  env: RealtimeEnv,
  roomId: string,
  participantId: string,
  leaseIds: readonly string[],
): Promise<Readonly<{ renewedLeaseIds: readonly string[]; revokedLeaseIds: readonly string[] }>> {
  return callSpendGuard(env, '/leases/renew', { roomId, participantId, leaseIds });
}

export function enforcePullLeases(
  env: RealtimeEnv,
  leaseIds: readonly string[],
): Promise<Readonly<{ activeLeaseIds: readonly string[]; revokedLeaseIds: readonly string[] }>> {
  return callSpendGuard(env, '/leases/enforce', { leaseIds });
}

export async function releasePullLease(env: RealtimeEnv, leaseId: string): Promise<void> {
  await callSpendGuard(env, '/leases/release', { leaseId });
}

export function callSpendGuardAdmin(
  env: RealtimeEnv,
  path: '/admin/emergency-stop' | '/admin/enabled' | '/admin/cycle',
  body: unknown,
): Promise<SpendGuardStatus> {
  return callSpendGuard(env, path, body);
}
