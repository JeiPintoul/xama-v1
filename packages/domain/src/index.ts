export type ChannelType = 'text' | 'voice';

export type Channel = Readonly<{
  id: string;
  name: string;
  description: string;
  type: ChannelType;
}>;

export type Community = Readonly<{
  id: string;
  name: string;
  description: string;
  channels: readonly Channel[];
}>;

export type NavigationMode = 'automatic' | 'simplified' | 'modular';

export type ResolvedNavigationMode = Exclude<NavigationMode, 'automatic'>;

const AUTOMATIC_MODULAR_CHANNEL_THRESHOLD = 7;

export function resolveNavigationMode(
  requestedMode: NavigationMode,
  community: Community,
): ResolvedNavigationMode {
  if (requestedMode !== 'automatic') {
    return requestedMode;
  }

  return community.channels.length >= AUTOMATIC_MODULAR_CHANNEL_THRESHOLD
    ? 'modular'
    : 'simplified';
}
