import { memo, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { openChat } from '../services/messagingNavigation';
import { prefetchConversationForOpen } from '../services/conversationOpenPrefetch';
import { showConversationActions } from '../utils/conversationActions';
import { useMessagingStore } from '../store/messagingStore';
import type { ConversationListItem } from '../types';
import { ConversationRow } from './ConversationRow';

type InboxConversationRowProps = {
  item: ConversationListItem;
  showArchived: boolean;
  onChanged: () => void;
  onOpen?: (item: ConversationListItem, unread: number) => void;
};

export const InboxConversationRow = memo(function InboxConversationRow({
  item,
  showArchived,
  onChanged,
  onOpen,
}: InboxConversationRowProps) {
  const { user } = useAuth();
  const draftText = useMessagingStore((s) => s.draftByConversationId[item.id]);
  const unread = useMessagingStore((s) => s.getDisplayUnread(item.id, item.unreadCount));

  const handlePressIn = useCallback(() => {
    if (user?.id) {
      void prefetchConversationForOpen(item.id, user.id);
    }
  }, [item.id, user?.id]);

  const handlePress = useCallback(() => {
    if (onOpen) {
      onOpen(item, unread);
      return;
    }
    openChat(item.id, {
      unreadCount: unread,
      userId: user?.id,
    });
  }, [item, unread, user?.id, onOpen]);

  const handleLongPress = useCallback(() => {
    showConversationActions({
      item,
      archivedView: showArchived,
      onChanged,
    });
  }, [item, showArchived, onChanged]);

  return (
    <ConversationRow
      item={item}
      unreadCount={unread}
      draftText={draftText}
      onPressIn={user?.id ? handlePressIn : undefined}
      onPress={handlePress}
      onLongPress={handleLongPress}
    />
  );
});
