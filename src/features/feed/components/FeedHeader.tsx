import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { InstantPressable } from '@/components/ui/InstantPressable';
import { LocationOptionSheet } from '@/components/location/LocationSheetPicker';
import { FeatureGate } from '@/features/feature-flags/components/FeatureGate';
import { useNotifications } from '@/providers/NotificationProvider';
import { Text } from '@/components/ui/Text';
import { FeedAppearanceBanner } from '@/features/app-appearance/components/FeedAppearanceBanner';
import { TrustVacationPromoSlot } from '@/features/trust-promo';
import { AnnouncementStrip } from '@/features/announcements/components/AnnouncementStrip';
import { FeedIconButton } from '@/features/feed/components/shared/FeedIconButton';
import { FeedHeaderAvatarButton } from '@/features/feed/components/FeedSideDrawer';
import { MapHeaderButton } from '@/features/map/components/MapHeaderButton';
import { IncidentsHeaderButton } from '@/features/incidents/components/IncidentsHeaderButton';
import { useFeedStore } from '@/features/feed/store/feedStore';
import { FEED_ALL_DISTRICTS_LABEL, FEED_ALL_REGIONS_LABEL, getFeedDistrictOptions } from '@/features/feed/constants';
import { REGIONS } from '@/constants/regions';
import type { RegionId } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { FEED_FEATURE } from '@/features/feed/featureFlags';

export function FeedHeader() {
  const { colors } = useTheme();
  const { unreadCount } = useNotifications();
  const regionId = useFeedStore((s) => s.regionId);
  const district = useFeedStore((s) => s.district);
  const searchQuery = useFeedStore((s) => s.searchQuery);
  const setRegionId = useFeedStore((s) => s.setRegionId);
  const setDistrict = useFeedStore((s) => s.setDistrict);
  const setSearchQuery = useFeedStore((s) => s.setSearchQuery);

  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const regionName = regionId
    ? (REGIONS.find((r) => r.id === regionId)?.name ?? 'Bölge')
    : FEED_ALL_REGIONS_LABEL;
  const districts = getFeedDistrictOptions(regionId);
  const showRegionFilter = useFeatureVisible(FEED_FEATURE.regionFilter);
  const showDistrictFilter = useFeatureVisible(FEED_FEATURE.districtFilter);

  const regionOptions = useMemo(
    () =>
      REGIONS.map((region) => ({
        id: region.id,
        label: region.name,
        icon: 'location-outline' as const,
      })),
    [],
  );

  const districtOptions = useMemo(
    () =>
      districts.map((name) => ({
        id: name,
        label: name,
        icon: 'navigate-outline' as const,
      })),
    [districts],
  );

  return (
    <View style={styles.wrap}>
      <FeedAppearanceBanner />
      <TrustVacationPromoSlot placement="feed" compact />
      <View style={styles.topBar}>
        <FeedHeaderAvatarButton />
        <View style={styles.titleBlock}>
          <Text variant="h3" style={styles.title}>
            Akış
          </Text>
          <Text secondary variant="caption" numberOfLines={1}>
            {regionName}
            {district ? ` · ${district}` : ''}
          </Text>
        </View>

        <View style={styles.topActions}>
          <FeatureGate featureId="feed-header-leaderboard">
            <FeedIconButton
              icon="trophy-outline"
              compact
              onPress={() => router.push('/leaderboard' as never)}
            />
          </FeatureGate>
          <FeatureGate featureId="feed-header-incidents">
            <IncidentsHeaderButton regionId={regionId} />
          </FeatureGate>
          <FeatureGate featureId="feed-header-map">
            <MapHeaderButton />
          </FeatureGate>
          <FeatureGate featureId="feed-header-search">
            <FeedIconButton
              icon={showSearch ? 'close-outline' : 'search-outline'}
              compact
              onPress={() => setShowSearch((v) => !v)}
            />
          </FeatureGate>
          <FeatureGate featureId="notifications">
            <FeedIconButton
              icon="notifications-outline"
              badge={unreadCount}
              compact
              onPress={() => router.push('/notifications' as never)}
            />
          </FeatureGate>
        </View>
      </View>

      {showSearch ? (
        <FeatureGate featureId="feed-header-search">
        <View style={[styles.searchWrap, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Akışta ara..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery ? (
            <InstantPressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </InstantPressable>
          ) : null}
        </View>
        </FeatureGate>
      ) : null}

      <View style={styles.metaRow}>
        {showRegionFilter ? (
          <InstantPressable
            style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
            onPress={() => setShowRegionPicker(true)}
          >
            <Ionicons name="location-outline" size={13} color={colors.primary} />
            <Text variant="caption" style={{ fontWeight: '600' }} numberOfLines={1}>
              {regionName}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
          </InstantPressable>
        ) : null}

        {showDistrictFilter ? (
          <InstantPressable
            style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
            onPress={() => setShowDistrictPicker(true)}
          >
            <Ionicons name="navigate-outline" size={13} color={colors.accent} />
            <Text variant="caption" style={{ fontWeight: '600' }} numberOfLines={1}>
              {district ?? FEED_ALL_DISTRICTS_LABEL}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
          </InstantPressable>
        ) : null}
      </View>

      <AnnouncementStrip />

      <LocationOptionSheet<RegionId>
        visible={showRegionPicker}
        onClose={() => setShowRegionPicker(false)}
        title="İl seç"
        value={regionId}
        options={regionOptions}
        onSelect={setRegionId}
        allOption={{ label: FEED_ALL_REGIONS_LABEL, icon: 'earth-outline' }}
        searchPlaceholder="İl ara…"
      />

      <LocationOptionSheet
        visible={showDistrictPicker}
        onClose={() => setShowDistrictPicker(false)}
        title="İlçe seç"
        subtitle={regionId ? regionName : FEED_ALL_REGIONS_LABEL}
        value={district}
        options={districtOptions}
        onSelect={setDistrict}
        allOption={{ label: FEED_ALL_DISTRICTS_LABEL, icon: 'navigate-outline' }}
        searchPlaceholder="İlçe ara…"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    alignItems: 'center',
  },
  title: {
    letterSpacing: -0.3,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
});
