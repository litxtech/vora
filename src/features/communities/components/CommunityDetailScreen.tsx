import { useCallback, useEffect, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { CommunityManageSheet } from '@/features/communities/components/CommunityManageSheet';
import { CommunityChatTab } from '@/features/communities/components/CommunityChatTab';
import { CommunityEventsTab } from '@/features/communities/components/CommunityEventsTab';
import { CommunityHero } from '@/features/communities/components/CommunityHero';
import { CommunityMembersTab } from '@/features/communities/components/CommunityMembersTab';
import {
  COMMUNITY_DETAIL_TABS,
  communityComposePath,
} from '@/features/communities/constants';
import {
  fetchCommunityDetail,
  joinCommunity,
  removeCommunityMember,
} from '@/features/communities/services/communityData';
import type { CommunityDetail, CommunityDetailTab } from '@/features/communities/types';
import { FeedPostCard } from '@/features/feed/components/FeedPostCard';
import type { FeedItem } from '@/features/feed/types';

const EMPTY_POSTS: FeedItem[] = [];
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [detail, setDetail] = useState<CommunityDetail | null>(null);
  const [tab, setTab] = useState<CommunityDetailTab>('posts');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setDetail(await fetchCommunityDetail(id, user?.id ?? null));
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

  const updatePost = (postId: string, patch: Partial<FeedItem>) => {
    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        posts: prev.posts.map((p) => (p.id === postId ? { ...p, ...patch } : p)),
      };
    });
  };

  const toggleMembership = async () => {
    if (!(await requireAuth('Topluluğa katılma')) || !user || !detail) return;

    if (detail.isMember && detail.myRole === 'owner') {
      Alert.alert('Kurucu', 'Kurucu olarak topluluktan ayrılamazsınız.');
      return;
    }

    setActionLoading(true);
    try {
      if (detail.isMember) {
        const { error } = await removeCommunityMember(detail.id, user.id);
        if (error) Alert.alert('Hata', error);
      } else {
        await joinCommunity(detail.id, user.id);
      }
      await load();
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = async () => {
    if (!detail) return;
    if (!(await requireAuth('Paylaşım'))) return;
    if (!detail.isMember) {
      Alert.alert('Üyelik gerekli', 'Paylaşım yapmak için önce topluluğa katılın.', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Katıl', onPress: toggleMembership },
      ]);
      return;
    }
    router.push(communityComposePath(detail.id, detail.name) as never);
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

  if (!detail) {
    return (
      <GradientBackground>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <Text secondary>Topluluk bulunamadı.</Text>
        </View>
      </GradientBackground>
    );
  }

  const listHeader = (
    <View style={styles.headerGroup}>
      <ScreenBackButton style={styles.backBtn} />

      <CommunityHero
        detail={detail}
        actionLoading={actionLoading}
        onJoinToggle={toggleMembership}
        onShare={handleShare}
        onChat={
          detail.conversationId
            ? () => router.push(`/chat/${detail.conversationId}` as never)
            : undefined
        }
        onManage={() => setManageOpen(true)}
        onMembersPress={() => setTab('members')}
        onEditBranding={() => setManageOpen(true)}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {COMMUNITY_DETAIL_TABS.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[
                styles.tabPill,
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
    </View>
  );

  const nonPostsTabContent =
    tab === 'chat' ? (
      <CommunityChatTab detail={detail} onConversationReady={() => load()} />
    ) : tab === 'events' ? (
      <CommunityEventsTab detail={detail} />
    ) : tab === 'members' ? (
      <CommunityMembersTab detail={detail} currentUserId={user?.id ?? null} onChanged={load} />
    ) : tab === 'rules' ? (
      <GlassCard style={styles.section}>
        {detail.rules.length === 0 && !detail.rulesSummary ? (
          <Text secondary>Kural tanımlanmamış.</Text>
        ) : (
          <>
            {detail.rulesSummary ? <Text secondary>{detail.rulesSummary}</Text> : null}
            {detail.rules.map((rule, index) => (
              <View key={rule.id} style={styles.rule}>
                <Text variant="label">
                  {index + 1}. {rule.title}
                </Text>
                <Text secondary variant="caption">
                  {rule.content}
                </Text>
              </View>
            ))}
          </>
        )}
      </GlassCard>
    ) : tab === 'about' ? (
      <GlassCard style={styles.section}>
        <Text variant="label">Topluluk Özellikleri</Text>
        <AboutLine icon="newspaper-outline" text="Gönderi paylaşımı ve yorumlar" colors={colors} />
        <AboutLine icon="chatbubbles-outline" text="Grup sohbeti (anlık mesajlaşma)" colors={colors} />
        <AboutLine icon="calendar-outline" text="Topluluk etkinlikleri" colors={colors} />
        <AboutLine icon="people-outline" text="Üye yönetimi ve roller" colors={colors} />
        <AboutLine icon="shield-outline" text="Kurallar ve moderasyon" colors={colors} />
      </GlassCard>
    ) : null;

  const listEmpty =
    tab === 'posts' ? (
      <GlassCard style={styles.empty}>
        <Ionicons name="newspaper-outline" size={40} color={colors.textMuted} />
        <Text variant="label">Henüz gönderi yok</Text>
        <Text secondary variant="caption">
          {detail.isMember
            ? 'İlk gönderiyi sen paylaş — topluluğu canlandır!'
            : 'Katılarak gönderileri görüntüleyebilir ve paylaşabilirsiniz.'}
        </Text>
        {detail.isMember ? (
          <Button title="İlk Gönderiyi Paylaş" onPress={handleShare} fullWidth={false} />
        ) : null}
      </GlassCard>
    ) : (
      nonPostsTabContent
    );

  return (
    <GradientBackground>
      <View style={styles.flex}>
        <FlatList
          data={tab === 'posts' ? detail.posts : EMPTY_POSTS}
          keyExtractor={(post) => post.id}
          renderItem={({ item }) => (
            <FeedPostCard item={item} onUpdate={(patch) => updatePost(item.id, patch)} />
          )}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          contentContainerStyle={[
            styles.page,
            { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + 100 },
          ]}
          initialNumToRender={5}
          windowSize={9}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
        />

        {detail.isMember ? (
          <Pressable
            style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + spacing.lg }]}
            onPress={handleShare}
            accessibilityLabel="Paylaş"
          >
            <Ionicons name="create-outline" size={26} color="#fff" />
          </Pressable>
        ) : null}
      </View>

      <CommunityManageSheet
        visible={manageOpen}
        detail={detail}
        onClose={() => setManageOpen(false)}
        onChanged={load}
        onOpenMembers={() => {
          setManageOpen(false);
          setTab('members');
        }}
      />
    </GradientBackground>
  );
}

function AboutLine({
  icon,
  text,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.aboutLine}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text variant="caption">{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  backBtn: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
    marginBottom: spacing.xs,
  },
  tabBar: {
    marginHorizontal: -spacing.xs,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: spacing.xs,
  },
  section: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  rule: {
    gap: 4,
    paddingVertical: spacing.xs,
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  aboutLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
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
