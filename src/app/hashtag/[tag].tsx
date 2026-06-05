import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { FeedPostCard } from '@/features/feed/components/FeedPostCard';
import { fetchHashtagPosts } from '@/features/hashtag/services/hashtagData';
import type { FeedItem } from '@/features/feed/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export default function HashtagScreen() {
  const { colors } = useTheme();
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [displayTag, setDisplayTag] = useState('');

  useEffect(() => {
    if (!tag) return;
    setLoading(true);
    fetchHashtagPosts(tag)
      .then((result) => {
        setItems(result.items);
        setPostCount(result.postCount);
        setDisplayTag(result.tag);
      })
      .finally(() => setLoading(false));
  }, [tag]);

  const updateItem = (id: string, patch: Partial<FeedItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page}>
        <AuthHeader title={`#${displayTag}`} subtitle={`${postCount} gönderi`} />

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : items.length === 0 ? (
          <Text secondary>Bu hashtag ile henüz gönderi yok.</Text>
        ) : (
          items.map((item) => (
            <FeedPostCard key={item.id} item={item} onUpdate={(patch) => updateItem(item.id, patch)} />
          ))
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, paddingBottom: spacing.xxl },
  loader: { marginTop: spacing.xl },
});
