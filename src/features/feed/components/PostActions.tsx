import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import {
  togglePostLike,
  togglePostSave,
} from '@/features/feed/services/engagement';
import type { FeedItem } from '@/features/feed/types';
import { formatCount } from '@/features/feed/utils';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

type PostActionsProps = {
  item: FeedItem;
  onUpdate: (patch: Partial<FeedItem>) => void;
  onCommentPress: () => void;
  onQuotePress: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PostActions({ item, onUpdate, onCommentPress, onQuotePress }: PostActionsProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const scale = useSharedValue(1);

  const likeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleLike = async () => {
    if (!requireAuth('Beğeni')) return;
    if (!user) return;

    const nextLiked = !item.isLiked;
    onUpdate({
      isLiked: nextLiked,
      likeCount: item.likeCount + (nextLiked ? 1 : -1),
    });

    if (nextLiked) {
      scale.value = withSequence(withSpring(1.35), withSpring(1));
    }

    const { error } = await togglePostLike(item.sourceId, user.id, item.isLiked);
    if (error) {
      onUpdate({ isLiked: item.isLiked, likeCount: item.likeCount });
      Alert.alert('Hata', 'Beğeni kaydedilemedi.');
    }
  };

  const handleSave = async () => {
    if (!requireAuth('Kaydetme')) return;
    if (!user) return;

    const nextSaved = !item.isSaved;
    onUpdate({
      isSaved: nextSaved,
      saveCount: item.saveCount + (nextSaved ? 1 : -1),
    });

    const { error } = await togglePostSave(item.sourceId, user.id, item.isSaved);
    if (error) {
      onUpdate({ isSaved: item.isSaved, saveCount: item.saveCount });
      Alert.alert('Hata', 'Kayıt işlemi başarısız.');
    }
  };

  const handleShare = async () => {
    await Share.share({
      message: `${item.title ? `${item.title}\n` : ''}${item.content}\n\nVora — Karadeniz Dijital Ağı`,
    });
  };

  return (
    <View style={styles.row}>
      <AnimatedPressable style={[styles.action, likeStyle]} onPress={handleLike}>
        <Ionicons
          name={item.isLiked ? 'heart' : 'heart-outline'}
          size={22}
          color={item.isLiked ? colors.danger : colors.textSecondary}
        />
        {item.likeCount > 0 ? (
          <Text variant="caption" secondary>
            {formatCount(item.likeCount)}
          </Text>
        ) : null}
      </AnimatedPressable>

      <Pressable style={styles.action} onPress={onCommentPress}>
        <Ionicons name="chatbubble-outline" size={21} color={colors.textSecondary} />
        {item.commentCount > 0 ? (
          <Text variant="caption" secondary>
            {formatCount(item.commentCount)}
          </Text>
        ) : null}
      </Pressable>

      <Pressable
        style={styles.action}
        onPress={() => {
          if (requireAuth('Alıntı')) onQuotePress();
        }}
      >
        <Ionicons name="repeat-outline" size={22} color={colors.textSecondary} />
        {item.quoteCount > 0 ? (
          <Text variant="caption" secondary>
            {formatCount(item.quoteCount)}
          </Text>
        ) : null}
      </Pressable>

      <Pressable
        style={styles.action}
        onPress={() => {
          if (requireAuth('Kaydetme')) handleSave();
        }}
      >
        <Ionicons
          name={item.isSaved ? 'bookmark' : 'bookmark-outline'}
          size={21}
          color={item.isSaved ? colors.primary : colors.textSecondary}
        />
      </Pressable>

      <Pressable style={styles.action} onPress={handleShare}>
        <Ionicons name="share-outline" size={21} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
});
