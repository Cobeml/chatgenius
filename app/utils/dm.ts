/**
 * Generates a consistent channel ID for a DM conversation between two users.
 * The channel ID is in the format dm_user1_user2 where user1 and user2 are sorted alphabetically.
 */
export function getDMChannelId(user1: string, user2: string): string {
  const sortedUsers = [user1.toLowerCase(), user2.toLowerCase()].sort();
  return `dm_${sortedUsers[0]}_${sortedUsers[1]}`;
}

/**
 * Checks if a channel ID represents a DM conversation.
 */
export function isDMChannel(channelId: string): boolean {
  return channelId.startsWith('dm_');
}

/**
 * Extracts the participant user IDs from a DM channel ID.
 * Returns undefined if the channel ID is not a valid DM channel.
 */
export function getDMParticipants(channelId: string): string[] | undefined {
  if (!isDMChannel(channelId)) return undefined;
  const [, ...users] = channelId.split('_');
  return users;
}

/**
 * Gets the other participant in a DM conversation.
 * Returns undefined if the channel ID is not a valid DM channel.
 */
export function getOtherParticipant(channelId: string, currentUser: string): string | undefined {
  const participants = getDMParticipants(channelId);
  if (!participants) return undefined;
  return participants.find(user => user.toLowerCase() !== currentUser.toLowerCase());
}

/**
 * Gets a display name for a DM channel.
 * For the current user, this will show the other participant's name/email.
 */
export function getDMDisplayName(channelId: string, currentUser: string): string | undefined {
  const otherUser = getOtherParticipant(channelId, currentUser);
  if (!otherUser) return undefined;
  return otherUser;
} 