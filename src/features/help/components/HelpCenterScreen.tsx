import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { CenterShell } from '@/features/centers/components/CenterShell';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useFeatureTabFilter } from '@/features/feature-flags/hooks/useFeatureTabFilter';
import { useNestedFeatureTabFilter } from '@/features/feature-flags/hooks/useNestedFeatureTabFilter';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { HelpCenterHero } from '@/features/help/components/HelpCenterHero';
import { HelpCenterModeSwitcher } from '@/features/help/components/HelpCenterModeSwitcher';
import { HelpRequestCard } from '@/features/help/components/HelpRequestCard';
import { HELP_FEATURE } from '@/features/help/featureFlags';
import {
  HELP_CENTER_MODE_TABS,
  HELP_CREATE_PATH,
  HELP_TABS,
  type HelpCategory,
  type HelpCenterMode,
  type HelpRequest,
} from '@/features/help/constants';
import { fetchHelpRequests } from '@/features/help/services/helpData';
import { VOLUNTEER_TABS, type VolunteerCategory, type VolunteerTeam } from '@/features/volunteer/constants';
import { VolunteerTeamCard } from '@/features/volunteer/components/VolunteerTeamCard';
import { fetchVolunteerTeams } from '@/features/volunteer/services/volunteerData';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export function HelpCenterScreen() {
  const { profile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const [mode, setMode] = useState<HelpCenterMode>('requests');
  const [helpTab, setHelpTab] = useState<HelpCategory | 'all'>('all');
  const [volunteerTab, setVolunteerTab] = useState<VolunteerCategory | 'all'>('all');
  const [items, setItems] = useState<HelpRequest[]>([]);
  const [teams, setTeams] = useState<VolunteerTeam[]>([]);
  const [loading, setLoading] = useState(true);

  const showCreate = useFeatureVisible(HELP_FEATURE.section.create);
  const visibleModes = useFeatureTabFilter('help', HELP_CENTER_MODE_TABS);
  const visibleHelpTabs = useNestedFeatureTabFilter(HELP_FEATURE.tab('requests'), HELP_TABS);
  const visibleVolunteerTabs = useNestedFeatureTabFilter(HELP_FEATURE.tab('teams'), VOLUNTEER_TABS);

  useEffect(() => {
    if (!visibleModes.some((m) => m.id === mode)) {
      setMode(visibleModes[0]?.id ?? 'requests');
    }
  }, [visibleModes, mode]);

  useEffect(() => {
    if (mode === 'requests' && !visibleHelpTabs.some((t) => t.id === helpTab)) {
      setHelpTab(visibleHelpTabs[0]?.id ?? 'all');
    }
    if (mode === 'teams' && !visibleVolunteerTabs.some((t) => t.id === volunteerTab)) {
      setVolunteerTab(visibleVolunteerTabs[0]?.id ?? 'all');
    }
  }, [mode, visibleHelpTabs, visibleVolunteerTabs, helpTab, volunteerTab]);

  const regionId = profile?.region_id ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    const [requests, teamRows] = await Promise.all([
      fetchHelpRequests(regionId, helpTab),
      fetchVolunteerTeams(regionId, volunteerTab),
    ]);
    setItems(requests);
    setTeams(teamRows);
    setLoading(false);
  }, [helpTab, regionId, volunteerTab]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = useCallback(async () => {
    if (!(await requireAuth('Yardım talebi oluşturma'))) return;
    router.push(HELP_CREATE_PATH as never);
  }, [requireAuth]);

  const activeTab = mode === 'requests' ? helpTab : volunteerTab;
  const tabs = mode === 'requests' ? visibleHelpTabs : visibleVolunteerTabs;
  const listData = mode === 'requests' ? items : teams;
  const hasContent = listData.length > 0;

  return (
    <CenterShell
      title="Yardım & Gönüllülük"
      subtitle="Topluluktan destek alın veya gönüllü olun"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(t) => {
        if (mode === 'requests') setHelpTab(t as HelpCategory | 'all');
        else setVolunteerTab(t as VolunteerCategory | 'all');
      }}
      loading={loading}
      onRefresh={load}
      hasContent={hasContent}
      emptyIcon={mode === 'requests' ? 'heart-outline' : 'people-outline'}
      emptyMessage={
        mode === 'requests'
          ? 'Henüz yardım talebi yok. İlk talebi siz paylaşarak topluluğa ulaşın.'
          : 'Bu bölgede kayıtlı gönüllü ekip bulunamadı.'
      }
      onCreate={mode === 'requests' && showCreate ? handleCreate : undefined}
      createLabel="Yardım Talebi Oluştur"
      headerExtra={
        <View style={styles.headerStack}>
          <HelpCenterHero requestCount={items.length} teamCount={teams.length} mode={mode} />
          <HelpCenterModeSwitcher modes={visibleModes} active={mode} onChange={setMode} />
        </View>
      }
      listData={listData}
      listKeyExtractor={(item) => item.id}
      renderListItem={({ item }) => (
        <View style={styles.listItem}>
          {mode === 'requests' ? (
            <HelpRequestCard item={item as HelpRequest} />
          ) : (
            <VolunteerTeamCard team={item as VolunteerTeam} />
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  headerStack: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  listItem: {
    marginBottom: spacing.md,
  },
});
