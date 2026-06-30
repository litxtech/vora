import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { ANNOUNCEMENT_CARD_HEIGHT, ANNOUNCEMENT_CARD_WIDTH } from '@/features/announcements/constants';
import type { Announcement } from '@/features/announcements/types';
import { radius, spacing } from '@/constants/theme';

type Props = {
  announcement: Announcement;
  onPress: (announcement: Announcement) => void;
};

function withAlpha(hex: string, alpha: string): string {
  return `${hex}${alpha}`;
}

export const AnnouncementCard = memo(function AnnouncementCard({ announcement, onPress }: Props) {
  const { accent, media, mediaType, mediaUrl, thumbnailUrl, title, authorName, isPinned } = announcement;

  const first = media[0];
  const firstIsVideo = first ? first.type === 'video' : mediaType === 'video';
  const previewUri = first
    ? first.type === 'image'
      ? first.url
      : first.thumbnailUrl
    : (thumbnailUrl ?? (mediaType === 'image' ? mediaUrl : null));
  const hasMedia = Boolean(previewUri);
  const mediaCount = media.length;

  return (
    <Pressable
      onPress={() => onPress(announcement)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Duyuru: ${title}`}
    >
      {hasMedia ? (
        <Image
          source={{ uri: previewUri! }}
          style={styles.media}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={120}
          recyclingKey={announcement.id}
        />
      ) : (
        <LinearGradient
          colors={[accent, withAlpha(accent, 'BB'), '#0B1220']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}

      <LinearGradient
        colors={['rgba(8,12,20,0.0)', 'rgba(8,12,20,0.35)', 'rgba(8,12,20,0.9)']}
        locations={[0.25, 0.6, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.topRow}>
        <View style={[styles.badge, { backgroundColor: withAlpha(accent, 'F0') }]}>
          <Ionicons name={isPinned ? 'megaphone' : 'sparkles'} size={9} color="#fff" />
          <Text variant="caption" style={styles.badgeText} numberOfLines={1}>
            {authorName?.trim() || 'Duyuru'}
          </Text>
        </View>
        <View style={styles.topRight}>
          {mediaCount > 1 ? (
            <View style={styles.countPill}>
              <Ionicons name="albums" size={9} color="#fff" />
              <Text variant="caption" style={styles.countText}>
                {mediaCount}
              </Text>
            </View>
          ) : null}
          {firstIsVideo ? (
            <View style={styles.playPill}>
              <Ionicons name="play" size={9} color="#fff" />
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.bottom}>
        <Text variant="caption" style={styles.title} numberOfLines={2}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    width: ANNOUNCEMENT_CARD_WIDTH,
    height: ANNOUNCEMENT_CARD_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#0B1220',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  media: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: ANNOUNCEMENT_CARD_WIDTH,
    height: ANNOUNCEMENT_CARD_HEIGHT,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    maxWidth: '80%',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 9,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  countText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 9,
  },
  playPill: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottom: {
    padding: 8,
  },
  title: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 15,
  },
});
