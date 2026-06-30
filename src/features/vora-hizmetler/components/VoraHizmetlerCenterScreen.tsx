import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { ActiveJobsPanel } from '@/features/vora-hizmetler/components/ActiveJobsPanel';
import { DiscoverProvidersPanel } from '@/features/vora-hizmetler/components/DiscoverProvidersPanel';
import { HizmetOffersPanel } from '@/features/vora-hizmetler/components/HizmetOffersPanel';
import { HizmetQuickActions } from '@/features/vora-hizmetler/components/HizmetQuickActions';
import { HizmetSubTabBar } from '@/features/vora-hizmetler/components/HizmetSubTabBar';
import { HizmetlerBrandHeader } from '@/features/vora-hizmetler/components/HizmetlerBrandHeader';
import { JobListingsPanel } from '@/features/vora-hizmetler/components/JobListingsPanel';
import { MyListingsPanel } from '@/features/vora-hizmetler/components/MyListingsPanel';
import { VORA_HIZMETLER_FEATURE } from '@/features/vora-hizmetler/featureFlags';
import {
  HIZMET_HUB_TABS,
  VORA_HIZMETLER_ACCENT,
} from '@/features/vora-hizmetler/constants';
import { useMyProviderProfile } from '@/features/vora-hizmetler/hooks/useProviderProfile';
import { useServiceRequests } from '@/features/vora-hizmetler/hooks/useServiceRequests';
import type { ServiceHubTab } from '@/features/vora-hizmetler/types';
import { useFeatureTabFilter } from '@/features/feature-flags/hooks/useFeatureTabFilter';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import type { RegionId } from '@/constants/regions';
import { spacing } from '@/constants/theme';

function parseHubTab(tabParam?: string): ServiceHubTab {
  if (
    tabParam === 'active' ||
    tabParam === 'providers' ||
    tabParam === 'mine' ||
    tabParam === 'offers'
  ) {
    return tabParam;
  }
  if (tabParam === 'jobs' || tabParam === 'discover' || tabParam === 'requests') return 'jobs';
  return 'jobs';
}

export function VoraHizmetlerCenterScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const params = useLocalSearchParams<{ tab?: string; role?: string }>();
  const { requireAuth } = useRequireAuth();
  const [hubTab, setHubTab] = useState<ServiceHubTab>(() => parseHubTab(params.tab));

  const showDiscover = useFeatureVisible(VORA_HIZMETLER_FEATURE.section.discover);
  const showCreate = useFeatureVisible(VORA_HIZMETLER_FEATURE.section.create);
  const showMap = useFeatureVisible(VORA_HIZMETLER_FEATURE.section.map);
  const showEmergency = useFeatureVisible(VORA_HIZMETLER_FEATURE.section.emergency);
  const visibleHubTabs = useFeatureTabFilter('vora-hizmetler', HIZMET_HUB_TABS);

  useEffect(() => {
    if (!visibleHubTabs.some((tab) => tab.id === hubTab)) {
      setHubTab(visibleHubTabs[0]?.id ?? 'jobs');
    }
  }, [visibleHubTabs, hubTab]);

  const { provider } = useMyProviderProfile(user?.id ?? null);
  const { loading: jobsLoading, reloadListings: reloadJobs } = useServiceRequests({
    regionId: profile?.region_id ?? null,
  });
  const { reloadListings: reloadMine } = useServiceRequests({
    requesterId: user?.id ?? undefined,
  });

  useEffect(() => {
    if (params.tab) {
      setHubTab(parseHubTab(params.tab));
    }
  }, [params.tab]);

  const activeHint = HIZMET_HUB_TABS.find((tab) => tab.id === hubTab)?.hint ?? '';

  const handleCreate = useCallback(async () => {
    if (!(await requireAuth('İlan verme'))) return;
    router.push('/vora-hizmetler/create-request' as never);
  }, [requireAuth]);

  const refreshActiveTab = useCallback(async () => {
    if (hubTab === 'jobs') await reloadJobs();
    if (hubTab === 'mine') await reloadMine();
  }, [hubTab, reloadJobs, reloadMine]);

  const renderContent = () => {
    switch (hubTab) {
      case 'jobs':
        return (
          <JobListingsPanel
            regionId={profile?.region_id ?? null}
            providerId={provider?.id ?? null}
          />
        );
      case 'active':
        return (
          <ActiveJobsPanel
            providerId={provider?.id ?? null}
            userId={user?.id ?? null}
          />
        );
      case 'providers':
        if (!showDiscover) {
          return (
            <Text secondary variant="body" style={styles.empty}>
              Usta listesi şu an kullanılamıyor.
            </Text>
          );
        }
        return <DiscoverProvidersPanel regionId={profile?.region_id ?? null} />;
      case 'mine':
        if (!showCreate) {
          return (
            <Text secondary variant="body" style={styles.empty}>
              İlan verme şu an kullanılamıyor.
            </Text>
          );
        }
        return <MyListingsPanel userId={user?.id ?? null} onCreatePress={handleCreate} />;
      case 'offers':
        return (
          <HizmetOffersPanel
            userId={user?.id ?? null}
            providerId={provider?.id ?? null}
            variant="all"
          />
        );
      default:
        return null;
    }
  };

  return (
    <GradientBackground>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.page,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          hubTab === 'jobs' || hubTab === 'mine' ? (
            <AppRefreshControl refreshing={jobsLoading} onRefresh={refreshActiveTab} />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
      >
        <ScreenBackButton />
        <HizmetlerBrandHeader subtitle="İş ilanları · ustalar · teklifler — tek ekranda, sade liste" />

        <HizmetSubTabBar
          tabs={visibleHubTabs}
          value={hubTab}
          onChange={(tab) => setHubTab(tab as ServiceHubTab)}
          accent={VORA_HIZMETLER_ACCENT}
        />

        {activeHint ? (
          <View style={[styles.tabHint, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text secondary variant="caption" style={styles.tabHintText}>
              {activeHint}
            </Text>
          </View>
        ) : null}

        <HizmetQuickActions
          regionId={(profile?.region_id ?? 'trabzon') as RegionId}
          showMap={showMap}
          showEmergency={showEmergency}
        />

        {renderContent()}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.lg,
  },
  tabHint: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  tabHintText: {
    textAlign: 'center',
    lineHeight: 17,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
