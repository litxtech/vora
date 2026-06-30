import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { HotelBrandHeader } from '@/features/hotel-center/components/HotelBrandHeader';
import { HotelCard } from '@/features/hotel-center/components/HotelCard';
import { HotelHubSelector } from '@/features/hotel-center/components/HotelHubSelector';
import { HotelLiveStrip } from '@/features/hotel-center/components/HotelLiveStrip';
import { HotelManageBar } from '@/features/hotel-center/components/HotelManageBar';
import { HotelTabBar } from '@/features/hotel-center/components/HotelTabBar';
import {
  HOTEL_ACCENT,
  HOTEL_BROWSE_TABS,
  HOTEL_HUBS,
  HOTEL_TAB_EMPTY_MESSAGES,
  hotelReservationsPath,
} from '@/features/hotel-center/constants';
import { useFeatureTabFilter } from '@/features/feature-flags/hooks/useFeatureTabFilter';
import { useNestedFeatureTabFilter } from '@/features/feature-flags/hooks/useNestedFeatureTabFilter';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { HOTEL_FEATURE } from '@/features/hotel-center/featureFlags';
import { fetchHotelListings, toggleHotelFavorite } from '@/features/hotel-center/services/hotelData';
import {
  campaignsByHotelId,
  fetchActiveHotelMarketingCampaigns,
  sortHotelsWithCampaigns,
} from '@/features/hotel-marketing/services/hotelMarketingCampaigns';
import { HotelMarketingStrip } from '@/features/hotel-marketing/components/HotelMarketingStrip';
import type { HotelMarketingCampaign } from '@/features/hotel-marketing/types';
import type { HotelFeedTab, HotelHub, HotelListing } from '@/features/hotel-center/types';
import { regionNameById } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { getAndroidFlatListPerfProps } from '@/lib/device/androidPerfProfile';

export function HotelCenterScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [hub, setHub] = useState<HotelHub>('browse');
  const [tab, setTab] = useState<HotelFeedTab>('explore');
  const [hotels, setHotels] = useState<HotelListing[]>([]);
  const [campaigns, setCampaigns] = useState<HotelMarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveRefreshNonce, setLiveRefreshNonce] = useState(0);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const listPerf = getAndroidFlatListPerfProps();

  const visibleHubs = useFeatureTabFilter('hotel-center', HOTEL_HUBS);
  const visibleBrowseTabs = useNestedFeatureTabFilter(HOTEL_FEATURE.tab('browse'), HOTEL_BROWSE_TABS);
  const showCreate = useFeatureVisible(HOTEL_FEATURE.section.create);
  const showGuestReservations = useFeatureVisible(HOTEL_FEATURE.guestReservations);
  const showManageReservations = useFeatureVisible(HOTEL_FEATURE.manageReservations);
  const showEarnings = useFeatureVisible(HOTEL_FEATURE.earnings);

  useEffect(() => {
    if (!visibleHubs.some((item) => item.id === hub)) {
      setHub(visibleHubs[0]?.id ?? 'browse');
    }
  }, [visibleHubs, hub]);

  useEffect(() => {
    if (hub === 'browse' && !visibleBrowseTabs.some((item) => item.id === tab)) {
      setTab(visibleBrowseTabs[0]?.id ?? 'explore');
    }
  }, [hub, visibleBrowseTabs, tab]);

  const regionLabel = regionNameById(profile?.region_id ?? 'trabzon') ?? 'Bölgeniz';
  const activeTab: HotelFeedTab = hub === 'manage' ? 'mine' : tab;

  const handleHubChange = useCallback((next: HotelHub) => {
    setHub(next);
    if (next === 'browse' && tab === 'mine') {
      setTab('explore');
    }
  }, [tab]);

  const load = useCallback(async () => {
    setLoading(true);
    let activeCoords = coords;
    if (activeTab === 'nearby' && !activeCoords) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        activeCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCoords(activeCoords);
      }
    }
    const [data, marketing] = await Promise.all([
      fetchHotelListings(activeTab, profile?.region_id ?? null, user?.id ?? null, activeCoords),
      hub === 'browse' ? fetchActiveHotelMarketingCampaigns(profile?.region_id ?? null) : Promise.resolve([]),
    ]);
    const campaignMap = campaignsByHotelId(marketing);
    const sorted = hub === 'browse' && activeTab !== 'mine'
      ? sortHotelsWithCampaigns(data, campaignMap)
      : data;
    setHotels(sorted);
    setCampaigns(marketing);
    setLoading(false);
  }, [activeTab, profile?.region_id, user?.id, coords, hub]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = useCallback(() => {
    setLiveRefreshNonce((n) => n + 1);
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!(await requireAuth('Otel ekleme'))) return;
    router.push('/hotel-center/create' as never);
  };

  const handleReservations = async () => {
    if (!(await requireAuth('Rezervasyonlar'))) return;
    const segment = hub === 'manage' ? 'owner' : 'guest';
    router.push(hotelReservationsPath(segment) as never);
  };

  const handleFavorite = async (hotel: HotelListing) => {
    if (!(await requireAuth('Favori')) || !user) return;
    const result = await toggleHotelFavorite(user.id, hotel.id, hotel.isFavorited ?? false);
    if (result.error) {
      Alert.alert('Hata', result.error);
      return;
    }
    void load();
  };

  const campaignMap = useMemo(() => campaignsByHotelId(campaigns), [campaigns]);

  const emptyMessage = useMemo(() => {
    if (hub === 'manage') return HOTEL_TAB_EMPTY_MESSAGES.mine;
    return HOTEL_TAB_EMPTY_MESSAGES[tab];
  }, [hub, tab]);

  return (
    <GradientBackground>
      <View style={[styles.page, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.topBar}>
          <ScreenBackButton onPress={() => router.back()} />
        </View>

        <FlatList
          data={hotels}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + spacing.xl },
            hotels.length === 0 && !loading && styles.emptyList,
          ]}
          refreshControl={<AppRefreshControl refreshing={loading} onRefresh={handleRefresh} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <HotelBrandHeader regionLabel={regionLabel} />
              <HotelHubSelector value={hub} onChange={handleHubChange} hubs={visibleHubs} />
              <HotelLiveStrip
                regionId={profile?.region_id ?? null}
                regionLabel={regionLabel}
                refreshNonce={liveRefreshNonce}
              />

              {hub === 'browse' ? (
                <>
                  {user && showGuestReservations ? (
                    <Pressable onPress={handleReservations} style={[styles.guestLink, { backgroundColor: `${HOTEL_ACCENT}10` }]}>
                      <Ionicons name="calendar-outline" size={16} color={HOTEL_ACCENT} />
                      <Text variant="caption" style={{ color: HOTEL_ACCENT, fontWeight: '700', flex: 1 }}>
                        Rezervasyonlarım
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={HOTEL_ACCENT} />
                    </Pressable>
                  ) : null}
                  {hub === 'browse' && campaigns.length > 0 ? (
                    <HotelMarketingStrip campaigns={campaigns} />
                  ) : null}
                  <HotelTabBar value={tab} onChange={setTab} tabs={visibleBrowseTabs} />
                </>
              ) : (
                <>
                  <HotelManageBar
                    onCreate={handleCreate}
                    onReservations={handleReservations}
                    showCreate={showCreate}
                    showReservations={showManageReservations}
                    showEarnings={showEarnings}
                  />
                  {!user ? (
                    <View style={[styles.authHint, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                      <Ionicons name="log-in-outline" size={16} color={colors.textMuted} />
                      <Text secondary variant="caption" style={{ flex: 1 }}>
                        Otel eklemek ve rezervasyon almak için giriş yapın.
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.loader}>
                <ActivityIndicator color={HOTEL_ACCENT} />
              </View>
            ) : (
              <View style={styles.empty}>
                <Text secondary variant="body">{emptyMessage}</Text>
                {hub === 'manage' && user && showCreate ? (
                  <Pressable onPress={handleCreate} style={[styles.emptyCta, { backgroundColor: HOTEL_ACCENT }]}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text variant="caption" style={styles.emptyCtaText}>
                      İlk otelinizi ekleyin
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            )
          }
          renderItem={({ item }) => (
            <HotelCard
              hotel={item}
              campaign={campaignMap.get(item.id) ?? null}
              onToggleFavorite={hub === 'browse' ? () => void handleFavorite(item) : undefined}
            />
          )}
          {...listPerf}
        />
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: spacing.lg },
  topBar: { marginBottom: spacing.xs },
  header: { gap: spacing.sm, marginBottom: spacing.md },
  list: { gap: spacing.md },
  emptyList: { flexGrow: 1 },
  loader: { paddingVertical: spacing.xl, alignItems: 'center' },
  empty: { paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.md },
  guestLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  authHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  emptyCtaText: {
    color: '#fff',
    fontWeight: '700',
  },
});
