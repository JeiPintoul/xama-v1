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
