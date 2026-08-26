import { selectMediaProvider } from '@xama/media-core';
import { describe, expect, it } from 'vitest';

import {
  getProductionConfigurationIssues,
  getRoutingSignals,
  isClientProviderOverrideAllowed,
  resolveProviderMode,
  type RealtimeEnv,
} from '../src/runtime-config';

const validProductionEnvironment = {
  ENVIRONMENT: 'production',
  CLOUDFLARE_ENABLED: 'true',
  ALLOWED_ORIGINS: 'https://xama.example,https://preview.xama.example',
  CLOUDFLARE_REALTIME_APP_ID: 'app-id',
  CLOUDFLARE_REALTIME_APP_SECRET: 'app-secret',
  CLOUDFLARE_ACCOUNTING_BITS_PER_SECOND_PER_PULL: '12000000',
  CLOUDFLARE_SOFT_BUDGET_BYTES: '536870912000',
  CLOUDFLARE_HARD_BUDGET_BYTES: '644245094400',
  CLOUDFLARE_GLOBAL_PULL_CAP: '24',
  CLOUDFLARE_GLOBAL_SESSION_CAP: '64',
  CLOUDFLARE_PULL_LEASE_SECONDS: '40',
  CLOUDFLARE_BILLING_CYCLE_ID: 'billing-cycle-2026-08',
  CLOUDFLARE_BILLING_CYCLE_START: '2026-08-01T00:00:00Z',
  REALTIME_ADMIN_SECRET: 'a'.repeat(32),
  ALLOW_CLIENT_PROVIDER_OVERRIDE: 'false',
  REQUIRE_TURNSTILE: 'true',
  TURNSTILE_SECRET_KEY: 'turnstile-secret',
  TURNSTILE_EXPECTED_HOSTNAMES: 'xama.example,preview.xama.example',
  TURNSTILE_EXPECTED_ACTION: 'xama-media-join',
} satisfies Partial<RealtimeEnv>;

describe('provider override authorization', () => {
  it('ignores a client Cloudflare override unless the server explicitly enables it', () => {
    expect(resolveProviderMode('cloudflare', false)).toBe('automatic');
    expect(resolveProviderMode('cloudflare', true)).toBe('cloudflare');
  });

  it('ignores a client LiveKit override unless the server explicitly enables it', () => {
    expect(resolveProviderMode('livekit', false)).toBe('automatic');
    expect(resolveProviderMode('livekit', true)).toBe('livekit');
  });

  it('never enables the client override in a production-like environment', () => {
    expect(
      isClientProviderOverrideAllowed({
        ENVIRONMENT: 'production',
        ALLOW_CLIENT_PROVIDER_OVERRIDE: 'true',
      } as RealtimeEnv),
    ).toBe(false);
    expect(
      isClientProviderOverrideAllowed({
        ENVIRONMENT: 'development',
        ALLOW_CLIENT_PROVIDER_OVERRIDE: 'true',
      } as RealtimeEnv),
    ).toBe(true);
  });

  it('excludes Cloudflare from a new automatic room at the soft budget limit', () => {
    const signals = getRoutingSignals(
      {
        LIVEKIT_ENABLED: 'false',
        CLOUDFLARE_ENABLED: 'true',
      } as RealtimeEnv,
      true,
    );

    expect(selectMediaProvider({ mode: 'automatic', providers: signals })).toEqual({
      status: 'unavailable',
      reason: 'no-provider-available',
    });
  });

  it('keeps an existing Cloudflare room pinned even when new rooms are budget-excluded', () => {
    const signals = getRoutingSignals(
      {
        LIVEKIT_ENABLED: 'true',
        CLOUDFLARE_ENABLED: 'true',
      } as RealtimeEnv,
      true,
    );

    expect(
      selectMediaProvider({
        mode: 'automatic',
        existingProvider: 'cloudflare',
        providers: signals,
      }),
    ).toMatchObject({ status: 'selected', provider: 'cloudflare', reason: 'pinned' });
  });
});

describe('production Cloudflare configuration', () => {
  it('accepts only an intentionally complete production configuration', () => {
    expect(
      getProductionConfigurationIssues(validProductionEnvironment as RealtimeEnv),
    ).toEqual([]);
  });

  it.each([
    ['ALLOWED_ORIGINS', 'allowed-origins'],
    ['CLOUDFLARE_REALTIME_APP_ID', 'realtime-credentials'],
    ['CLOUDFLARE_REALTIME_APP_SECRET', 'realtime-credentials'],
    ['CLOUDFLARE_ACCOUNTING_BITS_PER_SECOND_PER_PULL', 'accounting-bitrate'],
    ['CLOUDFLARE_SOFT_BUDGET_BYTES', 'soft-budget'],
    ['CLOUDFLARE_HARD_BUDGET_BYTES', 'hard-budget'],
    ['CLOUDFLARE_GLOBAL_PULL_CAP', 'global-pull-cap'],
    ['CLOUDFLARE_GLOBAL_SESSION_CAP', 'global-session-cap'],
    ['CLOUDFLARE_PULL_LEASE_SECONDS', 'lease-duration'],
    ['CLOUDFLARE_BILLING_CYCLE_ID', 'billing-cycle-id'],
    ['CLOUDFLARE_BILLING_CYCLE_START', 'billing-cycle-start'],
    ['REALTIME_ADMIN_SECRET', 'admin-secret'],
    ['ALLOW_CLIENT_PROVIDER_OVERRIDE', 'client-provider-override'],
    ['REQUIRE_TURNSTILE', 'turnstile-required'],
    ['TURNSTILE_SECRET_KEY', 'turnstile-secret'],
    ['TURNSTILE_EXPECTED_HOSTNAMES', 'turnstile-hostnames'],
    ['TURNSTILE_EXPECTED_ACTION', 'turnstile-action'],
  ] as const)('fails closed when %s is missing', (key, issue) => {
    const environment: Record<string, unknown> = { ...validProductionEnvironment };
    delete environment[key];

    expect(getProductionConfigurationIssues(environment as unknown as RealtimeEnv)).toContain(
      issue,
    );
  });
});
