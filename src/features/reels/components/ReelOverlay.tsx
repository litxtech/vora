import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { UserBadge } from '@/features/feed/components/UserBadge';
import { FollowButton } from '@/features/feed/components/FollowButton';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { formatCount } from '@/features/feed/utils';
import { toggleReelLike } from '@/features/reels/services/reelsEngagement';
import type { ReelItem } from '@/features/reels/types';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

type ReelOverlayProps = {
  item: ReelItem;
  onUpdate: (patch: Partial<ReelItem>) => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ReelOverlay({ item, onUpdate }: ReelOverlayProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const scale = useSharedValue(1);

  const likeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleLike = async () => {
    if (!requireAuth('Beğeni')) return;
    if (!user) return;

    const next = !item.isLiked;
    onUpdate({ isLiked: next, likeCount: item.likeCount + (next ? 1 : -1) });
    if (next) scale.value = withSequence(withSpring(1.4), withSpring(1));

    const { error } = await toggleReelLike(item.id, user.id, item.isLiked);
    if (error) onUpdate({ isLiked: item.isLiked, likeCount: item.likeCount });
  };

  const handleShare = () => {
    Share.share({ message: `${item.caption}\n\nVora Reels` });
  };

  return (
    <View style={[styles.overlay, { paddingBottom: insets.bottom + 80 }]}>
      <View style={styles.sideActions}>
        <AnimatedPressable style={[styles.actionBtn, likeStyle]} onPress={handleLike}>
          <Ionicons
            name={item.isLiked ? 'heart' : 'heart-outline'}
            size={30}
            color={item.isLiked ? '#EF5350' : '#fff'}
          />
          <Text variant="caption" style={styles.actionLabel}>
            {formatCount(item.likeCount)}
          </Text>
        </AnimatedPressable>

        <Pressable
          style={styles.actionBtn}
          onPress={() => requireAuth('Yorum') && Alert.alert('Yorumlar', 'Reel yorumları yakında.')}
        >
          <Ionicons name="chatbubble-outline" size={28} color="#fff" />
          <Text variant="caption" style={styles.actionLabel}>
            {formatCount(item.commentCount)}
          </Text>
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={28} color="#fff" />
        </Pressable>

        <Pressable
          style={styles.actionBtn}
          onPress={() => requireAuth('Kaydetme') && Alert.alert('Kaydedildi', 'Reel kaydedildi.')}
        >
          <Ionicons name="bookmark-outline" size={26} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.bottomInfo}>
        <View style={styles.authorRow}>
          <UserBadge author={item.author} />
          <FollowButton
            authorId={item.author.id}
            isFollowing={item.isFollowing}
            onToggle={(next) => onUpdate({ isFollowing: next })}
          />
        </View>

        {item.locationLabel ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#fff" />
            <Text variant="caption" style={styles.caption}>
              {item.locationLabel}
              {item.district ? ` · ${item.district}` : ''}
            </Text>
          </View>
        ) : null}

        {item.caption ? (
          <Text style={styles.caption} numberOfLines={3}>
            {item.caption}
          </Text>
        ) : null}

        <Text variant="caption" style={styles.views}>
          {formatCount(item.viewCount)} görüntülenme
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
  },
  sideActions: {
    position: 'absolute',
    right: spacing.md,
    bottom: 160,
    alignItems: 'center',
    gap: spacing.lg,
  },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionLabel: { color: '#fff', fontWeight: '600' },
  bottomInfo: { gap: spacing.sm, paddingRight: 64 },
  authorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  caption: { color: '#fff', fontSize: 14, lineHeight: 20 },
  views: { color: 'rgba(255,255,255,0.7)' },
});
