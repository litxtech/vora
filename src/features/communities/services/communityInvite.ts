import { DISCOVERY_USER_SEARCH_MIN_LENGTH } from '@/features/discovery/constants';
import { searchDiscoverUsers } from '@/features/discovery/services/userSearch';
import { fetchFriendsList } from '@/features/profile/services/friendship';
import type { CommunityMember } from '@/features/communities/types';

export type InvitableUser = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
};

function memberIdSet(members: CommunityMember[]): Set<string> {
  return new Set(members.map((m) => m.userId));
}

function excludeMembers(users: InvitableUser[], memberIds: Set<string>): InvitableUser[] {
  return users.filter((u) => !memberIds.has(u.id));
}

export async function fetchInvitableFriends(
  userId: string,
  members: CommunityMember[],
  search = '',
): Promise<InvitableUser[]> {
  const friends = await fetchFriendsList(userId, userId, search);
  return excludeMembers(
    friends.map((f) => ({
      id: f.id,
      username: f.username,
      fullName: f.fullName,
      avatarUrl: f.avatarUrl,
    })),
    memberIdSet(members),
  );
}

export async function searchInvitableUsers(
  query: string,
  members: CommunityMember[],
  excludeUserId: string | null,
): Promise<InvitableUser[]> {
  const q = query.trim();
  if (q.length < DISCOVERY_USER_SEARCH_MIN_LENGTH) return [];

  const results = await searchDiscoverUsers(q);
  const memberIds = memberIdSet(members);
  if (excludeUserId) memberIds.add(excludeUserId);

  return excludeMembers(
    results.map((r) => ({
      id: r.id,
      username: r.username,
      fullName: r.fullName,
      avatarUrl: r.avatarUrl,
    })),
    memberIds,
  );
}
