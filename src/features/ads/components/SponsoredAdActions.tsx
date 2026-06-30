import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { LikersSheet } from '@/features/feed/components/LikersSheet';
import { togglePostLike } from '@/features/feed/services/engagement';
import type { FeedItem } from '@/features/feed/types';
import { formatCount } from '@/features/feed/utils';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type SponsoredAdActionsProps = {
  item: FeedItem;
  engagementPostId: string | null;
  onUpdate: (patch: Partial<FeedItem>) => void;
  onCommentPress: () => void;
  accent?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const ICON_SIZE = 20;
const LIKE_LONG_PRESS_MS = 1000;
const HIT_SLOP = { top: 6, bottom: 6, left: 4, right: 4 };

export function SponsoredAdActions({
  item,
  engagementPostId,
  onUpdate,
  onCommentPress,
  accent,
}: SponsoredAdActionsProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const scale = useSharedValue(1);
  const likeInFlight = useRef(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const actionAccent = accent ?? colors.primary;

  const likeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleLike = async () => {
    if (!engagementPostId) return;
    if (!(await requireAuth('Beğeni'))) return;
    if (!user || likeInFlight.current) return;

    const wasLiked = item.isLiked;
    const nextLiked = !wasLiked;
    likeInFlight.current = true;
    onUpdate({
      isLiked: nextLiked,
      likeCount: item.likeCount + (nextLiked ? 1 : -1),
    });

    if (nextLiked) {
      scale.value = withSequence(withSpring(1.3), withSpring(1));
    }

    try {
      const { error } = await togglePostLike(engagementPostId, user.id, wasLiked);
      if (error) {
        onUpdate({ isLiked: wasLiked, likeCount: item.likeCount });
        Alert.alert('Hata', 'Beğeni kaydedilemedi.');
      }
    } finally {
      likeInFlight.current = false;
    }
  };

  const handleShowLikers = () => {
    if (!engagementPostId || item.likeCount <= 0) return;
    setLikersOpen(true);
  };

  const renderAction = (
    key: string,
    icon: keyof typeof Ionicons.glyphMap,
    color: string,
    onPress: () => void,
    count?: number,
    animated = false,
    onLongPress?: () => void,
  ) => {
    const inner = (
      <>
        <Ionicons name={icon} size={ICON_SIZE} color={color} />
        {count && count > 0 ? (
          <Text variant="caption" style={[styles.count, { color: colors.textMuted }]}>
            {formatCount(count)}
          </Text>
        ) : null}
      </>
    );

    if (animated) {
      return (
        <AnimatedPressable
          key={key}
          style={[styles.action, likeStyle]}
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={LIKE_LONG_PRESS_MS}
          hitSlop={HIT_SLOP}
        >
          {inner}
        </AnimatedPressable>
      );
    }

    return (
      <Pressable
        key={key}
        style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        onPress={onPress}
        onLongPress={onLongPress}
        hitSlop={HIT_SLOP}
      >
        {inner}
      </Pressable>
    );
  };

  return (
    <>
      <View style={styles.bar}>
        {renderAction(
          'comment',
          'chatbubble-outline',
          actionAccent,
          onCommentPress,
          item.commentCount,
        )}
        {renderAction(
          'like',
          item.isLiked ? 'heart' : 'heart-outline',
          item.isLiked ? colors.danger : actionAccent,
          handleLike,
          item.likeCount,
          true,
          handleShowLikers,
        )}
      </View>

      {engagementPostId ? (
        <LikersSheet
          visible={likersOpen}
          targetType="post"
          targetId={engagementPostId}
          likeCount={item.likeCount}
          onClose={() => setLikersOpen(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 32,
  },
  actionPressed: { opacity: 0.55 },
  count: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 12,
  },
});
