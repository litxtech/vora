import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { CenterShell } from '@/features/centers/components/CenterShell';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { ApplicationCard } from '@/features/personnel-center/components/ApplicationCard';
import { EmployerApplicationCard } from '@/features/personnel-center/components/EmployerApplicationCard';
import { ListingCard } from '@/features/personnel-center/components/ListingCard';
import { PersonnelChipBar } from '@/features/personnel-center/components/PersonnelChipBar';
import { PersonnelHireBar } from '@/features/personnel-center/components/PersonnelHireBar';
import { PersonnelHubSelector } from '@/features/personnel-center/components/PersonnelHubSelector';
import { PersonnelLiveStrip } from '@/features/personnel-center/components/PersonnelLiveStrip';
import { PersonnelSearchBar } from '@/features/personnel-center/components/PersonnelSearchBar';
import { SavedSearchesPanel } from '@/features/personnel-center/components/SavedSearchesPanel';
import { SeekerCard } from '@/features/personnel-center/components/SeekerCard';
import {
  PERSONNEL_APPLICATIONS_VIEWS,
  PERSONNEL_CENTER_DEF,
  PERSONNEL_HUBS,
  PERSONNEL_SEEK_FILTERS,
  PERSONNEL_TAB_EMPTY_ICONS,
  PERSONNEL_TAB_EMPTY_MESSAGES,
  resolvePersonnelDataTab,
} from '@/features/personnel-center/constants';
import { useFeatureTabFilter } from '@/features/feature-flags/hooks/useFeatureTabFilter';
import { useNestedFeatureTabFilter } from '@/features/feature-flags/hooks/useNestedFeatureTabFilter';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { PERSONNEL_FEATURE } from '@/features/personnel-center/featureFlags';
import { usePersonnelTab } from '@/features/personnel-center/hooks/usePersonnelTab';
import { countPendingIncomingApplications } from '@/features/personnel-center/services/applicationData';
import { fetchFavoriteIds, toggleFavorite } from '@/features/personnel-center/services/favoriteData';
import { savePersonnelSearch } from '@/features/personnel-center/services/savedSearchData';
import {
  matchesListingSearch,
  matchesSeekerSearch,
} from '@/features/personnel-center/services/personnelActions';
import type {
  EmployerApplication,
  JobApplication,
  JobSeekerListing,
  PersonnelApplicationsView,
  PersonnelHub,
  PersonnelListing,
  PersonnelSeekFilter,
  PersonnelTab,
} from '@/features/personnel-center/types';
import { REGIONS } from '@/constants/regions';
import { spacing, radius } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type PersonnelListRow =
  | { kind: 'section'; key: string; title: string }
  | { kind: 'employer_app'; key: string; application: EmployerApplication }
  | { kind: 'application'; key: string; application: JobApplication }
  | { kind: 'seeker'; key: string; seeker: JobSeekerListing }
  | { kind: 'listing'; key: string; listing: PersonnelListing };

export function PersonnelCenterScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [hub, setHub] = useState<PersonnelHub>('seek');
  const [seekFilter, setSeekFilter] = useState<PersonnelSeekFilter>('all');
  const [applicationsView, setApplicationsView] = useState<PersonnelApplicationsView>('incoming');
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [pendingIncoming, setPendingIncoming] = useState(0);
  const [liveRefreshNonce, setLiveRefreshNonce] = useState(0);

  const visibleHubs = useFeatureTabFilter('personnel-center', PERSONNEL_HUBS);
  const visibleSeekFilters = useNestedFeatureTabFilter(PERSONNEL_FEATURE.tab('seek'), PERSONNEL_SEEK_FILTERS);
  const visibleApplicationsViews = useNestedFeatureTabFilter(
    PERSONNEL_FEATURE.tab('applications'),
    PERSONNEL_APPLICATIONS_VIEWS,
  );
  const showCreateJob = useFeatureVisible(PERSONNEL_FEATURE.section.createJob);
  const showCreateStaff = useFeatureVisible(PERSONNEL_FEATURE.section.createStaff);
  const showHubSearch = useFeatureVisible(PERSONNEL_FEATURE.search);
  const showSaveSearch = useFeatureVisible(PERSONNEL_FEATURE.saveSearch);
  const showSavedSearchesPanel = useFeatureVisible(PERSONNEL_FEATURE.savedSearches);
  const showJobSeekerProfile = useFeatureVisible(PERSONNEL_FEATURE.jobSeekerProfile);
  const showCardFavorite = useFeatureVisible(PERSONNEL_FEATURE.cardFavorite);

  useEffect(() => {
    if (!visibleHubs.some((item) => item.id === hub)) {
      setHub(visibleHubs[0]?.id ?? 'seek');
    }
  }, [visibleHubs, hub]);

  useEffect(() => {
    if (hub === 'seek' && !visibleSeekFilters.some((item) => item.id === seekFilter)) {
      setSeekFilter(visibleSeekFilters[0]?.id ?? 'all');
    }
    if (hub === 'applications' && !visibleApplicationsViews.some((item) => item.id === applicationsView)) {
      setApplicationsView(visibleApplicationsViews[0]?.id ?? 'incoming');
    }
  }, [hub, visibleSeekFilters, visibleApplicationsViews, seekFilter, applicationsView]);

  const regionLabel = profile?.region_id
    ? (REGIONS.find((r) => r.id === profile.region_id)?.name ?? null)
    : null;

  const dataTab: PersonnelTab = useMemo(
    () => resolvePersonnelDataTab(hub, seekFilter, applicationsView),
    [applicationsView, hub, seekFilter],
  );

  const { listings, seekers, applications, incomingApplications, loading, error, refresh } = usePersonnelTab(
    dataTab,
    profile?.region_id ?? null,
    profile?.district ?? null,
    user?.id ?? null,
  );

  const handleRefresh = useCallback(() => {
    setLiveRefreshNonce((n) => n + 1);
    refresh();
  }, [refresh]);

  useEffect(() => {
    setSearchQuery('');
    setShowSavedSearches(false);
  }, [hub, seekFilter, applicationsView]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      countPendingIncomingApplications(user.id).then(setPendingIncoming);
      if (hub === 'applications') refresh();
    }, [hub, refresh, user?.id]),
  );

  useEffect(() => {
    if (!user?.id) {
      setFavoriteIds(new Set());
      setPendingIncoming(0);
      return;
    }
    fetchFavoriteIds(user.id).then(setFavoriteIds);
    countPendingIncomingApplications(user.id).then(setPendingIncoming);
  }, [user?.id, listings, incomingApplications.length]);

  const handleToggleFavorite = useCallback(
    async (listingType: 'job' | 'staff', listingId: string) => {
      if (!(await requireAuth('Favori')) || !user) return;
      const key = `${listingType}:${listingId}`;
      const wasFavorite = favoriteIds.has(key);
      const result = await toggleFavorite(user.id, listingType, listingId, wasFavorite);
      if (result.error) return;
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    [favoriteIds, requireAuth, user],
  );

  const filteredListings = useMemo(
    () => listings.filter((listing) => matchesListingSearch(listing, searchQuery)),
    [listings, searchQuery],
  );

  const filteredSeekers = useMemo(
    () => seekers.filter((seeker) => matchesSeekerSearch(seeker, searchQuery)),
    [seekers, searchQuery],
  );

  const isBusiness = profile?.account_type === 'business';
  const showSearch = showHubSearch && (hub === 'seek' || hub === 'hire');

  const handleSaveSearch = async () => {
    if (!(await requireAuth('Kayıtlı arama')) || !user) return;
    const result = await savePersonnelSearch({
      userId: user.id,
      regionId: profile?.region_id ?? null,
      queryText: searchQuery,
      district: profile?.district ?? null,
      urgentOnly: seekFilter === 'urgent',
      tab: dataTab,
    });
    if (result.error) Alert.alert('Hata', result.error);
    else Alert.alert('Kaydedildi', 'Yeni ilan geldiğinde bildirim alırsınız.');
  };

  const goCreateJob = async () => {
    if (!(await requireAuth('İlan'))) return;
    router.push('/personnel-center/create-job' as never);
  };

  const goCreateStaff = async () => {
    if (!(await requireAuth('İlan'))) return;
    router.push('/personnel-center/create-staff' as never);
  };

  const goJobSeekerProfile = async () => {
    if (!(await requireAuth('Profil'))) return;
    router.push('/settings/job-seeker' as never);
  };

  const openApplicationsHub = (view: PersonnelApplicationsView = 'incoming') => {
    setHub('applications');
    setApplicationsView(view);
  };

  const hasTabContent = useMemo(() => {
    if (showSavedSearches) return !!user;
    if (hub === 'applications') {
      if (!user) return false;
      return applicationsView === 'incoming'
        ? incomingApplications.length > 0
        : applications.length > 0;
    }
    if (hub === 'hire') return filteredSeekers.length > 0 || filteredListings.length > 0;
    return filteredListings.length > 0;
  }, [
    applications.length,
    applicationsView,
    filteredListings.length,
    filteredSeekers.length,
    hub,
    incomingApplications.length,
    showSavedSearches,
    user,
  ]);

  const hasAnyData =
    listings.length > 0 ||
    seekers.length > 0 ||
    applications.length > 0 ||
    incomingApplications.length > 0;

  const hasContent = !error && (hasAnyData || !loading);

  const emptyMessage = useMemo(() => {
    if (searchQuery) return 'Aramanızla eşleşen sonuç bulunamadı.';
    if (hub === 'applications' && !user) return 'Başvuruları görmek için giriş yapın.';
    if (hub === 'applications' && applicationsView === 'incoming') {
      return PERSONNEL_TAB_EMPTY_MESSAGES.incoming;
    }
    if (hub === 'applications') return PERSONNEL_TAB_EMPTY_MESSAGES.applications;
    if (hub === 'hire') return PERSONNEL_TAB_EMPTY_MESSAGES.hiring;
    return PERSONNEL_TAB_EMPTY_MESSAGES[dataTab] ?? 'Bu listede ilan bulunamadı.';
  }, [applicationsView, dataTab, hub, searchQuery, user]);

  const emptyIcon = useMemo(() => {
    if (hub === 'applications') {
      return applicationsView === 'incoming' ? 'mail-outline' : 'document-text-outline';
    }
    if (hub === 'hire') return 'people-outline';
    return PERSONNEL_TAB_EMPTY_ICONS[dataTab] ?? 'briefcase-outline';
  }, [applicationsView, dataTab, hub]);

  const renderListing = useCallback(
    (listing: PersonnelListing) => (
      <ListingCard
        listing={listing}
        isFavorite={favoriteIds.has(`${listing.type}:${listing.id}`)}
        onToggleFavorite={user && showCardFavorite ? () => handleToggleFavorite(listing.type, listing.id) : undefined}
        showApply={hub === 'seek'}
      />
    ),
    [favoriteIds, handleToggleFavorite, hub, showCardFavorite, user],
  );

  const listData = useMemo((): PersonnelListRow[] => {
    if (showSavedSearches) return [];

    if (hub === 'applications') {
      if (applicationsView === 'incoming') {
        return incomingApplications.map((app) => ({
          kind: 'employer_app' as const,
          key: app.id,
          application: app,
        }));
      }
      return applications.map((app) => ({
        kind: 'application' as const,
        key: app.id,
        application: app,
      }));
    }

    if (hub === 'hire') {
      const rows: PersonnelListRow[] = [];
      if (filteredSeekers.length > 0) {
        rows.push({
          kind: 'section',
          key: 'sec-seekers',
          title: `İş Arayanlar (${filteredSeekers.length})`,
        });
        for (const seeker of filteredSeekers) {
          rows.push({ kind: 'seeker', key: seeker.id, seeker });
        }
      }
      if (filteredListings.length > 0) {
        rows.push({
          kind: 'section',
          key: 'sec-listings',
          title: `Personel Talepleri (${filteredListings.length})`,
        });
        for (const listing of filteredListings) {
          rows.push({ kind: 'listing', key: `${listing.type}-${listing.id}`, listing });
        }
      }
      return rows;
    }

    return filteredListings.map((listing) => ({
      kind: 'listing' as const,
      key: `${listing.type}-${listing.id}`,
      listing,
    }));
  }, [
    applications,
    applicationsView,
    filteredListings,
    filteredSeekers,
    hub,
    incomingApplications,
    showSavedSearches,
  ]);

  const renderListItem = useCallback(
    ({ item }: { item: PersonnelListRow }) => {
      switch (item.kind) {
        case 'section':
          return (
            <Text variant="label" style={styles.sectionTitle}>
              {item.title}
            </Text>
          );
        case 'employer_app':
          return <EmployerApplicationCard application={item.application} />;
        case 'application':
          return <ApplicationCard application={item.application} />;
        case 'seeker':
          return <SeekerCard seeker={item.seeker} />;
        case 'listing':
          return renderListing(item.listing);
      }
    },
    [renderListing],
  );

  const renderCustomEmpty = () => {
    if (hasTabContent) return null;

    return (
      <GlassCard style={styles.empty}>
        <Ionicons
          name={emptyIcon as keyof typeof Ionicons.glyphMap}
          size={32}
          color={colors.textMuted}
        />
        <Text secondary style={styles.emptyText}>
          {emptyMessage}
        </Text>

        {hub === 'hire' && user && (showCreateJob || showCreateStaff) ? (
          <View style={styles.emptyActions}>
            {showCreateJob ? <Button title="İş İlanı Ver" onPress={goCreateJob} /> : null}
            {showCreateStaff ? (
              <Button title="Personel Talebi Oluştur" variant="outline" onPress={goCreateStaff} />
            ) : null}
          </View>
        ) : null}

        {hub === 'seek' && user && showJobSeekerProfile ? (
          <Button title="İş Arayan Profilimi Düzenle" variant="outline" onPress={goJobSeekerProfile} />
        ) : null}

        {hub === 'applications' && applicationsView === 'incoming' && user && (showCreateJob || showCreateStaff) ? (
          <Button title="İlan Ver" onPress={() => setHub('hire')} />
        ) : null}
      </GlassCard>
    );
  };


  const customEmpty = !hasTabContent ? renderCustomEmpty() : null;

  const hubBadgeCounts = useMemo(
    () => ({
      applications: pendingIncoming,
    }),
    [pendingIncoming],
  );

  const applicationsBadgeCounts = useMemo(
    () => ({
      incoming: pendingIncoming,
    }),
    [pendingIncoming],
  );

  return (
    <CenterShell
      title={PERSONNEL_CENTER_DEF.title}
      subtitle={PERSONNEL_CENTER_DEF.subtitle}
      loading={loading}
      error={error}
      onRefresh={handleRefresh}
      hasContent={hasContent}
      headerExtra={
        <>
          <PersonnelHubSelector
            value={hub}
            onChange={setHub}
            hubs={visibleHubs}
            badgeCounts={user ? hubBadgeCounts : undefined}
          />

          <PersonnelLiveStrip
            regionId={profile?.region_id ?? null}
            regionLabel={regionLabel}
            pendingIncoming={user ? pendingIncoming : 0}
            refreshNonce={liveRefreshNonce}
          />

          {isBusiness ? (
            <GlassCard style={styles.businessNote}>
              <Ionicons name="storefront-outline" size={16} color={colors.accent} />
              <Text variant="caption" style={{ color: colors.accent, flex: 1 }}>
                İşletme hesabı — ilanlarınız haritada ve akışta görünür.
              </Text>
            </GlassCard>
          ) : null}

          {hub === 'seek' ? (
            <>
              <PersonnelChipBar
                value={seekFilter}
                onChange={setSeekFilter}
                items={visibleSeekFilters}
                urgentIds={['urgent']}
              />
              {user && showJobSeekerProfile ? (
                <Pressable onPress={goJobSeekerProfile} style={styles.profileLink}>
                  <Ionicons name="person-circle-outline" size={16} color={colors.success} />
                  <Text variant="caption" style={{ color: colors.success, fontWeight: '700' }}>
                    İş arayan profilimi düzenle
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.success} />
                </Pressable>
              ) : null}
            </>
          ) : null}

          {hub === 'hire' ? (
            <PersonnelHireBar
              onCreateJob={goCreateJob}
              onCreateStaff={goCreateStaff}
              showCreateJob={showCreateJob}
              showCreateStaff={showCreateStaff}
            />
          ) : null}

          {hub === 'applications' && !user ? (
            <Text variant="caption" secondary style={styles.hubHint}>
              Gelen ve gönderdiğiniz başvuruları görmek için giriş yapın.
            </Text>
          ) : null}

          {hub === 'applications' && user ? (
            <PersonnelChipBar
              value={applicationsView}
              onChange={setApplicationsView}
              items={visibleApplicationsViews}
              badgeCounts={applicationsBadgeCounts}
            />
          ) : null}

          {hub === 'applications' && user ? (
            <Text variant="caption" secondary style={styles.hubHint}>
              {applicationsView === 'incoming'
                ? 'İlanlarınıza gelen başvuruları inceleyin, onaylayın veya reddedin.'
                : 'Gönderdiğiniz başvuruların durumunu buradan takip edin.'}
            </Text>
          ) : null}

          {showSearch ? (
            <View style={styles.searchRow}>
              <View style={styles.searchInput}>
                <PersonnelSearchBar
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={hub === 'hire' ? 'İş arayan veya ilan ara…' : 'İş ilanı ara…'}
                />
              </View>
              {hub === 'seek' && user && showSaveSearch ? (
                <>
                  <Pressable
                    onPress={() => void handleSaveSearch()}
                    style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  >
                    <Ionicons name="bookmark-outline" size={18} color={colors.primary} />
                  </Pressable>
                  {showSavedSearchesPanel ? (
                  <Pressable
                    onPress={() => setShowSavedSearches((v) => !v)}
                    style={[
                      styles.iconBtn,
                      {
                        borderColor: showSavedSearches ? colors.primary : colors.border,
                        backgroundColor: showSavedSearches ? `${colors.primary}14` : colors.surface,
                      },
                    ]}
                  >
                    <Ionicons
                      name={showSavedSearches ? 'list' : 'albums-outline'}
                      size={18}
                      color={colors.primary}
                    />
                  </Pressable>
                  ) : null}
                </>
              ) : null}
            </View>
          ) : null}

          {hub === 'applications' && pendingIncoming > 0 && applicationsView !== 'incoming' ? (
            <Pressable
              onPress={() => openApplicationsHub('incoming')}
              style={[styles.incomingNudge, { borderColor: colors.danger, backgroundColor: `${colors.danger}10` }]}
            >
              <Ionicons name="mail" size={16} color={colors.danger} />
              <Text variant="caption" style={{ color: colors.danger, fontWeight: '700', flex: 1 }}>
                {pendingIncoming} bekleyen gelen başvuru var
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.danger} />
            </Pressable>
          ) : null}
        </>
      }
      {...(showSavedSearches
        ? {}
        : {
            listData,
            renderListItem,
            listKeyExtractor: (item: PersonnelListRow) => item.key,
            listEmptyContent: customEmpty,
          })}
    >
      {showSavedSearches && showSavedSearchesPanel ? <SavedSearchesPanel /> : null}
    </CenterShell>
  );
}

const styles = StyleSheet.create({
  businessNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  hubHint: {
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  profileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingVertical: 4,
  },
  sectionTitle: { marginTop: spacing.xs },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1 },
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    width: 44,
  },
  incomingNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  empty: { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  emptyText: { textAlign: 'center' },
  emptyActions: { width: '100%', gap: spacing.sm },
});
