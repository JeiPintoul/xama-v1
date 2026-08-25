export type MediaProviderId = 'livekit' | 'cloudflare' | 'p2p';

export type MediaProviderMode = 'automatic' | 'livekit' | 'cloudflare';

export type MediaPerformanceState = 'healthy' | 'constrained' | 'unknown';

export type MediaPerformanceConstraint = 'cpu' | 'encoder' | 'bandwidth' | 'network';

export type MediaPerformanceSignal = Readonly<{
  state: MediaPerformanceState;
  constraints?: readonly MediaPerformanceConstraint[];
}>;

export type MediaProviderExclusion =
  'disabled' | 'quota-exhausted' | 'degraded' | 'estimated-budget-threshold';

export type MediaProviderRoutingSignal = Readonly<{
  provider: Exclude<MediaProviderId, 'p2p'>;
  enabled: boolean;
  health: 'healthy' | 'degraded' | 'unknown';
  exclusions?: readonly MediaProviderExclusion[];
  performance?: MediaPerformanceSignal;
}>;

export type MediaProviderSelection =
  | Readonly<{
      status: 'selected';
      provider: Exclude<MediaProviderId, 'p2p'>;
      reason: 'pinned' | 'explicit' | 'automatic-preferred' | 'automatic-fallback';
    }>
  | Readonly<{
      status: 'unavailable';
      reason: 'requested-provider-unavailable' | 'no-provider-available';
    }>;

export type SelectMediaProviderRequest = Readonly<{
  mode: MediaProviderMode;
  existingProvider?: Exclude<MediaProviderId, 'p2p'>;
  providers: readonly MediaProviderRoutingSignal[];
}>;

function isAvailable(signal: MediaProviderRoutingSignal | undefined): boolean {
  return Boolean(
    signal?.enabled &&
    signal.health !== 'degraded' &&
    !signal.exclusions?.some((exclusion) =>
      ['disabled', 'quota-exhausted', 'degraded', 'estimated-budget-threshold'].includes(exclusion),
    ),
  );
}

export function selectMediaProvider({
  mode,
  existingProvider,
  providers,
}: SelectMediaProviderRequest): MediaProviderSelection {
  if (existingProvider) {
    return { status: 'selected', provider: existingProvider, reason: 'pinned' };
  }

  const signals = new Map(providers.map((signal) => [signal.provider, signal]));

  if (mode !== 'automatic') {
    return isAvailable(signals.get(mode))
      ? { status: 'selected', provider: mode, reason: 'explicit' }
      : { status: 'unavailable', reason: 'requested-provider-unavailable' };
  }

  if (isAvailable(signals.get('livekit'))) {
    return { status: 'selected', provider: 'livekit', reason: 'automatic-preferred' };
  }

  if (isAvailable(signals.get('cloudflare'))) {
    return { status: 'selected', provider: 'cloudflare', reason: 'automatic-fallback' };
  }

  return { status: 'unavailable', reason: 'no-provider-available' };
}
