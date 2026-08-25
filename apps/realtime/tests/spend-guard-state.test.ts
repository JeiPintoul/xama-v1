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
    leaseMilliseconds: 1_000,
  },
};

function stored(overrides: Partial<StoredSpendGuardState>): StoredSpendGuardState {
  return {
    version: 1,
    enabled: true,
    emergencyStop: false,
    cycle: configuration.cycle,
    thresholds: configuration.thresholds,
    estimatedEgressBytes: 0,
    leases: [],
    ...overrides,
  };
}

describe('SpendGuardLedger', () => {
  it('allows a pull under budget and pessimistically accrues authorized lease time', () => {
    const ledger = new SpendGuardLedger(configuration);
    const decision = ledger.acquireLease(
      { roomId: 'room', participantId: 'viewer', screenShareId: 'share' },
      'lease-one',
      0,
    );

    expect(decision).toMatchObject({ allowed: true, leaseId: 'lease-one' });
    ledger.releaseLease('lease-one', 500);
    expect(ledger.getStatus(500)).toMatchObject({
      estimatedEgressBytes: 500,
      activeRemotePullCount: 0,
    });
  });

  it('denies pulls and session admission at the hard limit', () => {
    const ledger = new SpendGuardLedger(
      configuration,
      stored({ estimatedEgressBytes: configuration.thresholds.hardBudgetBytes }),
    );

    expect(ledger.admitSession(0)).toEqual({ allowed: false, reason: 'hard-limit' });
    expect(
      ledger.acquireLease(
        { roomId: 'room', participantId: 'viewer', screenShareId: 'share' },
        'lease-one',
        0,
      ),
    ).toEqual({ allowed: false, reason: 'hard-limit' });
  });

  it('excludes new rooms at the soft limit without treating it as a calendar reset', () => {
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

  it('revokes active leases during an emergency stop and denies new work', () => {
    const ledger = new SpendGuardLedger(configuration);
    ledger.acquireLease(
      { roomId: 'room', participantId: 'viewer', screenShareId: 'share' },
      'lease-one',
      0,
    );

    expect(ledger.setEmergencyStop(true, 100)).toMatchObject({
      emergencyStop: true,
      activeRemotePullCount: 0,
    });
    expect(ledger.admitSession(100)).toEqual({ allowed: false, reason: 'emergency-stop' });
  });

  it('enforces the global pull cap', () => {
    const ledger = new SpendGuardLedger(configuration);
    ledger.acquireLease(
      { roomId: 'room', participantId: 'one', screenShareId: 'one' },
      'lease-one',
      0,
    );
    ledger.acquireLease(
      { roomId: 'room', participantId: 'two', screenShareId: 'two' },
      'lease-two',
      0,
    );

    expect(
      ledger.acquireLease(
        { roomId: 'room', participantId: 'three', screenShareId: 'three' },
        'lease-three',
        0,
      ),
    ).toEqual({ allowed: false, reason: 'global-pull-cap' });
  });

  it('expires unrenewed leases and rejects renewal after a hard stop', () => {
    const ledger = new SpendGuardLedger(configuration);
    ledger.acquireLease(
      { roomId: 'room', participantId: 'viewer', screenShareId: 'share' },
      'lease-one',
      0,
    );
    expect(ledger.enforceLeases(['lease-one'], 1_001).revokedLeaseIds).toEqual(['lease-one']);

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

  it('starts a new accounting cycle only through an explicit reset', () => {
    const ledger = new SpendGuardLedger(configuration, stored({ estimatedEgressBytes: 4_000 }));

    expect(
      ledger.resetCycle({ id: 'cycle-two', startedAt: 'start-two', endsAt: null }, 100),
    ).toMatchObject({ estimatedEgressBytes: 0, cycle: { id: 'cycle-two' } });
  });
});
