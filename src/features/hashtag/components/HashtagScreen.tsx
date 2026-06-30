import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useGlobalSearchParams, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { FeedPostCard } from '@/features/feed/components/FeedPostCard';
import { fetchHashtagPosts } from '@/features/hashtag/services/hashtagData';
import type { FeedItem } from '@/features/feed/types';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

function resolveTagParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function HashtagScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const localParams = useLocalSearchParams<{ tag?: string | string[] }>();
  const globalParams = useGlobalSearchParams<{ tag?: string | string[] }>();

  const rawTag = useMemo(
    () => resolveTagParam(localParams.tag) ?? resolveTagParam(globalParams.tag),
    [globalParams.tag, localParams.tag],
  );

  const [items, setItems] = useState<FeedItem[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [displayTag, setDisplayTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!rawTag) {
      setItems([]);
      setPostCount(0);
      setDisplayTag('');
      setError('Hashtag bulunamadı.');
      return;
    }

    setError(null);
    const result = await fetchHashtagPosts(rawTag, user?.id ?? null);
    setItems(result.items);
    setPostCount(result.postCount);
    setDisplayTag(result.tag);
  }, [rawTag, user?.id]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setError('Gönderiler yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } catch {
      setError('Gönderiler yüklenemedi.');
    } finally {
      setRefreshing(false);
    }
  };

  const updateItem = useCallback((id: string, patch: Partial<FeedItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const listHeader = (
    <View style={styles.headerBlock}>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <Text variant="h2">{displayTag ? `#${displayTag}` : '#…'}</Text>
          <Text secondary variant="caption">
            {postCount > 0 ? `${postCount} gönderi` : 'Gönderi yok'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <GradientBackground>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
        <ScreenBackButton />
        <Text variant="label">Hashtag</Text>
        <View style={styles.topBarSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <FeedPostCard item={item} onUpdate={(patch) => updateItem(item.id, patch)} />
            </View>
          )}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <GlassCard style={styles.empty}>
              <Ionicons name="pricetag-outline" size={32} color={colors.textMuted} />
              <Text variant="label">Bu hashtag ile henüz gönderi yok</Text>
              <Text secondary variant="caption" style={styles.emptyHint}>
                {error ??
                  (displayTag
                    ? `#${displayTag} etiketiyle paylaşılmış bir gönderi bulunamadı.`
                    : 'Geçersiz hashtag bağlantısı.')}
              </Text>
            </GlassCard>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
          }
          contentContainerStyle={[
            styles.page,
            { paddingBottom: insets.bottom + spacing.xxl },
            items.length === 0 && styles.pageEmpty,
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarSpacer: {
    width: 40,
  },
  page: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  pageEmpty: {
    flexGrow: 1,
  },
  headerBlock: {
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleCopy: {
    gap: spacing.xs,
  },
  cardWrap: {
    marginBottom: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    marginTop: spacing.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyHint: {
    textAlign: 'center',
  },
});
