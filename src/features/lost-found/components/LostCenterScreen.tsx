import { useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { LostItemCard } from '@/features/lost-found/components/LostItemCard';
import { LostTabBar } from '@/features/lost-found/components/LostTabBar';
import {
  LOST_CENTER_DEF,
  LOST_TABS,
  LOST_TAB_EMPTY_MESSAGES,
} from '@/features/lost-found/constants';
import { useFeatureTabFilter } from '@/features/feature-flags/hooks/useFeatureTabFilter';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { LOST_FEATURE } from '@/features/lost-found/featureFlags';
import { useLostTab } from '@/features/lost-found/hooks/useLostTab';
import type { LostListing, LostTab } from '@/features/lost-found/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

const ACCENT = LOST_CENTER_DEF.accent;

function HeroBanner() {
  const { colors, isDark } = useTheme();

  return (
    <LinearGradient
      colors={
        isDark
          ? ([`${ACCENT}44`, `${ACCENT}18`, 'transparent'] as const)
          : ([`${ACCENT}30`, `${ACCENT}10`, 'transparent'] as const)
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroBanner}
    >
      <View style={[styles.heroIcon, { backgroundColor: `${ACCENT}22` }]}>
        <Ionicons name="search" size={28} color={ACCENT} />
      </View>
      <View style={styles.heroText}>
        <Text variant="h2">Kayıp Merkezi</Text>
        <Text secondary variant="caption">
          Kayıp hayvan, eşya, belge ve buluntu ilanları
        </Text>
      </View>
    </LinearGradient>
  );
}

function QuickAction({
  title,
  subtitle,
  icon,
  color,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        {
          backgroundColor: `${color}10`,
          borderColor: `${color}44`,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <LinearGradient colors={[`${color}CC`, color]} style={styles.actionIcon}>
        <Ionicons name={icon} size={22} color="#fff" />
      </LinearGradient>
      <View style={styles.actionText}>
        <Text variant="label">{title}</Text>
        <Text secondary variant="caption">
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={color} />
    </Pressable>
  );
}

function SectionHeader({ title, count, accent }: { title: string; count?: number; accent?: string }) {
  const tone = accent ?? ACCENT;

  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionAccent, { backgroundColor: tone }]} />
      <Text variant="label">{title}</Text>
      {count != null && count > 0 ? (
        <View style={[styles.countBadge, { backgroundColor: `${tone}18` }]}>
          <Text variant="caption" style={{ color: tone, fontWeight: '700' }}>
            {count}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function groupListings(listings: LostListing[], tab: LostTab) {
  if (tab === 'urgent' || tab === 'resolved' || tab === 'mine') {
    return { urgent: [], regular: listings };
  }
  const urgent = listings.filter((l) => l.isUrgent && l.status === 'open');
  const regular = listings.filter((l) => !l.isUrgent || l.status !== 'open');
  return { urgent, regular };
}

type LostRow =
  | { type: 'section'; key: string; title: string; count: number; accent?: string }
  | { type: 'listing'; key: string; listing: LostListing };

function buildLostRows(
  urgent: LostListing[],
  regular: LostListing[],
  tab: LostTab,
  dangerColor: string,
): LostRow[] {
  const rows: LostRow[] = [];
  if (urgent.length > 0) {
    rows.push({ type: 'section', key: 'sec-urgent', title: 'Acil İlanlar', count: urgent.length, accent: dangerColor });
    for (const listing of urgent) rows.push({ type: 'listing', key: listing.id, listing });
  }
  if (regular.length > 0) {
    if (urgent.length > 0) {
      rows.push({
        type: 'section',
        key: 'sec-regular',
        title: tab === 'found' ? 'Diğer Buluntular' : tab === 'lost' ? 'Diğer Kayıplar' : 'Tüm İlanlar',
        count: regular.length,
      });
    }
    for (const listing of regular) rows.push({ type: 'listing', key: listing.id, listing });
  }
  return rows;
}

export function LostCenterScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [tab, setTab] = useState<LostTab>('lost');

  const { listings, loading, error, refresh } = useLostTab(
    tab,
    profile?.region_id ?? null,
    user?.id ?? null,
  );

  const { urgent, regular } = useMemo(() => groupListings(listings, tab), [listings, tab]);

  const visibleTabs = useFeatureTabFilter('lost-center', LOST_TABS, (t) => t.id !== 'mine' || !!user);
  const showCreateLost = useFeatureVisible(LOST_FEATURE.section.createLost);
  const showCreateFound = useFeatureVisible(LOST_FEATURE.section.createFound);

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === tab)) {
      setTab(visibleTabs[0]?.id ?? 'lost');
    }
  }, [visibleTabs, tab]);

  const handleCreate = async (type?: 'lost' | 'found') => {
    if (!(await requireAuth('İlan oluşturma'))) return;
    const query = type ? `?type=${type}` : '';
    router.push(`/lost-center/create${query}` as never);
  };

  const emptyCreateType = tab === 'found' ? 'found' : 'lost';
  const emptyCreateLabel = tab === 'found' ? 'Buluntu Bildir' : 'Kayıp İlanı Ver';

  const rows = useMemo(
    () => buildLostRows(urgent, regular, tab, colors.danger),
    [urgent, regular, tab, colors.danger],
  );

  const listEmpty = (() => {
    if (loading && listings.length === 0) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={ACCENT} size="large" />
          <Text secondary variant="caption">
            İlanlar yükleniyor...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <GlassCard style={styles.empty}>
          <Ionicons name="cloud-offline-outline" size={36} color={colors.textMuted} />
          <Text secondary>{error}</Text>
          <Pressable onPress={refresh} style={[styles.retryBtn, { borderColor: ACCENT }]}>
            <Text variant="caption" style={{ color: ACCENT, fontWeight: '600' }}>
              Yenile
            </Text>
          </Pressable>
        </GlassCard>
      );
    }

    return (
      <GlassCard style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: `${ACCENT}14` }]}>
          <Ionicons name="search-outline" size={36} color={ACCENT} />
        </View>
        <Text variant="label">İlan bulunamadı</Text>
        <Text secondary variant="caption" style={styles.emptyHint}>
          {LOST_TAB_EMPTY_MESSAGES[tab] ?? 'Bu sekmede ilan bulunamadı.'}
        </Text>
        {user && ((emptyCreateType === 'lost' && showCreateLost) || (emptyCreateType === 'found' && showCreateFound)) ? (
          <Pressable
            onPress={() => handleCreate(emptyCreateType)}
            style={[styles.emptyCta, { backgroundColor: ACCENT }]}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text variant="caption" style={{ color: '#fff', fontWeight: '700' }}>
              {emptyCreateLabel}
            </Text>
          </Pressable>
        ) : null}
      </GlassCard>
    );
  })();

  const renderRow = ({ item }: { item: LostRow }) =>
    item.type === 'section' ? (
      <SectionHeader title={item.title} count={item.count} accent={item.accent} />
    ) : (
      <LostItemCard listing={item.listing} />
    );

  return (
    <GradientBackground>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={ACCENT} />}
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        removeClippedSubviews={false}
        windowSize={9}
        maxToRenderPerBatch={8}
        initialNumToRender={8}
        ListHeaderComponent={
          <>
            <HeroBanner />

        {user && (showCreateLost || showCreateFound) ? (
              <View style={styles.actionRow}>
                {showCreateLost ? (
                <QuickAction
                  title="Kayıp İlanı"
                  subtitle="Hayvan, eşya, insan"
                  icon="help-circle"
                  color={colors.danger}
                  onPress={() => handleCreate('lost')}
                />
                ) : null}
                {showCreateFound ? (
                <QuickAction
                  title="Buluntu Bildir"
                  subtitle="Bulduğunuz eşyayı paylaşın"
                  icon="checkmark-circle"
                  color={colors.success}
                  onPress={() => handleCreate('found')}
                />
                ) : null}
              </View>
            ) : null}

            <LostTabBar value={tab} onChange={setTab} tabs={visibleTabs} />
          </>
        }
        ListEmptyComponent={listEmpty}
        renderItem={renderRow}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  heroBanner: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    gap: 2,
  },
  actionRow: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    gap: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  list: {
    gap: spacing.md,
  },
  center: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHint: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  retryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
