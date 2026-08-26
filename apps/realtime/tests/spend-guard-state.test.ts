import { describe, expect, it } from 'vitest';

import {
  SpendGuardLedger,
  type SpendGuardConfiguration,
  type StoredSpendGuardState,
} from '../src/spend-guard-state';

const configuration: SpendGuardConfiguration = {
  cycle: { id: 'cycle-one', startedAt: 'start-one', endsAt: null },
  thresholds: {
    accountingBitsPerSecondPerPull: 8_000,
    softBudgetBytes: 5_000,
    hardBudgetBytes: 10_000,
    globalPullCap: 2,
    globalSessionCap: 2,
    leaseMilliseconds: 1_000,
  },
  sessionSlotMilliseconds: 1_000,
};

function stored(overrides: Partial<StoredSpendGuardState>): StoredSpendGuardState {
  return {
    version: 2,
    enabled: true,
    emergencyStop: false,
    cycle: configuration.cycle,
    thresholds: configuration.thresholds,
    estimatedEgressBytes: 0,
    leases: [],
    sessions: [],
    ...overrides,
  };
}

describe('SpendGuardLedger', () => {
  it('tracks accrued, reserved and projected worst-case egress', () => {
    const ledger = new SpendGuardLedger(configuration);
    expect(
      ledger.acquireLease(
        { roomId: 'room', participantId: 'viewer', screenShareId: 'share' },
        'lease-one',
        0,
      ),
    ).toMatchObject({ allowed: true, leaseId: 'lease-one' });

    expect(ledger.getStatus(500)).toMatchObject({
      estimatedEgressBytes: 500,
      reservedEgressBytes: 500,
      projectedWorstCaseEgressBytes: 1_000,
      activeRemotePullCount: 1,
    });
    ledger.releaseLease('lease-one', 500);
    expect(ledger.getStatus(500)).toMatchObject({
      estimatedEgressBytes: 500,
      reservedEgressBytes: 0,
      activeRemotePullCount: 0,
    });
  });

  it('returns already-active instead of renewing a duplicate logical pull', () => {
    const ledger = new SpendGuardLedger(configuration);
    const request = { roomId: 'room', participantId: 'viewer', screenShareId: 'share' };

    expect(ledger.acquireLease(request, 'lease-one', 0).allowed).toBe(true);
    expect(ledger.acquireLease(request, 'lease-two', 100)).toEqual({
      allowed: false,
      reason: 'already-active',
    });
    expect(ledger.getStatus(100).activeRemotePullCount).toBe(1);
  });

  it('denies pulls and session slots at the hard limit', () => {
    const ledger = new SpendGuardLedger(
      configuration,
      stored({ estimatedEgressBytes: configuration.thresholds.hardBudgetBytes }),
    );

    expect(ledger.acquireSessionSlot('room', 'viewer', 'slot-one', 0)).toEqual({
      allowed: false,
      reason: 'hard-limit',
    });
    expect(
      ledger.acquireLease(
        { roomId: 'room', participantId: 'viewer', screenShareId: 'share' },
        'lease-one',
        0,
      ),
    ).toEqual({ allowed: false, reason: 'hard-limit' });
  });

  it('does not authorize combined lease reservations beyond the hard budget', () => {
    const nearLimit: SpendGuardConfiguration = {
      ...configuration,
      thresholds: {
        ...configuration.thresholds,
        hardBudgetBytes: 2_500,
        globalPullCap: 10,
      },
    };
    const ledger = new SpendGuardLedger(
      nearLimit,
      stored({ thresholds: nearLimit.thresholds, estimatedEgressBytes: 400 }),
    );

    for (const suffix of ['one', 'two']) {
      expect(
        ledger.acquireLease(
          { roomId: 'room', participantId: suffix, screenShareId: suffix },
          `lease-${suffix}`,
          0,
        ).allowed,
      ).toBe(true);
    }
    expect(
      ledger.acquireLease(
        { roomId: 'room', participantId: 'three', screenShareId: 'three' },
        'lease-three',
        0,
      ),
    ).toEqual({ allowed: false, reason: 'hard-limit' });
    expect(ledger.getStatus(0)).toMatchObject({
      estimatedEgressBytes: 400,
      reservedEgressBytes: 2_000,
      projectedWorstCaseEgressBytes: 2_400,
    });
  });

  it('excludes new rooms at the soft limit without calendar reset behavior', () => {
    const ledger = new SpendGuardLedger(
      configuration,
      stored({ estimatedEgressBytes: configuration.thresholds.softBudgetBytes }),
    );
    expect(ledger.getStatus(Date.UTC(2030, 0, 1))).toMatchObject({
      softLimitActive: true,
      hardLimitActive: false,
      cloudflareExcludedForNewRooms: true,
      estimatedEgressBytes: configuration.thresholds.softBudgetBytes,
      cycle: { id: 'cycle-one' },
    });
  });

  it('keeps stopped leases accounted as closing until provider closure', () => {
    const ledger = new SpendGuardLedger(configuration);
    ledger.acquireLease(
      { roomId: 'room', participantId: 'viewer', screenShareId: 'share' },
      'lease-one',
      0,
    );

    expect(ledger.setEmergencyStop(true, 100)).toMatchObject({
      emergencyStop: true,
      activeRemotePullCount: 1,
      closingRemotePullCount: 1,
    });
    expect(ledger.enforceLeases(['lease-one'], 100).revokedLeaseIds).toEqual(['lease-one']);
    expect(ledger.acquireSessionSlot('room', 'viewer', 'slot-one', 100)).toEqual({
      allowed: false,
      reason: 'emergency-stop',
    });
  });

  it('enforces the global pull cap', () => {
    const ledger = new SpendGuardLedger(configuration);
    for (const suffix of ['one', 'two']) {
      ledger.acquireLease(
        { roomId: 'room', participantId: suffix, screenShareId: suffix },
        `lease-${suffix}`,
        0,
      );
    }
    expect(
      ledger.acquireLease(
        { roomId: 'room', participantId: 'three', screenShareId: 'three' },
        'lease-three',
        0,
      ),
    ).toEqual({ allowed: false, reason: 'global-pull-cap' });
  });

  it('enforces and expires the strongly consistent global session cap', () => {
    const ledger = new SpendGuardLedger(configuration);
    expect(ledger.acquireSessionSlot('one', 'one', 'slot-one', 0).allowed).toBe(true);
    expect(ledger.acquireSessionSlot('two', 'two', 'slot-two', 0).allowed).toBe(true);
    expect(ledger.acquireSessionSlot('three', 'three', 'slot-three', 0)).toEqual({
      allowed: false,
      reason: 'global-session-cap',
    });

    expect(ledger.renewSessionSlot('slot-one', 'one', 'one', 500).renewed).toBe(true);
    expect(ledger.releaseSessionSlot('slot-two', 500)).toBe(true);
    expect(ledger.acquireSessionSlot('three', 'three', 'slot-three', 500).allowed).toBe(true);
    expect(ledger.getStatus(1_501).activeCloudflareSessionCount).toBe(0);
  });

  it('marks expired leases for closure and rejects renewal after a hard stop', () => {
    const ledger = new SpendGuardLedger(configuration);
    ledger.acquireLease(
      { roomId: 'room', participantId: 'viewer', screenShareId: 'share' },
      'lease-one',
      0,
    );
    expect(ledger.enforceLeases(['lease-one'], 1_001).revokedLeaseIds).toEqual(['lease-one']);
    expect(ledger.getStatus(1_001).closingRemotePullCount).toBe(1);

    const hardLedger = new SpendGuardLedger(
      configuration,
      stored({
        estimatedEgressBytes: 9_500,
        leases: [
          {
            id: 'lease-two',
            roomId: 'room',
            participantId: 'viewer',
            screenShareId: 'share',
            lastAccruedAt: 0,
            expiresAt: 1_000,
          },
        ],
      }),
    );
    expect(
      hardLedger.renewParticipantLeases('room', 'viewer', ['lease-two'], 500).revokedLeaseIds,
    ).toEqual(['lease-two']);
  });

  it('starts a new accounting cycle only through an explicit reset without leases', () => {
    const ledger = new SpendGuardLedger(configuration, stored({ estimatedEgressBytes: 4_000 }));
    expect(
      ledger.resetCycle({ id: 'cycle-two', startedAt: 'start-two', endsAt: null }, 100),
    ).toMatchObject({ estimatedEgressBytes: 0, cycle: { id: 'cycle-two' } });
  });
});
