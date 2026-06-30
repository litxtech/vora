import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { REGIONS, type RegionId } from '@/constants/regions';
import { DISCOVERY_PERIODS, DISCOVERY_SCOPES } from '@/features/discovery/constants';
import { fetchDailyAgenda, fetchTrendingTopics } from '@/features/agenda/services/agendaData';
import type { AgendaQuery, DailyAgendaItem, TrendingTopic } from '@/features/agenda/types';
import { hashtagPath } from '@/features/hashtag/navigation';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace('.0', '')}B`;
  return String(value);
}

type AgendaTrendRowProps = {
  topic: TrendingTopic;
  displayRank: number;
  scopeLabel: string;
  colors: ThemeColors;
  onPress: (tag: string) => void;
};

const AgendaTrendRow = memo(function AgendaTrendRow({
  topic,
  displayRank,
  scopeLabel,
  colors,
  onPress,
}: AgendaTrendRowProps) {
  return (
    <Pressable
      onPress={() => onPress(topic.tag)}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border },
        pressed && { backgroundColor: `${colors.primary}0A` },
      ]}
    >
      <View style={styles.rowMain}>
        <Text variant="caption" secondary style={styles.rowContext}>
          {displayRank} · Gündem · {scopeLabel}
        </Text>
        <Text variant="label" style={styles.rowTag}>
          #{topic.tag}
        </Text>
        <Text variant="caption" secondary style={styles.rowMeta}>
          {formatCount(topic.postCount)} gönderi
          {topic.commentCount > 0 ? ` · ${formatCount(topic.commentCount)} yorum` : ''}
        </Text>
      </View>
      <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
    </Pressable>
  );
});

export function AgendaScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { profile } = useAuth();

  const [query, setQuery] = useState<AgendaQuery>({
    scope: 'region',
    period: '24h',
    regionId: (profile?.region_id as RegionId) ?? 'trabzon',
  });
  const [agenda, setAgenda] = useState<DailyAgendaItem[]>([]);
  const [trends, setTrends] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [agendaItems, trendItems] = await Promise.all([
      fetchDailyAgenda(query),
      fetchTrendingTopics(query),
    ]);
    setAgenda(agendaItems);
    setTrends(trendItems);
  }, [query]);

  useEffect(() => {
    if (profile?.region_id) {
      setQuery((prev) => ({ ...prev, regionId: profile.region_id as RegionId }));
    }
  }, [profile?.region_id]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openTag = useCallback((tag: string) => {
    router.push(hashtagPath(tag));
  }, []);

  // X tarzı: en çok gönderi paylaşılan gündem en üstte; eşitlikte trend skoru.
  const rankedTrends = useMemo(
    () =>
      [...trends].sort(
        (a, b) => b.postCount - a.postCount || b.trendScore - a.trendScore,
      ),
    [trends],
  );

  const scopeLabel = useMemo(() => {
    if (query.scope === 'karadeniz') return 'Karadeniz';
    return REGIONS.find((r) => r.id === query.regionId)?.name ?? 'Bölge';
  }, [query.scope, query.regionId]);

  const listHeader = (
    <View style={styles.headerStack}>
      <AuthHeader
        title="Gündem"
        subtitle="En çok konuşulan başlıklar — gönderi sayısına göre sıralı"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {DISCOVERY_SCOPES.map((item) => {
          const active = query.scope === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setQuery((q) => ({ ...q, scope: item.id }))}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? `${colors.primary}22` : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text variant="caption" style={{ color: active ? colors.primary : colors.text }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {DISCOVERY_PERIODS.map((item) => {
          const active = query.period === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setQuery((q) => ({ ...q, period: item.id }))}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? `${colors.warning}22` : colors.surface,
                  borderColor: active ? colors.warning : colors.border,
                },
              ]}
            >
              <Text variant="caption" style={{ color: active ? colors.warning : colors.textMuted }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {agenda.length > 0 ? (
        <View style={styles.agendaStrip}>
          <View style={styles.sectionTitle}>
            <Ionicons name="sunny-outline" size={16} color={colors.primary} />
            <Text variant="label">Günlük Gündem</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.agendaChips}>
            {agenda.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => openTag(item.tag)}
                style={[styles.agendaChip, { borderColor: colors.primary, backgroundColor: `${colors.primary}14` }]}
              >
                <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                  {item.label.startsWith('#') ? item.label : `#${item.label}`}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.sectionTitle}>
        <Ionicons name="trending-up" size={18} color={colors.warning} />
        <Text variant="label">Gündemdekiler</Text>
      </View>
    </View>
  );

  return (
    <GradientBackground>
      <FlatList
        data={loading ? [] : rankedTrends}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <AgendaTrendRow
            topic={item}
            displayRank={index + 1}
            scopeLabel={scopeLabel}
            colors={colors}
            onPress={openTag}
          />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : (
            <GlassCard style={styles.empty}>
              <Ionicons name="trending-up" size={32} color={colors.textMuted} />
              <Text secondary>Bu dönemde gündem oluşmadı.</Text>
              <Text variant="caption" secondary style={styles.emptyHint}>
                Farklı bir bölge veya zaman aralığı deneyin.
              </Text>
            </GlassCard>
          )
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        initialNumToRender={12}
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
  },
  headerStack: {
    gap: spacing.sm,
  },
  filterRow: {
    marginBottom: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: spacing.xs,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  agendaStrip: {
    gap: spacing.xs,
  },
  agendaChips: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  agendaChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  rowContext: {
    fontSize: 12,
  },
  rowTag: {
    fontWeight: '700',
  },
  rowMeta: {
    fontSize: 12,
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
