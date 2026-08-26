import { parsePositiveInteger, parsePositiveNumber, type RealtimeEnv } from './runtime-config';

const gibibyte = 1024 ** 3;
const defaultSessionSlotMilliseconds = 60_000;

export type SpendGuardThresholds = Readonly<{
  accountingBitsPerSecondPerPull: number;
  softBudgetBytes: number;
  hardBudgetBytes: number;
  globalPullCap: number;
  globalSessionCap: number;
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
  state?: 'active' | 'closing';
  lastAccruedAt: number;
  expiresAt: number;
}>;

export type SpendGuardSessionSlot = Readonly<{
  id: string;
  roomId: string;
  participantId: string;
  expiresAt: number;
}>;

export type StoredSpendGuardState = Readonly<{
  version: 1 | 2;
  enabled: boolean;
  emergencyStop: boolean;
  cycle: SpendGuardCycle;
  thresholds: Omit<SpendGuardThresholds, 'globalSessionCap'> &
    Partial<Pick<SpendGuardThresholds, 'globalSessionCap'>>;
  estimatedEgressBytes: number;
  leases: readonly SpendGuardLease[];
  sessions?: readonly SpendGuardSessionSlot[];
}>;

export type SpendGuardStatus = Readonly<{
  enabled: boolean;
  emergencyStop: boolean;
  softLimitActive: boolean;
  hardLimitActive: boolean;
  cloudflareExcludedForNewRooms: boolean;
  estimatedEgressBytes: number;
  reservedEgressBytes: number;
  projectedWorstCaseEgressBytes: number;
  activeRemotePullCount: number;
  closingRemotePullCount: number;
  activeCloudflareSessionCount: number;
  cycle: SpendGuardCycle;
  thresholds: SpendGuardThresholds;
  configuredCycleId: string;
  configuredCycleMismatch: boolean;
}>;

export type SpendGuardConfiguration = Readonly<{
  cycle: SpendGuardCycle;
  thresholds: SpendGuardThresholds;
  sessionSlotMilliseconds?: number;
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
      reason:
        | 'already-active'
        | 'disabled'
        | 'hard-limit'
        | 'emergency-stop'
        | 'global-pull-cap';
    }>;

export type SessionSlotDecision =
  | Readonly<{ allowed: true; sessionSlotId: string; expiresAt: number }>
  | Readonly<{
      allowed: false;
      reason: 'disabled' | 'hard-limit' | 'emergency-stop' | 'global-session-cap';
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
      globalSessionCap: parsePositiveInteger(env.CLOUDFLARE_GLOBAL_SESSION_CAP, 16),
      leaseMilliseconds: leaseSeconds * 1_000,
    },
    sessionSlotMilliseconds: defaultSessionSlotMilliseconds,
  };
}

function minimumSafeThresholds(
  stored: StoredSpendGuardState['thresholds'],
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
    globalSessionCap: Math.min(
      stored.globalSessionCap ?? configured.globalSessionCap,
      configured.globalSessionCap,
    ),
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
  private readonly sessions = new Map<string, SpendGuardSessionSlot>();

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
    stored?.leases.forEach((lease) =>
      this.leases.set(lease.id, { ...lease, state: lease.state ?? 'active' }),
    );
    stored?.sessions?.forEach((session) => this.sessions.set(session.id, session));
  }

  getStatus(now: number): SpendGuardStatus {
    this.advance(now);
    const reservedEgressBytes = this.getReservedEgressBytes(now);
    const projectedWorstCaseEgressBytes = this.estimatedEgressBytes + reservedEgressBytes;
    const hardLimitActive = projectedWorstCaseEgressBytes >= this.thresholds.hardBudgetBytes;
    const softLimitActive = projectedWorstCaseEgressBytes >= this.thresholds.softBudgetBytes;
    const leases = [...this.leases.values()];
    return {
      enabled: this.enabled,
      emergencyStop: this.emergencyStop,
      softLimitActive,
      hardLimitActive,
      cloudflareExcludedForNewRooms:
        !this.enabled || this.emergencyStop || softLimitActive || hardLimitActive,
      estimatedEgressBytes: this.estimatedEgressBytes,
      reservedEgressBytes,
      projectedWorstCaseEgressBytes,
      activeRemotePullCount: leases.length,
      closingRemotePullCount: leases.filter((lease) => lease.state === 'closing').length,
      activeCloudflareSessionCount: this.sessions.size,
      cycle: this.cycle,
      thresholds: this.thresholds,
      configuredCycleId: this.configuration.cycle.id,
      configuredCycleMismatch: this.cycle.id !== this.configuration.cycle.id,
    };
  }

  acquireSessionSlot(
    roomId: string,
    participantId: string,
    sessionSlotId: string,
    now: number,
  ): SessionSlotDecision {
    const status = this.getStatus(now);
    if (!status.enabled) return { allowed: false, reason: 'disabled' };
    if (status.emergencyStop) return { allowed: false, reason: 'emergency-stop' };
    if (status.hardLimitActive) return { allowed: false, reason: 'hard-limit' };
    if (this.sessions.size >= this.thresholds.globalSessionCap) {
      return { allowed: false, reason: 'global-session-cap' };
    }
    const expiresAt = now + this.getSessionSlotMilliseconds();
    this.sessions.set(sessionSlotId, { id: sessionSlotId, roomId, participantId, expiresAt });
    return { allowed: true, sessionSlotId, expiresAt };
  }

  renewSessionSlot(
    sessionSlotId: string,
    roomId: string,
    participantId: string,
    now: number,
  ): Readonly<{ renewed: boolean; expiresAt?: number }> {
    this.advance(now);
    const session = this.sessions.get(sessionSlotId);
    if (!session || session.roomId !== roomId || session.participantId !== participantId) {
      return { renewed: false };
    }
    const expiresAt = now + this.getSessionSlotMilliseconds();
    this.sessions.set(sessionSlotId, { ...session, expiresAt });
    return { renewed: true, expiresAt };
  }

  releaseSessionSlot(sessionSlotId: string, now: number): boolean {
    this.advance(now);
    return this.sessions.delete(sessionSlotId);
  }

  acquireLease(request: PullLeaseRequest, leaseId: string, now: number): PullLeaseDecision {
    this.advance(now);
    const existing = [...this.leases.values()].find(
      (lease) =>
        lease.roomId === request.roomId &&
        lease.participantId === request.participantId &&
        lease.screenShareId === request.screenShareId,
    );
    if (existing) return { allowed: false, reason: 'already-active' };

    const status = this.getStatus(now);
    if (!status.enabled) return { allowed: false, reason: 'disabled' };
    if (status.emergencyStop) return { allowed: false, reason: 'emergency-stop' };
    if (this.projectedWithCandidate(now) >= this.thresholds.hardBudgetBytes) {
      return { allowed: false, reason: 'hard-limit' };
    }
    if (this.leases.size >= this.thresholds.globalPullCap) {
      return { allowed: false, reason: 'global-pull-cap' };
    }
    const lease: SpendGuardLease = {
      id: leaseId,
      ...request,
      state: 'active',
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
    const renewedLeaseIds: string[] = [];
    const revokedLeaseIds: string[] = [];
    for (const leaseId of leaseIds) {
      const lease = this.leases.get(leaseId);
      if (
        !lease ||
        lease.roomId !== roomId ||
        lease.participantId !== participantId ||
        lease.state === 'closing' ||
        blocked ||
        this.projectedAfterRenewal(lease, now) >= this.thresholds.hardBudgetBytes
      ) {
        if (lease) this.leases.set(leaseId, { ...lease, state: 'closing' });
        revokedLeaseIds.push(leaseId);
        continue;
      }
      const renewed = {
        ...lease,
        state: 'active' as const,
        expiresAt: now + this.thresholds.leaseMilliseconds,
      };
      this.leases.set(leaseId, renewed);
      renewedLeaseIds.push(leaseId);
    }
    return { renewedLeaseIds, revokedLeaseIds };
  }

  enforceLeases(
    leaseIds: readonly string[],
    now: number,
  ): Readonly<{ activeLeaseIds: readonly string[]; revokedLeaseIds: readonly string[] }> {
    const status = this.getStatus(now);
    const guardStopped = !status.enabled || status.emergencyStop || status.hardLimitActive;
    const activeLeaseIds: string[] = [];
    const revokedLeaseIds: string[] = [];
    for (const leaseId of leaseIds) {
      const lease = this.leases.get(leaseId);
      if (!lease || lease.state === 'closing' || guardStopped) {
        if (lease) this.leases.set(leaseId, { ...lease, state: 'closing' });
        revokedLeaseIds.push(leaseId);
      } else {
        activeLeaseIds.push(leaseId);
      }
    }
    return { activeLeaseIds, revokedLeaseIds };
  }

  markLeaseClosing(leaseId: string, now: number): boolean {
    this.advance(now);
    const lease = this.leases.get(leaseId);
    if (!lease) return false;
    this.leases.set(leaseId, { ...lease, state: 'closing' });
    return true;
  }

  releaseLease(leaseId: string, now: number): boolean {
    this.advance(now);
    return this.leases.delete(leaseId);
  }

  setEmergencyStop(enabled: boolean, now: number): SpendGuardStatus {
    this.advance(now);
    this.emergencyStop = enabled;
    if (enabled) this.markAllLeasesClosing();
    return this.getStatus(now);
  }

  setEnabled(enabled: boolean, now: number): SpendGuardStatus {
    this.advance(now);
    this.enabled = enabled;
    if (!enabled) this.markAllLeasesClosing();
    return this.getStatus(now);
  }

  resetCycle(cycle: SpendGuardCycle, now: number): SpendGuardStatus | null {
    this.advance(now);
    if (this.leases.size > 0) return null;
    this.cycle = cycle;
    this.thresholds = this.configuration.thresholds;
    this.estimatedEgressBytes = 0;
    return this.getStatus(now);
  }

  serialize(): StoredSpendGuardState {
    return {
      version: 2,
      enabled: this.enabled,
      emergencyStop: this.emergencyStop,
      cycle: this.cycle,
      thresholds: this.thresholds,
      estimatedEgressBytes: this.estimatedEgressBytes,
      leases: [...this.leases.values()],
      sessions: [...this.sessions.values()],
    };
  }

  private getSessionSlotMilliseconds(): number {
    return this.configuration.sessionSlotMilliseconds ?? defaultSessionSlotMilliseconds;
  }

  private getFullLeaseBytes(): number {
    return (
      (this.thresholds.accountingBitsPerSecondPerPull * this.thresholds.leaseMilliseconds) / 8_000
    );
  }

  private getReservedEgressBytes(now: number): number {
    return [...this.leases.values()].reduce((reserved, lease) => {
      const remainingMilliseconds =
        lease.state === 'closing'
          ? this.thresholds.leaseMilliseconds
          : Math.max(0, lease.expiresAt - now);
      return (
        reserved +
        (remainingMilliseconds * this.thresholds.accountingBitsPerSecondPerPull) / 8_000
      );
    }, 0);
  }

  private projectedWithCandidate(now: number): number {
    return this.estimatedEgressBytes + this.getReservedEgressBytes(now) + this.getFullLeaseBytes();
  }

  private projectedAfterRenewal(lease: SpendGuardLease, now: number): number {
    const currentRemainingBytes =
      (Math.max(0, lease.expiresAt - now) * this.thresholds.accountingBitsPerSecondPerPull) / 8_000;
    return (
      this.estimatedEgressBytes +
      this.getReservedEgressBytes(now) -
      currentRemainingBytes +
      this.getFullLeaseBytes()
    );
  }

  private markAllLeasesClosing(): void {
    for (const lease of this.leases.values()) {
      this.leases.set(lease.id, { ...lease, state: 'closing' });
    }
  }

  private advance(now: number): void {
    for (const lease of [...this.leases.values()]) {
      const elapsedMilliseconds = Math.max(0, now - lease.lastAccruedAt);
      this.estimatedEgressBytes +=
        (elapsedMilliseconds * this.thresholds.accountingBitsPerSecondPerPull) / 8_000;
      this.leases.set(lease.id, {
        ...lease,
        state: lease.state === 'closing' || now >= lease.expiresAt ? 'closing' : 'active',
        lastAccruedAt: now,
      });
    }
    for (const session of [...this.sessions.values()]) {
      if (now >= session.expiresAt) this.sessions.delete(session.id);
    }
  }
}
