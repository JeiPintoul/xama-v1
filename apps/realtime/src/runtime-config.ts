import type { MediaProviderMode, MediaProviderRoutingSignal } from '@xama/media-core';

export type RateLimitBinding = Readonly<{
  limit(options: Readonly<{ key: string }>): Promise<Readonly<{ success: boolean }>>;
}>;

export interface RealtimeEnv {
  ROOMS: DurableObjectNamespace;
  SPEND_GUARD: DurableObjectNamespace;
  JOIN_RATE_LIMITER?: RateLimitBinding;
  CONTROL_RATE_LIMITER?: RateLimitBinding;
  CLOUDFLARE_REALTIME_APP_ID?: string;
  CLOUDFLARE_REALTIME_APP_SECRET?: string;
  REALTIME_ADMIN_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
  REQUIRE_TURNSTILE?: string;
  TURNSTILE_EXPECTED_HOSTNAMES?: string;
  TURNSTILE_EXPECTED_ACTION?: string;
  ENVIRONMENT?: string;
  ALLOWED_ORIGINS?: string;
  ALLOW_CLIENT_PROVIDER_OVERRIDE?: string;
  LIVEKIT_ENABLED?: string;
  LIVEKIT_HEALTH?: string;
  CLOUDFLARE_ENABLED?: string;
  CLOUDFLARE_HEALTH?: string;
  CLOUDFLARE_ACCOUNTING_BITS_PER_SECOND_PER_PULL?: string;
  CLOUDFLARE_SOFT_BUDGET_BYTES?: string;
  CLOUDFLARE_HARD_BUDGET_BYTES?: string;
  CLOUDFLARE_GLOBAL_PULL_CAP?: string;
  CLOUDFLARE_GLOBAL_SESSION_CAP?: string;
  CLOUDFLARE_PULL_LEASE_SECONDS?: string;
  CLOUDFLARE_BILLING_CYCLE_ID?: string;
  CLOUDFLARE_BILLING_CYCLE_START?: string;
  CLOUDFLARE_BILLING_CYCLE_END?: string;
  MAX_PARTICIPANTS_PER_ROOM?: string;
  MAX_SCREEN_SHARES_PER_PARTICIPANT?: string;
  MAX_SCREEN_SHARES_PER_ROOM?: string;
  MAX_REMOTE_PULLS_PER_PARTICIPANT?: string;
  MAX_REMOTE_PULLS_PER_ROOM?: string;
}

export type ProductionConfigurationIssue =
  | 'allowed-origins'
  | 'realtime-credentials'
  | 'accounting-bitrate'
  | 'soft-budget'
  | 'hard-budget'
  | 'budget-order'
  | 'global-pull-cap'
  | 'global-session-cap'
  | 'lease-duration'
  | 'billing-cycle-id'
  | 'billing-cycle-start'
  | 'admin-secret'
  | 'client-provider-override'
  | 'turnstile-required'
  | 'turnstile-secret'
  | 'turnstile-hostnames'
  | 'turnstile-action';

export function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

export function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function parsePositiveNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseHealth(value: string | undefined): 'healthy' | 'degraded' | 'unknown' {
  return value === 'degraded' || value === 'unknown' ? value : 'healthy';
}

export function resolveProviderMode(
  requestedMode: MediaProviderMode | undefined,
  allowClientOverride: boolean,
): MediaProviderMode {
  return allowClientOverride && requestedMode ? requestedMode : 'automatic';
}

export function isClientProviderOverrideAllowed(env: RealtimeEnv): boolean {
  return (
    env.ENVIRONMENT === 'development' && parseBoolean(env.ALLOW_CLIENT_PROVIDER_OVERRIDE, false)
  );
}

function hasExplicitPositiveNumber(value: string | undefined): boolean {
  if (!value) return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function hasExplicitPositiveInteger(value: string | undefined): boolean {
  if (!value) return false;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0;
}

function hasExactProductionOrigins(value: string | undefined): boolean {
  if (!value) return false;
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return (
    origins.length > 0 &&
    origins.every((origin) => {
      if (origin === '*' || origin.includes('*')) return false;
      try {
        const parsed = new URL(origin);
        return parsed.protocol === 'https:' && parsed.origin === origin;
      } catch {
        return false;
      }
    })
  );
}

function hasProductionTurnstileHostnames(value: string | undefined): boolean {
  if (!value) return false;
  const hostnames = value
    .split(',')
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);
  return (
    hostnames.length > 0 &&
    hostnames.every(
      (hostname) =>
        !hostname.includes('*') &&
        hostname !== 'localhost' &&
        hostname !== '127.0.0.1' &&
        !hostname.includes('://') &&
        !hostname.includes('/'),
    )
  );
}

export function getProductionConfigurationIssues(
  env: RealtimeEnv,
): readonly ProductionConfigurationIssue[] {
  if (env.ENVIRONMENT !== 'production' || !parseBoolean(env.CLOUDFLARE_ENABLED, true)) return [];

  const issues: ProductionConfigurationIssue[] = [];
  if (!hasExactProductionOrigins(env.ALLOWED_ORIGINS)) issues.push('allowed-origins');
  if (!env.CLOUDFLARE_REALTIME_APP_ID?.trim() || !env.CLOUDFLARE_REALTIME_APP_SECRET?.trim()) {
    issues.push('realtime-credentials');
  }
  if (!hasExplicitPositiveNumber(env.CLOUDFLARE_ACCOUNTING_BITS_PER_SECOND_PER_PULL)) {
    issues.push('accounting-bitrate');
  }
  if (!hasExplicitPositiveNumber(env.CLOUDFLARE_SOFT_BUDGET_BYTES)) issues.push('soft-budget');
  if (!hasExplicitPositiveNumber(env.CLOUDFLARE_HARD_BUDGET_BYTES)) issues.push('hard-budget');
  if (
    hasExplicitPositiveNumber(env.CLOUDFLARE_SOFT_BUDGET_BYTES) &&
    hasExplicitPositiveNumber(env.CLOUDFLARE_HARD_BUDGET_BYTES) &&
    Number(env.CLOUDFLARE_SOFT_BUDGET_BYTES) >= Number(env.CLOUDFLARE_HARD_BUDGET_BYTES)
  ) {
    issues.push('budget-order');
  }
  if (!hasExplicitPositiveInteger(env.CLOUDFLARE_GLOBAL_PULL_CAP)) issues.push('global-pull-cap');
  if (!hasExplicitPositiveInteger(env.CLOUDFLARE_GLOBAL_SESSION_CAP)) {
    issues.push('global-session-cap');
  }
  const leaseSeconds = Number(env.CLOUDFLARE_PULL_LEASE_SECONDS);
  if (!Number.isInteger(leaseSeconds) || leaseSeconds < 30 || leaseSeconds > 45) {
    issues.push('lease-duration');
  }
  if (!env.CLOUDFLARE_BILLING_CYCLE_ID?.trim()) issues.push('billing-cycle-id');
  if (
    !env.CLOUDFLARE_BILLING_CYCLE_START?.trim() ||
    Number.isNaN(Date.parse(env.CLOUDFLARE_BILLING_CYCLE_START))
  ) {
    issues.push('billing-cycle-start');
  }
  if (!env.REALTIME_ADMIN_SECRET || env.REALTIME_ADMIN_SECRET.length < 32) {
    issues.push('admin-secret');
  }
  if (env.ALLOW_CLIENT_PROVIDER_OVERRIDE !== 'false') issues.push('client-provider-override');
  if (env.REQUIRE_TURNSTILE !== 'true') issues.push('turnstile-required');
  if (!env.TURNSTILE_SECRET_KEY?.trim()) issues.push('turnstile-secret');
  if (!hasProductionTurnstileHostnames(env.TURNSTILE_EXPECTED_HOSTNAMES)) {
    issues.push('turnstile-hostnames');
  }
  if (env.TURNSTILE_EXPECTED_ACTION !== 'xama-media-join') issues.push('turnstile-action');
  return issues;
}

export function getRoutingSignals(
  env: RealtimeEnv,
  cloudflareBudgetExcluded: boolean,
): readonly MediaProviderRoutingSignal[] {
  const livekitEnabled = parseBoolean(env.LIVEKIT_ENABLED, true);
  const cloudflareEnabled = parseBoolean(env.CLOUDFLARE_ENABLED, true);
  return [
    {
      provider: 'livekit',
      enabled: livekitEnabled,
      health: parseHealth(env.LIVEKIT_HEALTH),
      exclusions: livekitEnabled ? [] : ['disabled'],
    },
    {
      provider: 'cloudflare',
      enabled: cloudflareEnabled,
      health: parseHealth(env.CLOUDFLARE_HEALTH),
      exclusions: !cloudflareEnabled
        ? ['disabled']
        : cloudflareBudgetExcluded
          ? ['estimated-budget-threshold']
          : [],
    },
  ];
}

export type ResourceLimits = Readonly<{
  maxParticipantsPerRoom: number;
  maxScreenSharesPerParticipant: number;
  maxScreenSharesPerRoom: number;
  maxRemotePullsPerParticipant: number;
  maxRemotePullsPerRoom: number;
}>;

export function getResourceLimits(env: RealtimeEnv): ResourceLimits {
  return {
    maxParticipantsPerRoom: parsePositiveInteger(env.MAX_PARTICIPANTS_PER_ROOM, 12),
    maxScreenSharesPerParticipant: parsePositiveInteger(env.MAX_SCREEN_SHARES_PER_PARTICIPANT, 1),
    maxScreenSharesPerRoom: parsePositiveInteger(env.MAX_SCREEN_SHARES_PER_ROOM, 4),
    maxRemotePullsPerParticipant: parsePositiveInteger(env.MAX_REMOTE_PULLS_PER_PARTICIPANT, 4),
    maxRemotePullsPerRoom: parsePositiveInteger(env.MAX_REMOTE_PULLS_PER_ROOM, 24),
  };
}
