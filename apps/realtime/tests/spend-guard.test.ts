import { describe, expect, it } from 'vitest';

import type { RealtimeEnv } from '../src/runtime-config';
import { SpendGuard } from '../src/spend-guard';
import type { StoredSpendGuardState } from '../src/spend-guard-state';

function createTransactionalState(): {
  state: DurableObjectState;
  values: Map<string, unknown>;
} {
  const values = new Map<string, unknown>();
  let transactionQueue: Promise<void> = Promise.resolve();
  const transaction = {
    get: async <T>(key: string): Promise<T | undefined> => values.get(key) as T | undefined,
    put: async (key: string, value: unknown): Promise<void> => {
      values.set(key, value);
    },
  } as unknown as DurableObjectTransaction;
  const storage = {
    transaction: <T>(operation: (transaction: DurableObjectTransaction) => Promise<T>) => {
      const result = transactionQueue.then(() => operation(transaction));
      transactionQueue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  } as unknown as DurableObjectStorage;
  return { state: { storage } as DurableObjectState, values };
}

describe('SpendGuard Durable Object serialization', () => {
  it('allows only one concurrent acquisition for the same logical pull', async () => {
    const { state, values } = createTransactionalState();
    const guard = new SpendGuard(state, {
      CLOUDFLARE_ACCOUNTING_BITS_PER_SECOND_PER_PULL: '8000',
      CLOUDFLARE_SOFT_BUDGET_BYTES: '50000',
      CLOUDFLARE_HARD_BUDGET_BYTES: '100000',
      CLOUDFLARE_GLOBAL_PULL_CAP: '6',
      CLOUDFLARE_GLOBAL_SESSION_CAP: '16',
      CLOUDFLARE_PULL_LEASE_SECONDS: '40',
    } as RealtimeEnv);
    const request = () =>
      new Request('https://spend-guard.internal/leases/acquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: 'room-one',
          participantId: 'participant-one',
          screenShareId: 'share-one',
        }),
      });

    const decisions = await Promise.all([
      guard.fetch(request()).then((response) => response.json()),
      guard.fetch(request()).then((response) => response.json()),
    ]);

    expect(decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ allowed: true }),
        { allowed: false, reason: 'already-active' },
      ]),
    );
    const stored = values.get('spend-guard') as StoredSpendGuardState;
    expect(stored.leases).toHaveLength(1);
  });
});
