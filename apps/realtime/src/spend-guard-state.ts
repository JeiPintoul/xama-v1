import { parsePositiveInteger, parsePositiveNumber, type RealtimeEnv } from './runtime-config';

const gibibyte = 1024 ** 3;

export type SpendGuardThresholds = Readonly<{
  accountingBitsPerSecondPerPull: number;
  softBudgetBytes: number;
  hardBudgetBytes: number;
  globalPullCap: number;
  leaseMilliseconds: number;
}>;

export type SpendGuardCycle = Readonly<{
  id: string;
  startedAt: string;
  endsAt: string | null;
}>;

export type SpendGuardLease = Readonly<{
  id: string;
  roomId: string;
  participantId: string;
  screenShareId: string;
  lastAccruedAt: number;
  expiresAt: number;
}>;

export type StoredSpendGuardState = Readonly<{
  version: 1;
  enabled: boolean;
  emergencyStop: boolean;
  cycle: SpendGuardCycle;
  thresholds: SpendGuardThresholds;
  estimatedEgressBytes: number;
  leases: readonly SpendGuardLease[];
}>;

export type SpendGuardStatus = Readonly<{
  enabled: boolean;
  emergencyStop: boolean;
  softLimitActive: boolean;
  hardLimitActive: boolean;
  cloudflareExcludedForNewRooms: boolean;
  estimatedEgressBytes: number;
  activeRemotePullCount: number;
  cycle: SpendGuardCycle;
  thresholds: SpendGuardThresholds;
  configuredCycleId: string;
  configuredCycleMismatch: boolean;
}>;

export type SpendGuardConfiguration = Readonly<{
  cycle: SpendGuardCycle;
  thresholds: SpendGuardThresholds;
}>;

export type PullLeaseRequest = Readonly<{
  roomId: string;
  participantId: string;
  screenShareId: string;
}>;

export type PullLeaseDecision =
  | Readonly<{ allowed: true; leaseId: string; expiresAt: number }>
  | Readonly<{
      allowed: false;
      reason: 'disabled' | 'hard-limit' | 'emergency-stop' | 'global-pull-cap';
    }>;

export function getSpendGuardConfiguration(env: RealtimeEnv): SpendGuardConfiguration {
  const leaseSeconds = Math.min(
    45,
    Math.max(30, parsePositiveInteger(env.CLOUDFLARE_PULL_LEASE_SECONDS, 40)),
  );
  return {
    cycle: {
      id: env.CLOUDFLARE_BILLING_CYCLE_ID?.trim() || 'manual-development-cycle',
      startedAt: env.CLOUDFLARE_BILLING_CYCLE_START?.trim() || 'explicit-reset-required',
      endsAt: env.CLOUDFLARE_BILLING_CYCLE_END?.trim() || null,
    },
    thresholds: {
      accountingBitsPerSecondPerPull: parsePositiveNumber(
        env.CLOUDFLARE_ACCOUNTING_BITS_PER_SECOND_PER_PULL,
        12_000_000,
      ),
      softBudgetBytes: parsePositiveNumber(env.CLOUDFLARE_SOFT_BUDGET_BYTES, 5 * gibibyte),
      hardBudgetBytes: parsePositiveNumber(env.CLOUDFLARE_HARD_BUDGET_BYTES, 8 * gibibyte),
      globalPullCap: parsePositiveInteger(env.CLOUDFLARE_GLOBAL_PULL_CAP, 6),
      leaseMilliseconds: leaseSeconds * 1_000,
    },
  };
}

function minimumSafeThresholds(
  stored: SpendGuardThresholds,
  configured: SpendGuardThresholds,
): SpendGuardThresholds {
  return {
    accountingBitsPerSecondPerPull: Math.max(
      stored.accountingBitsPerSecondPerPull,
      configured.accountingBitsPerSecondPerPull,
    ),
    softBudgetBytes: Math.min(stored.softBudgetBytes, configured.softBudgetBytes),
    hardBudgetBytes: Math.min(stored.hardBudgetBytes, configured.hardBudgetBytes),
    globalPullCap: Math.min(stored.globalPullCap, configured.globalPullCap),
    leaseMilliseconds: Math.min(stored.leaseMilliseconds, configured.leaseMilliseconds),
  };
}

export class SpendGuardLedger {
  private enabled: boolean;
  private emergencyStop: boolean;
  private cycle: SpendGuardCycle;
  private thresholds: SpendGuardThresholds;
  private estimatedEgressBytes: number;
  private readonly leases = new Map<string, SpendGuardLease>();

  constructor(
    private readonly configuration: SpendGuardConfiguration,
    stored?: StoredSpendGuardState,
  ) {
    this.enabled = stored?.enabled ?? true;
    this.emergencyStop = stored?.emergencyStop ?? false;
    this.cycle = stored?.cycle ?? configuration.cycle;
    this.thresholds = stored
      ? minimumSafeThresholds(stored.thresholds, configuration.thresholds)
      : configuration.thresholds;
    this.estimatedEgressBytes = stored?.estimatedEgressBytes ?? 0;
    stored?.leases.forEach((lease) => this.leases.set(lease.id, lease));
  }

  getStatus(now: number): SpendGuardStatus {
    this.accrue(now);
    const hardLimitActive = this.estimatedEgressBytes >= this.thresholds.hardBudgetBytes;
    const softLimitActive = this.estimatedEgressBytes >= this.thresholds.softBudgetBytes;
    return {
      enabled: this.enabled,
      emergencyStop: this.emergencyStop,
      softLimitActive,
      hardLimitActive,
      cloudflareExcludedForNewRooms:
        !this.enabled || this.emergencyStop || softLimitActive || hardLimitActive,
      estimatedEgressBytes: this.estimatedEgressBytes,
      activeRemotePullCount: this.leases.size,
      cycle: this.cycle,
      thresholds: this.thresholds,
      configuredCycleId: this.configuration.cycle.id,
      configuredCycleMismatch: this.cycle.id !== this.configuration.cycle.id,
    };
  }

  admitSession(now: number): Readonly<{ allowed: boolean; reason?: string }> {
    const status = this.getStatus(now);
    if (!status.enabled) return { allowed: false, reason: 'disabled' };
    if (status.emergencyStop) return { allowed: false, reason: 'emergency-stop' };
    if (status.hardLimitActive) return { allowed: false, reason: 'hard-limit' };
    return { allowed: true };
  }

  acquireLease(request: PullLeaseRequest, leaseId: string, now: number): PullLeaseDecision {
    const existing = [...this.leases.values()].find(
      (lease) =>
        lease.roomId === request.roomId &&
        lease.participantId === request.participantId &&
        lease.screenShareId === request.screenShareId,
    );
    if (existing) return this.renewLease(existing, now);

    const status = this.getStatus(now);
    if (!status.enabled) return { allowed: false, reason: 'disabled' };
    if (status.emergencyStop) return { allowed: false, reason: 'emergency-stop' };
    if (status.hardLimitActive || this.wouldCrossHardLimit()) {
      return { allowed: false, reason: 'hard-limit' };
    }
    if (this.leases.size >= this.thresholds.globalPullCap) {
      return { allowed: false, reason: 'global-pull-cap' };
    }
    const lease: SpendGuardLease = {
      id: leaseId,
      ...request,
      lastAccruedAt: now,
      expiresAt: now + this.thresholds.leaseMilliseconds,
    };
    this.leases.set(lease.id, lease);
    return { allowed: true, leaseId: lease.id, expiresAt: lease.expiresAt };
  }

  renewParticipantLeases(
    roomId: string,
    participantId: string,
    leaseIds: readonly string[],
    now: number,
  ): Readonly<{ renewedLeaseIds: readonly string[]; revokedLeaseIds: readonly string[] }> {
    const status = this.getStatus(now);
    const blocked = !status.enabled || status.emergencyStop || status.hardLimitActive;
    if (blocked) this.leases.clear();
    const renewedLeaseIds: string[] = [];
    const revokedLeaseIds: string[] = [];
    for (const leaseId of leaseIds) {
      const lease = this.leases.get(leaseId);
      if (
        !lease ||
        lease.roomId !== roomId ||
        lease.participantId !== participantId ||
        this.wouldCrossHardLimit()
      ) {
        this.leases.delete(leaseId);
        revokedLeaseIds.push(leaseId);
        continue;
      }
      const decision = this.renewLease(lease, now);
      if (decision.allowed) renewedLeaseIds.push(leaseId);
      else revokedLeaseIds.push(leaseId);
    }
    return { renewedLeaseIds, revokedLeaseIds };
  }

  enforceLeases(
    leaseIds: readonly string[],
    now: number,
  ): Readonly<{ activeLeaseIds: readonly string[]; revokedLeaseIds: readonly string[] }> {
    const status = this.getStatus(now);
    if (!status.enabled || status.emergencyStop || status.hardLimitActive) this.leases.clear();
    const activeLeaseIds = leaseIds.filter((leaseId) => this.leases.has(leaseId));
    const active = new Set(activeLeaseIds);
    return {
      activeLeaseIds,
      revokedLeaseIds: leaseIds.filter((leaseId) => !active.has(leaseId)),
    };
  }

  releaseLease(leaseId: string, now: number): boolean {
    this.accrue(now);
    return this.leases.delete(leaseId);
  }

  setEmergencyStop(enabled: boolean, now: number): SpendGuardStatus {
    this.accrue(now);
    this.emergencyStop = enabled;
    if (enabled) this.leases.clear();
    return this.getStatus(now);
  }

  setEnabled(enabled: boolean, now: number): SpendGuardStatus {
    this.accrue(now);
    this.enabled = enabled;
    if (!enabled) this.leases.clear();
    return this.getStatus(now);
  }

  resetCycle(cycle: SpendGuardCycle, now: number): SpendGuardStatus | null {
    this.accrue(now);
    if (this.leases.size > 0) return null;
    this.cycle = cycle;
    this.thresholds = this.configuration.thresholds;
    this.estimatedEgressBytes = 0;
    return this.getStatus(now);
  }

  serialize(): StoredSpendGuardState {
    return {
      version: 1,
      enabled: this.enabled,
      emergencyStop: this.emergencyStop,
      cycle: this.cycle,
      thresholds: this.thresholds,
      estimatedEgressBytes: this.estimatedEgressBytes,
      leases: [...this.leases.values()],
    };
  }

  private renewLease(lease: SpendGuardLease, now: number): PullLeaseDecision {
    const status = this.getStatus(now);
    if (!status.enabled) return { allowed: false, reason: 'disabled' };
    if (status.emergencyStop) return { allowed: false, reason: 'emergency-stop' };
    if (status.hardLimitActive || this.wouldCrossHardLimit()) {
      this.leases.delete(lease.id);
      return { allowed: false, reason: 'hard-limit' };
    }
    const renewed = {
      ...lease,
      lastAccruedAt: now,
      expiresAt: now + this.thresholds.leaseMilliseconds,
    };
    this.leases.set(lease.id, renewed);
    return { allowed: true, leaseId: lease.id, expiresAt: renewed.expiresAt };
  }

  private wouldCrossHardLimit(): boolean {
    const fullLeaseBytes =
      (this.thresholds.accountingBitsPerSecondPerPull * this.thresholds.leaseMilliseconds) / 8_000;
    return this.estimatedEgressBytes + fullLeaseBytes >= this.thresholds.hardBudgetBytes;
  }

  private accrue(now: number): void {
    for (const lease of [...this.leases.values()]) {
      const accrualEnd = Math.min(now, lease.expiresAt);
      const elapsedMilliseconds = Math.max(0, accrualEnd - lease.lastAccruedAt);
      this.estimatedEgressBytes +=
        (elapsedMilliseconds * this.thresholds.accountingBitsPerSecondPerPull) / 8_000;
      if (now >= lease.expiresAt) this.leases.delete(lease.id);
      else if (elapsedMilliseconds > 0) {
        this.leases.set(lease.id, { ...lease, lastAccruedAt: accrualEnd });
      }
    }
  }
}
