import type {
  ChatMessage,
  ConversationDetail,
  ConversationMember,
  MessagingParticipant,
} from '../types';

function memberToParticipant(member: ConversationMember): MessagingParticipant {
  return {
    id: member.userId,
    username: member.username,
    full_name: member.fullName,
    avatar_url: member.avatarUrl,
  };
}

function resolveKnownSender(
  senderId: string,
  conversation: ConversationDetail | null,
): MessagingParticipant | undefined {
  if (!conversation) return undefined;
  if (conversation.otherUser?.id === senderId) return conversation.otherUser;
  const member = conversation.members.find((m) => m.userId === senderId);
  return member ? memberToParticipant(member) : undefined;
}

function resolveKnownReply(
  replyToId: string,
  existingMessages: ChatMessage[],
): ChatMessage['replyTo'] | undefined {
  const target = existingMessages.find((m) => m.id === replyToId);
  if (!target || target.deletedForAll) return undefined;
  return {
    id: target.id,
    content: target.content,
    senderId: target.senderId,
    messageType: target.messageType,
    sender: target.sender,
  };
}

export function resolveGroupMessageSender(
  message: ChatMessage,
  conversation: ConversationDetail | null,
): MessagingParticipant | undefined {
  if (message.sender) return message.sender;
  return resolveKnownSender(message.senderId, conversation);
}

/** Realtime satırını yerel bağlamla zenginleştirir — sonradan layout sıçramasını azaltır. */
export function enrichIncomingMessage(
  message: ChatMessage,
  context: {
    conversation: ConversationDetail | null;
    existingMessages: ChatMessage[];
  },
): ChatMessage {
  let next = message;

  if (!next.sender) {
    const sender = resolveKnownSender(next.senderId, context.conversation);
    if (sender) next = { ...next, sender };
  }

  if (next.replyToId && !next.replyTo) {
    const replyTo = resolveKnownReply(next.replyToId, context.existingMessages);
    if (replyTo) next = { ...next, replyTo };
  }

  return next;
}

export function messageNeedsRemoteHydration(message: ChatMessage): boolean {
  if (!message.sender) return true;
  if (message.replyToId && !message.replyTo) return true;
  if (message.forwardedFromId && !message.forwardedFrom) return true;
  return false;
}

export function isMessageHydrationIncomplete(
  existing: ChatMessage,
  hydrated: ChatMessage,
): boolean {
  if (!existing.mediaUrl && hydrated.mediaUrl) return true;
  if (!existing.replyTo && hydrated.replyTo) return true;
  if (!existing.sender && hydrated.sender) return true;
  if (!existing.forwardedFrom && hydrated.forwardedFrom) return true;
  if (!existing.metadata && hydrated.metadata) return true;
  if (!existing.reactions?.length && hydrated.reactions?.length) return true;
  return false;
}

export function mergeHydratedMessage(
  existing: ChatMessage,
  hydrated: ChatMessage,
): ChatMessage {
  return {
    ...existing,
    content: hydrated.deletedForAll ? hydrated.content : existing.content || hydrated.content,
    mediaUrl: existing.mediaUrl ?? hydrated.mediaUrl,
    messageType: hydrated.messageType ?? existing.messageType,
    replyToId: hydrated.replyToId ?? existing.replyToId,
    replyTo: existing.replyTo ?? hydrated.replyTo,
    forwardedFromId: hydrated.forwardedFromId ?? existing.forwardedFromId,
    forwardedFrom: existing.forwardedFrom ?? hydrated.forwardedFrom,
    editedAt: hydrated.editedAt ?? existing.editedAt,
    deletedForAll: hydrated.deletedForAll,
    isRead: hydrated.isRead,
    sender: existing.sender ?? hydrated.sender,
    metadata: hydrated.metadata ?? existing.metadata,
    reactions: existing.reactions?.length ? existing.reactions : hydrated.reactions,
    localStatus: existing.localStatus ?? hydrated.localStatus,
    localOnly: existing.localOnly,
    queued: existing.queued,
    localMediaUri: existing.localMediaUri ?? hydrated.localMediaUri,
    uploadStage: existing.uploadStage ?? hydrated.uploadStage,
    uploadProgress: existing.uploadProgress ?? hydrated.uploadProgress,
    uploadEtaSec: existing.uploadEtaSec ?? hydrated.uploadEtaSec,
  };
}
