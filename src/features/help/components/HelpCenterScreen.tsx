import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { CenterShell } from '@/features/centers/components/CenterShell';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { useFeatureTabFilter } from '@/features/feature-flags/hooks/useFeatureTabFilter';
import { useNestedFeatureTabFilter } from '@/features/feature-flags/hooks/useNestedFeatureTabFilter';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { HELP_FEATURE } from '@/features/help/featureFlags';
import {
  HELP_CATEGORIES,
  HELP_CENTER_MODE_TABS,
  HELP_CREATE_PATH,
  HELP_TABS,
  URGENCY_COLORS,
  helpRequestDetailPath,
  volunteerTeamDetailPath,
  type HelpCategory,
  type HelpCenterMode,
  type HelpRequest,
} from '@/features/help/constants';
import { fetchHelpRequests } from '@/features/help/services/helpData';
import {
  VOLUNTEER_CATEGORIES,
  VOLUNTEER_TABS,
  type VolunteerCategory,
  type VolunteerTeam,
} from '@/features/volunteer/constants';
import { fetchVolunteerTeams } from '@/features/volunteer/services/volunteerData';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

function HelpCard({ item }: { item: HelpRequest }) {
  const cat = HELP_CATEGORIES[item.category];
  const urgencyColor = URGENCY_COLORS[item.urgency];
  return (
    <Pressable onPress={() => router.push(helpRequestDetailPath(item.id) as never)}>
      <GlassCard style={[styles.card, { borderLeftWidth: 3, borderLeftColor: urgencyColor }]}>
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: `${cat.color}22` }]}>
            <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={20} color={cat.color} />
          </View>
          <View style={styles.meta}>
            <Text variant="label">{item.title}</Text>
            <Text variant="caption" style={{ color: cat.color }}>{cat.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={cat.color} />
        </View>
        <Text secondary variant="caption" numberOfLines={2}>{item.description}</Text>
        {item.contactInfo ? (
          <View style={styles.contact}>
            <Ionicons name="call" size={14} color={cat.color} />
            <Text variant="caption" style={{ color: cat.color }}>{item.contactInfo}</Text>
          </View>
        ) : null}
      </GlassCard>
    </Pressable>
  );
}

function TeamCard({ team }: { team: VolunteerTeam }) {
  const cat = VOLUNTEER_CATEGORIES[team.category];
  return (
    <Pressable onPress={() => router.push(volunteerTeamDetailPath(team.id) as never)}>
      <GlassCard style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: `${cat.color}22` }]}>
            <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={20} color={cat.color} />
          </View>
          <View style={styles.meta}>
            <Text variant="label">{team.name}</Text>
            <Text variant="caption" style={{ color: cat.color }}>{cat.label}</Text>
          </View>
          <View style={styles.members}>
            <Ionicons name="people" size={14} color={cat.color} />
            <Text variant="caption">{team.memberCount}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={cat.color} />
        </View>
        {team.description ? <Text secondary variant="caption" numberOfLines={2}>{team.description}</Text> : null}
      </GlassCard>
    </Pressable>
  );
}

export function HelpCenterScreen() {
  const { profile } = useAuth();
  const { colors } = useTheme();
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

  const load = useCallback(async () => {
    setLoading(true);
    if (mode === 'requests') {
      setItems(await fetchHelpRequests(profile?.region_id ?? null, helpTab));
    } else {
      setTeams(await fetchVolunteerTeams(profile?.region_id ?? null, volunteerTab));
    }
    setLoading(false);
  }, [mode, profile?.region_id, helpTab, volunteerTab]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = useCallback(async () => {
    if (!(await requireAuth('Yardım talebi oluşturma'))) return;
    router.push(HELP_CREATE_PATH as never);
  }, [requireAuth]);

  const activeTab = mode === 'requests' ? helpTab : volunteerTab;
  const tabs = mode === 'requests' ? visibleHelpTabs : visibleVolunteerTabs;
  const hasContent = mode === 'requests' ? items.length > 0 : teams.length > 0;

  return (
    <CenterShell
      title="Yardım & Gönüllülük"
      subtitle="Yardım talepleri, kan ihtiyacı ve gönüllü ekipler"
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
          ? 'Henüz yardım talebi yok. İlk talebi siz paylaşın.'
          : 'Bu bölgede kayıtlı gönüllü ekip bulunamadı.'
      }
      onCreate={mode === 'requests' && showCreate ? handleCreate : undefined}
      createLabel="Talep Oluştur"
      headerExtra={
        <View style={styles.modeRow}>
          {visibleModes.map((item) => {
            const selected = mode === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setMode(item.id)}
                style={[
                  styles.modeChip,
                  {
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? 'rgba(30,136,229,0.12)' : colors.surface,
                  },
                ]}
              >
                <Ionicons
                  name={item.icon as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color={selected ? colors.primary : colors.textMuted}
                />
                <Text variant="caption" style={{ color: selected ? colors.primary : colors.textSecondary }}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      }
    >
      {mode === 'requests'
        ? items.map((item) => <HelpCard key={item.id} item={item} />)
        : teams.map((team) => <TeamCard key={team.id} team={team} />)}
    </CenterShell>
  );
}

const styles = StyleSheet.create({
  modeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1, gap: 2 },
  members: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contact: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
