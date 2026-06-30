import { useMemo, useState, type ReactNode } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { CenterCard } from '@/features/centers/components/CenterCard';
import {
  buildCenterFilterChips,
  CentersFilterChips,
  type CenterFilterId,
} from '@/features/centers/components/CentersFilterChips';
import { CentersSpotlightRow } from '@/features/centers/components/CentersSpotlightRow';
import { DEFAULT_FEATURED_CENTER_IDS } from '@/features/centers/constants';
import type { CenterDef } from '@/features/centers/types';
import { CENTER_BY_ID, CENTER_GROUPS, centersByGroup } from '@/constants/centers';
import { LIVE_SUPPORT_ACCENT } from '@/features/live-support/constants';
import { radius, spacing } from '@/constants/theme';
import { useCenterEntryVisible } from '@/features/centers/hooks/useCenterEntryVisible';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { CENTERS_HUB_FEATURE } from '@/features/centers/featureFlags';
import { useAppearance } from '@/providers/AppearanceProvider';
import { useTheme } from '@/providers/ThemeProvider';

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase('tr');
}

function matchesSearch(center: CenterDef, query: string) {
  if (!query) return true;
  const haystack = `${center.title} ${center.subtitle}`.toLocaleLowerCase('tr');
  return haystack.includes(query);
}

function CentersGroupHeader({ label }: { label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text variant="label" style={styles.sectionTitle}>
        {label}
      </Text>
    </View>
  );
}

function CentersSupportButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={() => {
        onPress?.();
        router.push('/support-center' as Href);
      }}
      style={({ pressed }) => [styles.supportBtn, pressed && styles.supportBtnPressed]}
      accessibilityRole="button"
      accessibilityLabel="Canlı destek"
    >
      <Ionicons name="headset" size={15} color="#fff" />
      <Text variant="caption" style={styles.supportBtnText}>
        Destek
      </Text>
    </Pressable>
  );
}

type CentersMenuContentProps = {
  variant?: 'page' | 'drawer';
  onCenterNavigate?: () => void;
  headerPrefix?: ReactNode;
};

export function CentersMenuContent({
  variant = 'page',
  onCenterNavigate,
  headerPrefix,
}: CentersMenuContentProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { config } = useAppearance();
  const hub = config.centers_hub;
  const hubAccent = hub.accent ?? colors.primary;
  const featuredCenterIds = hub.featured_center_ids ?? DEFAULT_FEATURED_CENTER_IDS;
  const isCenterVisible = useCenterEntryVisible();
  const showHubSearch = useFeatureVisible(CENTERS_HUB_FEATURE.search);
  const showHubSupport = useFeatureVisible(CENTERS_HUB_FEATURE.support);
  const showHubFilterChips = useFeatureVisible(CENTERS_HUB_FEATURE.filterChips);
  const showCentersHub = useFeatureVisible('centers-hub');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<CenterFilterId>('all');

  const isDrawer = variant === 'drawer';
  const cardVariant = isDrawer ? 'list' : 'grid';
  const query = normalizeSearch(search);

  const featuredCenters = featuredCenterIds
    .map((id) => CENTER_BY_ID[id])
    .filter((center) => center && isCenterVisible(center.id) && matchesSearch(center, query));

  const sections = useMemo(
    () =>
      CENTER_GROUPS.map((group) => ({
        ...group,
        items: centersByGroup(group.id).filter(
          (center) =>
            isCenterVisible(center.id) &&
            !featuredCenterIds.includes(center.id) &&
            matchesSearch(center, query),
        ),
      })).filter((group) => group.items.length > 0),
    [featuredCenterIds, isCenterVisible, query],
  );

  const filteredSections = useMemo(
    () =>
      activeFilter === 'all' ? sections : sections.filter((group) => group.id === activeFilter),
    [sections, activeFilter],
  );

  const totalCount =
    featuredCenters.length +
    sections.reduce((count, group) => count + group.items.length, 0);

  const filterChips = useMemo(
    () =>
      buildCenterFilterChips(
        sections.map((group) => ({
          id: group.id,
          label: group.label,
          count: group.items.length,
        })),
      ),
    [sections],
  );

  const showSpotlight = featuredCenters.length > 0 && !query && activeFilter === 'all';
  const showEmptySearch = query.length > 0 && totalCount === 0;
  const showSupportButton = isCenterVisible('support-center') && showHubSupport;

  const topPadding = isDrawer ? insets.top + spacing.sm : insets.top + spacing.md;
  const bottomPadding = isDrawer ? spacing.xl : insets.bottom + spacing.xxl;

  return (
    <FlatList
      data={showCentersHub ? filteredSections : []}
      keyExtractor={(group) => group.id}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.page,
        { paddingTop: topPadding, paddingBottom: bottomPadding },
      ]}
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          {headerPrefix}

          {!isDrawer ? (
            <View style={styles.pageTitleBlock}>
              <Text variant="h3" style={styles.pageTitle}>
                {hub.title}
              </Text>
              <Text secondary variant="caption">
                {hub.subtitle}
              </Text>
            </View>
          ) : (
            <Text variant="label" style={[styles.drawerTitle, { color: colors.textMuted }]}>
              Merkezler
            </Text>
          )}

          {showCentersHub && showSpotlight ? (
            <CentersSpotlightRow centers={featuredCenters} onCenterNavigate={onCenterNavigate} />
          ) : null}

          {showCentersHub && showHubSearch ? (
            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.searchIconWrap, { backgroundColor: `${hubAccent}14` }]}>
                <Ionicons name="search" size={16} color={hubAccent} />
              </View>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Merkez ara..."
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.text }]}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
              {search.length > 0 ? (
                <Pressable onPress={() => setSearch('')} hitSlop={8} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {showCentersHub && showHubFilterChips && !query && sections.length > 1 ? (
            <CentersFilterChips
              chips={filterChips}
              active={activeFilter}
              onChange={setActiveFilter}
            />
          ) : null}

          {showCentersHub && showEmptySearch ? (
            <View style={[styles.emptySearch, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={[styles.emptyIcon, { backgroundColor: `${colors.textMuted}14` }]}>
                <Ionicons name="search-outline" size={28} color={colors.textMuted} />
              </View>
              <Text variant="label">Sonuç bulunamadı</Text>
              <Text secondary variant="caption" style={{ textAlign: 'center' }}>
                &quot;{search.trim()}&quot; için merkez bulunamadı.
              </Text>
            </View>
          ) : null}

          {showSupportButton ? (
            <View style={styles.supportRow}>
              <CentersSupportButton onPress={onCenterNavigate} />
            </View>
          ) : null}
        </View>
      }
      renderItem={({ item: group }) => (
        <View style={styles.section}>
          <CentersGroupHeader label={group.label} />
          <View style={isDrawer ? styles.list : styles.grid}>
            {group.items.map((center) => (
              <CenterCard
                key={center.id}
                center={center}
                variant={cardVariant}
                onNavigate={onCenterNavigate}
              />
            ))}
          </View>
        </View>
      )}
      ListEmptyComponent={
        showCentersHub && !showEmptySearch ? (
          <View style={styles.emptySearch}>
            <Text secondary variant="body">
              Görüntülenecek merkez yok
            </Text>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  headerBlock: { gap: spacing.md, marginBottom: spacing.sm },
  pageTitleBlock: { gap: 4 },
  pageTitle: { letterSpacing: -0.3 },
  drawerTitle: {
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontSize: 11,
    marginBottom: -spacing.xs,
  },
  supportRow: {
    alignItems: 'flex-start',
  },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: LIVE_SUPPORT_ACCENT,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.full,
    shadowColor: LIVE_SUPPORT_ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  supportBtnPressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
  supportBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: spacing.xs,
  },
  clearBtn: { padding: 2 },
  emptySearch: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: spacing.sm, marginBottom: spacing.md },
  sectionHeader: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
  },
  sectionTitle: { letterSpacing: 0.1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
});
