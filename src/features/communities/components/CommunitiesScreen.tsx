import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { CommunityCard } from '@/features/communities/components/CommunityCard';
import { CommunityFeedCard } from '@/features/communities/components/CommunityFeedCard';
import { CommunityShareSheet } from '@/features/communities/components/CommunityShareSheet';
import { COMMUNITIES_SCREEN_TABS, communityComposePath } from '@/features/communities/constants';
import { fetchCommunities, fetchMyCommunities } from '@/features/communities/services/communityData';
import { fetchCommunityFeedPage } from '@/features/communities/services/communityFeed';
import type { CommunitiesScreenTab, Community, CommunityFeedItem, CommunityFeedScope } from '@/features/communities/types';
import type { FeedItem } from '@/features/feed/types';
import { radius, spacing } from '@/constants/theme';
import { getAndroidFlatListPerfProps, getFeedEstimatedItemSize, isAndroid } from '@/lib/device/androidPerfProfile';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const CommunityFeedRow = memo(function CommunityFeedRow({
  item,
  onUpdate,
  onDeleted,
}: {
  item: CommunityFeedItem;
  onUpdate: (patch: Partial<FeedItem>) => void;
  onDeleted: () => void;
}) {
  return <CommunityFeedCard item={item} onUpdate={onUpdate} onDeleted={onDeleted} />;
});

export function CommunitiesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [tab, setTab] = useState<CommunitiesScreenTab>('feed');
  const [feedScope, setFeedScope] = useState<CommunityFeedScope>('all');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [feedItems, setFeedItems] = useState<CommunityFeedItem[]>([]);
  const [feedCursor, setFeedCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareSheetLoading, setShareSheetLoading] = useState(false);

  const loadCommunities = useCallback(async () => {
    if (tab === 'mine' && user) {
      setCommunities(await fetchMyCommunities(user.id));
    } else if (tab === 'discover') {
      setCommunities(await fetchCommunities(user?.id ?? null, profile?.region_id ?? null));
    }
  }, [tab, user, profile?.region_id]);

  const loadFeed = useCallback(
    async (cursor: string | null, replace: boolean) => {
      const { items, nextCursor } = await fetchCommunityFeedPage({
        userId: user?.id ?? null,
        regionId: profile?.region_id ?? null,
        cursor,
        scope: feedScope,
      });
      setFeedItems((prev) => (replace ? items : [...prev, ...items]));
      setFeedCursor(nextCursor);
    },
    [user?.id, profile?.region_id, feedScope],
  );

  const load = useCallback(async () => {
    if (tab === 'feed') {
      await loadFeed(null, true);
    } else {
      await loadCommunities();
    }
  }, [tab, loadFeed, loadCommunities]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (tab !== 'feed' || !feedCursor || loadingMore || loading) return;
    setLoadingMore(true);
    await loadFeed(feedCursor, false);
    setLoadingMore(false);
  };

  const handleCreate = async () => {
    if (!(await requireAuth('Topluluk oluşturma'))) return;
    router.push('/communities/create' as never);
  };

  const openComposeForCommunity = (community: Community) => {
    router.push(communityComposePath(community.id, community.name) as never);
  };

  const handleShare = async () => {
    if (!(await requireAuth('Paylaşım'))) return;

    if (user) {
      setShareSheetLoading(true);
      const mine = myCommunities.length > 0 ? myCommunities : await fetchMyCommunities(user.id);
      setMyCommunities(mine);
      setShareSheetLoading(false);

      if (mine.length === 0) {
        Alert.alert('Topluluk gerekli', 'Paylaşım yapmak için önce bir topluluğa katılın.', [
          { text: 'İptal', style: 'cancel' },
          { text: 'Keşfet', onPress: () => setTab('discover') },
        ]);
        return;
      }

      if (mine.length === 1) {
        openComposeForCommunity(mine[0]);
        return;
      }

      setShareSheetOpen(true);
    }
  };

  useEffect(() => {
    if (!user?.id || tab !== 'feed') return;
    fetchMyCommunities(user.id).then(setMyCommunities);
  }, [user?.id, tab]);

  const updateFeedItem = useCallback((id: string, patch: Partial<FeedItem>) => {
    setFeedItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const removeFeedItem = useCallback((id: string) => {
    setFeedItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const renderFeedItem = useCallback(
    ({ item }: { item: CommunityFeedItem }) => (
      <CommunityFeedRow
        item={item}
        onUpdate={(patch) => updateFeedItem(item.id, patch)}
        onDeleted={() => removeFeedItem(item.id)}
      />
    ),
    [removeFeedItem, updateFeedItem],
  );

  const renderCommunityItem = useCallback(
    ({ item }: { item: Community }) => <CommunityCard community={item} />,
    [],
  );

  const feedKeyExtractor = useCallback((item: CommunityFeedItem) => item.id, []);
  const communityKeyExtractor = useCallback((item: Community) => item.id, []);

  const header = useMemo(
    () => (
    <>
      <AuthHeader
        title="Topluluklar"
        subtitle="Paylaş, sohbet et, etkinlik düzenle — ilgi alanına göre gruplar"
        trailing={
          <Pressable
            onPress={handleCreate}
            style={[styles.headerAddBtn, { backgroundColor: colors.primary }]}
            hitSlop={8}
            accessibilityLabel="Topluluk oluştur"
          >
            <Ionicons name="people-outline" size={22} color="#fff" />
          </Pressable>
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {COMMUNITIES_SCREEN_TABS.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[
                styles.tab,
                {
                  backgroundColor: active ? `${colors.primary}22` : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Ionicons
                name={t.icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={active ? colors.primary : colors.textMuted}
              />
              <Text variant="caption" style={{ color: active ? colors.primary : colors.text }}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {tab === 'feed' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scopeBar}>
          {(['all', 'mine'] as CommunityFeedScope[]).map((scope) => {
            const active = feedScope === scope;
            return (
              <Pressable
                key={scope}
                onPress={() => setFeedScope(scope)}
                style={[
                  styles.scopePill,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text variant="caption" style={{ color: active ? '#fff' : colors.text }}>
                  {scope === 'all' ? 'Tüm Paylaşımlar' : 'Topluluklarım'}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </>
    ),
    [colors.border, colors.primary, colors.surface, colors.text, colors.textMuted, feedScope, tab],
  );

  const feedEmpty = loading ? (
    <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
  ) : (
    <GlassCard style={styles.empty}>
      <Ionicons name="newspaper-outline" size={32} color={colors.textMuted} />
      <Text variant="label">
        {feedScope === 'mine' ? 'Topluluklarında henüz gönderi yok' : 'Henüz topluluk gönderisi yok'}
      </Text>
      <Text secondary variant="caption">
        {feedScope === 'mine'
          ? 'Katıldığın topluluklarda paylaşılan gönderiler burada görünür.'
          : 'Topluluklarda paylaşılan gönderiler burada akış halinde listelenir.'}
      </Text>
      <Button title="Paylaş" onPress={handleShare} fullWidth={false} />
      <Button title="Topluluk Keşfet" variant="outline" onPress={() => setTab('discover')} fullWidth={false} />
    </GlassCard>
  );

  const feedListProps = {
    data: feedItems,
    keyExtractor: feedKeyExtractor,
    refreshControl: <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />,
    contentContainerStyle: [
      styles.page,
      { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 100 },
    ],
    ListHeaderComponent: header,
    renderItem: renderFeedItem,
    ListEmptyComponent: feedEmpty,
    ListFooterComponent:
      loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} /> : null,
    onEndReached: loadMore,
    onEndReachedThreshold: 0.4 as const,
    ...getAndroidFlatListPerfProps(),
  };

  if (tab === 'feed') {
    return (
      <GradientBackground>
        <View style={styles.flex}>
          {isAndroid() ? (
            <FlashList {...feedListProps} drawDistance={getFeedEstimatedItemSize() * 2} />
          ) : (
            <FlatList {...feedListProps} />
          )}

          <Pressable
            style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + spacing.lg }]}
            onPress={handleShare}
            accessibilityLabel="Paylaş"
          >
            <Ionicons name="create-outline" size={26} color="#fff" />
          </Pressable>
        </View>

        <CommunityShareSheet
          visible={shareSheetOpen}
          communities={myCommunities}
          loading={shareSheetLoading}
          onClose={() => setShareSheetOpen(false)}
        />
      </GradientBackground>
    );
  }

  const communityListProps = {
    data: communities,
    keyExtractor: communityKeyExtractor,
    refreshControl: <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />,
    contentContainerStyle: [
      styles.page,
      { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
    ],
    ListHeaderComponent: header,
    renderItem: renderCommunityItem,
    ListEmptyComponent:
      loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <GlassCard style={styles.empty}>
          <Ionicons name="people-outline" size={32} color={colors.textMuted} />
          <Text secondary>
            {tab === 'mine' ? 'Henüz bir topluluğa katılmadınız.' : 'Topluluk bulunamadı.'}
          </Text>
          {tab === 'mine' ? (
            <Button title="Topluluk Keşfet" variant="outline" onPress={() => setTab('discover')} fullWidth={false} />
          ) : null}
        </GlassCard>
      ),
    ...getAndroidFlatListPerfProps(),
  };

  return (
    <GradientBackground>
      {isAndroid() ? (
        <FlashList {...communityListProps} drawDistance={getFeedEstimatedItemSize() * 2} />
      ) : (
        <FlatList {...communityListProps} />
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  page: {
    paddingHorizontal: spacing.md,
  },
  headerAddBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    marginBottom: spacing.sm,
  },
  scopeBar: {
    marginBottom: spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: spacing.xs,
  },
  scopePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: spacing.xs,
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
});
