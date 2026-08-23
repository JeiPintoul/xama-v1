export function getVoiceRoomName(communityId: string, voiceChannelId: string): string {
  return `${communityId}:${voiceChannelId}`;
}
