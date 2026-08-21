import type { Channel, Community } from '@xama/domain';

import { defaultNavigation, mockCommunities } from '@/features/navigation/mock-navigation';

export type NavigationSelection = Readonly<{
  community: Community;
  channel: Channel;
}>;

export type ModularNavigationSection = Channel['type'] | 'activity';

export function getDefaultChannel(community: Community): Channel {
  const channel =
    community.channels.find((candidate) => candidate.type === 'text') ?? community.channels[0];

  if (!channel) {
    throw new Error(`Community "${community.id}" must contain at least one channel.`);
  }

  return channel;
}

export function getChannelPath(community: Community, channel: Channel): string {
  return `/communities/${community.id}/channels/${channel.id}`;
}

export const defaultNavigationPath = getChannelPath(
  defaultNavigation.community,
  defaultNavigation.channel,
);

export function resolveNavigation(
  communityId: string | undefined,
  channelId: string | undefined,
): NavigationSelection {
  const community =
    mockCommunities.find((candidate) => candidate.id === communityId) ??
    defaultNavigation.community;
  const channel =
    community.channels.find((candidate) => candidate.id === channelId) ??
    getDefaultChannel(community);

  return { community, channel };
}
