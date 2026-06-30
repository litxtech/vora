import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { InstantPressable } from '@/components/ui/InstantPressable';
import { Text } from '@/components/ui/Text';
import { CentersDrawerLinkRow } from '@/features/centers/components/CentersDrawerLinkRow';
import { CentersDrawerRow } from '@/features/centers/components/CentersDrawerRow';
import { useActiveIncidentCount } from '@/features/incidents/hooks/useActiveIncidentCount';
import type { RegionId } from '@/constants/regions';
import { useAuth } from '@/providers/AuthProvider';
import type { CenterDef } from '@/features/centers/types';
import { CENTER_GROUPS, centersByGroup } from '@/constants/centers';
import { useCenterEntryVisible } from '@/features/centers/hooks/useCenterEntryVisible';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { CENTERS_HUB_FEATURE } from '@/features/centers/featureFlags';
import { useStableTabBarInset } from '@/hooks/useStableTabBarInset';
import { getFloatingTabBarReserve } from '@/constants/tabBar';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase('tr');
}

function matchesSearch(center: CenterDef, query: string) {
  if (!query) return true;
  const haystack = `${center.title} ${center.subtitle}`.toLocaleLowerCase('tr');
  return haystack.includes(query);
}

type CentersDrawerMenuProps = {
  headerPrefix?: ReactNode;
  onCenterNavigate?: () => void;
  feedRegionId?: RegionId | null;
};

export function CentersDrawerMenu({
  headerPrefix,
  onCenterNavigate,
  feedRegionId = null,
}: CentersDrawerMenuProps) {
  const insets = useSafeAreaInsets();
  const tabBarBottomInset = useStableTabBarInset();
  const listBottomInset = getFloatingTabBarReserve(tabBarBottomInset) + spacing.sm;
  const { colors } = useTheme();
  const { profile } = useAuth();
  const incidentRegion = (feedRegionId ?? (profile?.region_id as RegionId | undefined) ?? null) as RegionId | null;
  const { count: activeIncidentCount } = useActiveIncidentCount(incidentRegion);
  const showLeaderboard = useFeatureVisible('feed-header-leaderboard');
  const showLivePulse = useFeatureVisible('incident-graph');
  const isCenterVisible = useCenterEntryVisible();
  const showHubSearch = useFeatureVisible(CENTERS_HUB_FEATURE.search);
  const showHubSupport = useFeatureVisible(CENTERS_HUB_FEATURE.support);
  const showCentersHub = useFeatureVisible('centers-hub');
  const [search, setSearch] = useState('');
  const query = normalizeSearch(search);

  const sections = useMemo(
    () =>
      CENTER_GROUPS.map((group) => ({
        ...group,
        items: centersByGroup(group.id).filter(
          (center) => isCenterVisible(center.id) && matchesSearch(center, query),
        ),
      })).filter((group) => group.items.length > 0),
    [isCenterVisible, query],
  );

  const showEmptySearch = query.length > 0 && sections.length === 0;
  const showSupport = isCenterVisible('support-center') && showHubSupport;
  const showFeedShortcuts = showLeaderboard || showLivePulse;

  const handleSupportPress = () => {
    router.push('/support-center' as Href);
    onCenterNavigate?.();
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.page,
        { paddingTop: insets.top + spacing.sm, paddingBottom: listBottomInset },
      ]}
    >
      {headerPrefix}

      {showCentersHub && showHubSearch ? (
        <View style={[styles.searchWrap, { borderBottomColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
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
        </View>
      ) : null}

      {showCentersHub && showEmptySearch ? (
        <Text secondary variant="caption" style={styles.emptySearch}>
          Sonuç bulunamadı
        </Text>
      ) : null}

      {showFeedShortcuts ? (
        <View style={styles.section}>
          <Text variant="caption" style={[styles.sectionLabel, { color: colors.textMuted }]}>
            Akış
          </Text>
          {showLeaderboard ? (
            <CentersDrawerLinkRow
              icon="trophy-outline"
              label="Puan sıralaması"
              href="/leaderboard"
              onNavigate={onCenterNavigate}
            />
          ) : null}
          {showLivePulse ? (
            <CentersDrawerLinkRow
              icon="pulse"
              label="Canlı nabız"
              href="/incidents"
              onNavigate={onCenterNavigate}
              badge={activeIncidentCount}
              accentIcon={activeIncidentCount > 0}
            />
          ) : null}
          {showCentersHub && sections.length > 0 ? (
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          ) : null}
        </View>
      ) : null}

      {showCentersHub
        ? sections.map((group, index) => (
            <View key={group.id} style={styles.section}>
              <Text variant="caption" style={[styles.sectionLabel, { color: colors.textMuted }]}>
                {group.label}
              </Text>
              {group.items.map((center) => (
                <CentersDrawerRow key={center.id} center={center} onNavigate={onCenterNavigate} />
              ))}
              {index < sections.length - 1 ? (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              ) : null}
            </View>
          ))
        : null}

      {showSupport ? (
        <View style={styles.section}>
          <View style={[styles.divider, styles.dividerTop, { backgroundColor: colors.border }]} />
          <Text variant="caption" style={[styles.sectionLabel, { color: colors.textMuted }]}>
            Destek
          </Text>
          <InstantPressable
            onPress={handleSupportPress}
            style={({ pressed }) => [styles.supportRow, pressed && { backgroundColor: `${colors.text}0A` }]}
            accessibilityRole="button"
            accessibilityLabel="Canlı destek"
          >
            <Ionicons name="headset-outline" size={22} color={colors.text} style={styles.supportIcon} />
            <Text variant="body" style={[styles.supportLabel, { color: colors.text }]}>
              Canlı destek
            </Text>
          </InstantPressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.sm,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: spacing.xs,
  },
  emptySearch: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  section: {
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
    marginHorizontal: spacing.md,
  },
  dividerTop: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderRadius: 8,
  },
  supportIcon: {
    width: 24,
    textAlign: 'center',
    flexShrink: 0,
  },
  supportLabel: {
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
});
