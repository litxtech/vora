import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FeedMediaPreview, resolveSharedMediaUrl } from '@/components/media/FeedMediaPreview';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { useChatMediaViewer } from '../context/ChatMediaViewerContext';
import { ChatSharedAuthorRow } from './ChatSharedAuthorRow';
import { ChatSharedMarketplaceListingCard } from './ChatSharedMarketplaceListingCard';
import { ChatSharedPersonnelListingCard } from './ChatSharedPersonnelListingCard';
import { ChatSharedReelCard } from './ChatSharedReelCard';
import { navigateToSharedCard } from '../services/sharedCardNavigation';
import type { ChatMessage } from '../types';

type ChatSharedCardProps = {
  message: ChatMessage;
  isMine: boolean;
  textColor: string;
  metaColor: string;
  primaryColor: string;
  viewerId: string | null;
};

export function ChatSharedCard({
  message,
  isMine,
  textColor,
  metaColor,
  primaryColor,
  viewerId,
}: ChatSharedCardProps) {
  if (message.messageType === 'shared_reel') {
    return (
      <ChatSharedReelCard
        message={message}
        textColor={textColor}
        metaColor={metaColor}
      />
    );
  }

  if (message.messageType === 'shared_marketplace_listing') {
    return (
      <ChatSharedMarketplaceListingCard
        message={message}
        textColor={textColor}
        metaColor={metaColor}
        viewerId={viewerId}
      />
    );
  }

  if (message.messageType === 'shared_job_listing' || message.messageType === 'shared_staff_listing') {
    return (
      <ChatSharedPersonnelListingCard
        message={message}
        textColor={textColor}
        metaColor={metaColor}
        viewerId={viewerId}
      />
    );
  }

  const { openMedia } = useChatMediaViewer();
  const sharedMediaUrl = resolveSharedMediaUrl(message.metadata);
  const sharedLabel =
    message.messageType === 'shared_vora_need'
        ? 'İhtiyaç Ağı'
        : message.messageType === 'shared_post'
        ? 'Gönderi'
        : message.messageType === 'shared_reel'
          ? 'Reel'
          : 'Profil';
  const showPlayIcon =
    message.messageType === 'shared_reel' ||
    message.metadata?.mediaType === 'video' ||
    (sharedMediaUrl ? isVideoUrl(sharedMediaUrl) : false);

  const openDetail = () => navigateToSharedCard(message, viewerId);

  return (
    <View style={styles.card}>
      {sharedMediaUrl ? (
        <>
          <FeedMediaPreview
            url={sharedMediaUrl}
            style={styles.media}
            resizeMode="cover"
            showPlayIcon={showPlayIcon}
            onPress={() => openMedia(sharedMediaUrl, { isVideo: showPlayIcon })}
          />
          <Pressable style={styles.info} onPress={openDetail}>
            <ChatSharedAuthorRow
              metadata={message.metadata}
              textColor={textColor}
              metaColor={metaColor}
            />
            <Text variant="caption" style={{ color: metaColor }}>
              {sharedLabel}
            </Text>
            <Text style={{ color: textColor, fontWeight: '600' }} numberOfLines={2}>
              {message.metadata?.title?.trim() || message.content}
            </Text>
            {message.metadata?.preview ? (
              <Text variant="caption" style={{ color: metaColor }}>
                {message.metadata.preview}
              </Text>
            ) : null}
            {message.messageType === 'shared_vora_need' &&
            message.content &&
            message.content !== message.metadata?.title ? (
              <Text style={{ color: textColor }} numberOfLines={3}>
                {message.content}
              </Text>
            ) : null}
          </Pressable>
        </>
      ) : (
        <Pressable style={styles.row} onPress={openDetail}>
          {message.metadata?.avatarUrl || message.metadata?.username || message.metadata?.fullName ? (
            <ChatSharedAuthorRow
              metadata={message.metadata}
              textColor={textColor}
              metaColor={metaColor}
              avatarSize={36}
            />
          ) : (
            <Ionicons
              name={
                message.messageType === 'shared_vora_need'
                  ? 'hand-left-outline'
                  : message.messageType === 'shared_reel'
                    ? 'play-circle-outline'
                    : message.messageType === 'shared_profile'
                      ? 'person-circle-outline'
                      : 'document-text-outline'
              }
              size={24}
              color={isMine ? '#fff' : primaryColor}
            />
          )}
          <View style={styles.infoInline}>
            <Text variant="caption" style={{ color: metaColor }}>
              {sharedLabel}
            </Text>
            <Text style={{ color: textColor }} numberOfLines={2}>
              {message.metadata?.title?.trim() || message.content}
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    maxWidth: 240,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 2,
  },
  media: {
    width: '100%',
    height: 140,
    borderRadius: 0,
  },
  info: {
    padding: spacing.sm,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  infoInline: {
    flexShrink: 1,
    gap: 2,
  },
});
