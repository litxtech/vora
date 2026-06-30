import { Image, StyleSheet, View } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import type { ChannelPost } from '@/features/channels/types';
import { spacing } from '@/constants/theme';

type ChannelPostCardProps = {
  post: ChannelPost;
};

export function ChannelPostCard({ post }: ChannelPostCardProps) {
  const time = new Date(post.createdAt).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <GlassCard style={styles.card}>
      <Text variant="caption" secondary>
        {time}
      </Text>
      <Text>{post.content}</Text>
      {post.mediaUrl ? (
        <Image source={{ uri: post.mediaUrl }} style={styles.media} resizeMode="cover" />
      ) : null}
      <Text variant="caption" secondary>
        {post.viewCount} görüntülenme
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  media: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
});
