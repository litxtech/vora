export type StoryReplyMetadata = {
  type: 'story_reply';
  storyItemId: string;
  storyThumbUrl: string | null;
  storyMediaUrl: string | null;
  storyMediaType: 'image' | 'video';
  storyAuthorUsername: string;
  storyAuthorId?: string | null;
};

export function parseStoryReplyMetadata(metadata: unknown): StoryReplyMetadata | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const row = metadata as Record<string, unknown>;
  if (row.type !== 'story_reply') return null;
  if (typeof row.storyItemId !== 'string' || !row.storyItemId) return null;

  const mediaType = row.storyMediaType === 'video' ? 'video' : 'image';

  return {
    type: 'story_reply',
    storyItemId: row.storyItemId,
    storyThumbUrl: typeof row.storyThumbUrl === 'string' ? row.storyThumbUrl : null,
    storyMediaUrl: typeof row.storyMediaUrl === 'string' ? row.storyMediaUrl : null,
    storyMediaType: mediaType,
    storyAuthorUsername:
      typeof row.storyAuthorUsername === 'string' ? row.storyAuthorUsername : 'kullanıcı',
    storyAuthorId: typeof row.storyAuthorId === 'string' ? row.storyAuthorId : null,
  };
}

export function isStoryReplyMessage(message: {
  messageType: string;
  metadata?: unknown;
}): boolean {
  return message.messageType === 'text' && parseStoryReplyMetadata(message.metadata) !== null;
}
