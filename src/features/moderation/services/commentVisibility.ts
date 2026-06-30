import type { FeedComment } from '@/features/feed/types';

export function shouldShowRestrictedComment(
  commentAuthorId: string,
  postAuthorId: string | null | undefined,
  viewerId: string | null,
  restrictedIds: Set<string>,
): boolean {
  if (!restrictedIds.has(commentAuthorId)) return true;
  if (!viewerId) return false;
  if (viewerId === commentAuthorId) return true;
  if (postAuthorId && viewerId === postAuthorId) return true;
  return false;
}

export function filterRestrictedComments(
  comments: FeedComment[],
  postAuthorId: string | null | undefined,
  viewerId: string | null,
  restrictedIds: Set<string>,
): FeedComment[] {
  return comments
    .filter((c) => shouldShowRestrictedComment(c.author.id, postAuthorId, viewerId, restrictedIds))
    .map((c) => ({
      ...c,
      replies: c.replies
        ? filterRestrictedComments(c.replies, postAuthorId, viewerId, restrictedIds)
        : [],
    }));
}
