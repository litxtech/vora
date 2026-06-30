import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { ChannelPostCard } from '@/features/channels/components/ChannelPostCard';
import { channelTypeMeta } from '@/features/channels/constants';
import {
  fetchChannelDetail,
  publishChannelPost,
  subscribeChannel,
  toggleChannelNotifications,
  unsubscribeChannel,
} from '@/features/channels/services/channelData';
import type { Channel, ChannelPost } from '@/features/channels/types';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function ChannelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();

  const [channel, setChannel] = useState<Channel | null>(null);
  const [posts, setPosts] = useState<ChannelPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [postText, setPostText] = useState('');
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const result = await fetchChannelDetail(id, user?.id ?? null);
    if (result) {
      setChannel(result.channel);
      setPosts(result.posts);
    } else {
      setChannel(null);
      setPosts([]);
    }
  }, [id, user?.id]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggleSubscribe = async () => {
    if (!(await requireAuth('Kanal takibi')) || !user || !channel) return;
    setActionLoading(true);
    try {
      if (channel.isSubscribed) {
        await unsubscribeChannel(channel.id, user.id);
      } else {
        await subscribeChannel(channel.id, user.id);
      }
      await load();
    } finally {
      setActionLoading(false);
    }
  };

  const toggleNotify = async (enabled: boolean) => {
    if (!user || !channel?.isSubscribed) return;
    await toggleChannelNotifications(channel.id, user.id, enabled);
    await load();
  };

  const handlePublish = async () => {
    if (!user || !channel?.canPost || !postText.trim()) return;
    setPublishing(true);
    const post = await publishChannelPost(channel.id, user.id, { content: postText.trim() });
    setPublishing(false);
    if (post) {
      setPostText('');
      setPosts((prev) => [post, ...prev]);
    }
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </GradientBackground>
    );
  }

  if (!channel) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <Text secondary>Kanal bulunamadı.</Text>
        </View>
      </GradientBackground>
    );
  }

  const meta = channelTypeMeta(channel.channelType);

  const listHeader = (
    <View style={styles.headerGroup}>
      <AuthHeader title={channel.name} subtitle={meta.label} />

      <GlassCard style={styles.meta}>
        <View style={styles.metaRow}>
          <Ionicons name={meta.icon} size={16} color={meta.color} />
          <Text variant="caption" secondary>
            {channel.subscriberCount} takipçi · {channel.postCount} yayın
          </Text>
        </View>
        {channel.description ? <Text secondary variant="caption">{channel.description}</Text> : null}
      </GlassCard>

      <Button
        title={channel.isSubscribed ? 'Takibi Bırak' : 'Kanalı Takip Et'}
        variant={channel.isSubscribed ? 'outline' : 'primary'}
        onPress={toggleSubscribe}
        loading={actionLoading}
      />

      {channel.isSubscribed ? (
        <View style={styles.notifyRow}>
          <Text variant="caption">Bildirimler</Text>
          <Switch
            value={channel.notifyEnabled}
            onValueChange={toggleNotify}
            trackColor={{ true: colors.primary }}
          />
        </View>
      ) : null}

      {channel.canPost ? (
        <GlassCard style={styles.compose}>
          <Text variant="label">Yayınla</Text>
          <Input
            value={postText}
            onChangeText={setPostText}
            placeholder="Kanalınıza duyuru yazın..."
            multiline
          />
          <Button title="Yayınla" onPress={handlePublish} loading={publishing} disabled={!postText.trim()} />
        </GlassCard>
      ) : null}

      <Text variant="label" style={styles.sectionTitle}>
        Yayınlar
      </Text>
    </View>
  );

  return (
    <GradientBackground>
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) => <ChannelPostCard post={item} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <GlassCard style={styles.empty}>
            <Text secondary>Henüz yayın yok.</Text>
          </GlassCard>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        initialNumToRender={6}
        windowSize={9}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  headerGroup: {
    gap: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compose: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  sectionTitle: {
    marginTop: spacing.sm,
  },
  empty: {
    padding: spacing.lg,
    alignItems: 'center',
  },
});
