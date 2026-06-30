import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { BusinessShopBrowseCard } from '@/features/business-center/components/BusinessShopBrowseCard';
import { BusinessShopFeaturedCarousel } from '@/features/business-center/components/BusinessShopFeaturedCarousel';
import {
  BUSINESS_ACCENT,
  BUSINESS_SECTOR_OPTIONS,
  businessSectorLabel,
} from '@/features/business-center/constants';
import { fetchPublishedBusinessShops } from '@/features/business-center/services/businessShopData';
import { fetchActiveShopBoosts } from '@/features/business-center/services/shopBoostData';
import type { BusinessShopBrowseItem } from '@/features/business-center/types';
import type { BusinessCategoryId } from '@/constants/registration';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function BusinessBrowseScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [items, setItems] = useState<BusinessShopBrowseItem[]>([]);
  const [featuredBoosts, setFeaturedBoosts] = useState<Awaited<ReturnType<typeof fetchActiveShopBoosts>>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<BusinessCategoryId | 'all'>('all');

  const load = useCallback(async () => {
    const regionId = profile?.region_id ?? 'trabzon';
    const [data, boosts] = await Promise.all([
      fetchPublishedBusinessShops(60),
      fetchActiveShopBoosts(regionId, 6),
    ]);
    const boostedIds = new Set(boosts.map((b) => b.businessId));
    const enriched = data.map((item) => ({
      ...item,
      isFeatured: boostedIds.has(item.id),
      boostId: boosts.find((b) => b.businessId === item.id)?.boostId ?? null,
    }));
    enriched.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return 0;
    });
    setItems(enriched);
    setFeaturedBoosts(boosts);
    setLoading(false);
  }, [profile?.region_id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    return items.filter((item) => {
      if (sectorFilter !== 'all' && item.category !== sectorFilter) return false;
      if (!q) return true;
      const sector = businessSectorLabel(item.category).toLocaleLowerCase('tr');
      return (
        item.name.toLocaleLowerCase('tr').includes(q) ||
        sector.includes(q) ||
        (item.shopTagline ?? '').toLocaleLowerCase('tr').includes(q) ||
        (item.district ?? '').toLocaleLowerCase('tr').includes(q)
      );
    });
  }, [items, query, sectorFilter]);

  const sectorChips = useMemo(() => {
    const used = new Set(items.map((i) => i.category));
    return BUSINESS_SECTOR_OPTIONS.filter((s) => used.has(s.id));
  }, [items]);

  const isBusinessOwner = profile?.account_type === 'business';

  return (
    <GradientBackground>
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BUSINESS_ACCENT} />}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
          gap: spacing.md,
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <AuthHeader
              title="İşletme Mağazaları"
              subtitle="Tüm sektörler · kurumsal vitrinler"
            />
            {isBusinessOwner ? (
              <Text
                variant="caption"
                style={{ color: BUSINESS_ACCENT, fontWeight: '700' }}
                onPress={() => router.push('/business-center/account' as never)}
              >
                İşletme panelime git →
              </Text>
            ) : null}

            <View style={[styles.searchRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Ionicons name="search-outline" size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Mağaza veya sektör ara…"
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
              />
              {query.length > 0 ? (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Pressable
                onPress={() => setSectorFilter('all')}
                style={[
                  styles.chip,
                  {
                    borderColor: sectorFilter === 'all' ? BUSINESS_ACCENT : colors.border,
                    backgroundColor: sectorFilter === 'all' ? `${BUSINESS_ACCENT}14` : colors.surface,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  style={{ fontWeight: '700', color: sectorFilter === 'all' ? BUSINESS_ACCENT : colors.textSecondary }}
                >
                  Tümü
                </Text>
              </Pressable>
              {sectorChips.map((sector) => {
                const active = sectorFilter === sector.id;
                return (
                  <Pressable
                    key={sector.id}
                    onPress={() => setSectorFilter(sector.id)}
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? BUSINESS_ACCENT : colors.border,
                        backgroundColor: active ? `${BUSINESS_ACCENT}14` : colors.surface,
                      },
                    ]}
                  >
                    <Ionicons
                      name={sector.icon}
                      size={12}
                      color={active ? BUSINESS_ACCENT : colors.textMuted}
                    />
                    <Text
                      variant="caption"
                      style={{ fontWeight: '700', color: active ? BUSINESS_ACCENT : colors.textSecondary }}
                    >
                      {sector.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {!loading && featuredBoosts.length > 0 ? (
              <BusinessShopFeaturedCarousel items={featuredBoosts} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={BUSINESS_ACCENT} style={{ marginTop: spacing.xl }} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="bag-handle-outline" size={40} color={colors.textMuted} />
              <Text secondary variant="caption" style={{ textAlign: 'center' }}>
                {query || sectorFilter !== 'all'
                  ? 'Aramanıza uygun mağaza bulunamadı.'
                  : 'Henüz yayında kurumsal mağaza yok. İşletme hesapları mağazalarını açtığında burada görünecek.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => <BusinessShopBrowseCard item={item} />}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginBottom: spacing.sm },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 4 },
  chips: { gap: spacing.xs, paddingVertical: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: spacing.xs,
  },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
});
