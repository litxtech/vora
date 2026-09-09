import { ActivityIndicator, Alert, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { CityLeaderChip } from '@/features/city-governance/components/CityLeaderChip';
import {
  CityActionTile,
  CityPageShell,
  CitySectionTitle,
  CitySurfaceCard,
} from '@/features/city-governance/components/cityUi';
import {
  CITY_GOVERNANCE_ACCENT,
  cityAgendaPath,
  cityElectionPath,
  formatCityStatCount,
} from '@/features/city-governance/constants';
import { CITY_ELECTIONS_FEATURE, CITY_SYSTEM_FEATURE } from '@/features/city-governance/featureFlags';
import {
  electionStatusLabel,
  formatElectionCountdown,
} from '@/features/city-governance/services/cityElections';
import {
  useCityMembershipActions,
  useCityOverview,
} from '@/features/city-governance/hooks/useCityOverview';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';

type CityScreenProps = {
  slug: string;
};

export function CityScreen({ slug }: CityScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuth();
  const cityVisible = useFeatureVisible(CITY_SYSTEM_FEATURE.id);
  const electionsVisible = useFeatureVisible(CITY_ELECTIONS_FEATURE.id);
  const { overview, loading, error, reload } = useCityOverview(slug, user?.id ?? null);
  const { busy, join, leave } = useCityMembershipActions(overview?.id ?? null, reload);

  const onJoin = async () => {
    if (!(await requireAuth('Şehre katılma'))) return;
    try {
      await join();
    } catch (err) {
      Alert.alert('Katılım', err instanceof Error ? err.message : 'Şehre katılınamadı');
    }
  };

  const onLeave = async () => {
    if (!(await requireAuth('Şehirden ayrılma')) || !overview) return;
    Alert.alert(
      'Şehirden Ayrıl',
      `${overview.name} şehir topluluğundan ayrılmak istediğine emin misin?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Ayrıl',
          style: 'destructive',
          onPress: () => {
            void leave().catch((err) => {
              Alert.alert('Hata', err instanceof Error ? err.message : 'Ayrılınamadı');
            });
          },
        },
      ],
    );
  };

  const openLeaderProfile = () => {
    if (!overview?.leader) return;
    router.push(`/u/${overview.leader.username}`);
  };

  if (!cityVisible) {
    return (
      <GradientBackground>
        <View style={[styles.centered, { paddingTop: insets.top + spacing.xl }]}>
          <ScreenBackButton />
          <GlassCard style={styles.emptyCard}>
            <Text variant="h3">Yakında</Text>
            <Text secondary style={styles.emptyText}>
              Şehir sistemi bu ortamda henüz açılmadı.
            </Text>
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  if (loading && !overview) {
    return (
      <GradientBackground>
        <View style={[styles.centered, { paddingTop: insets.top + spacing.xxl }]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </GradientBackground>
    );
  }

  if (error || !overview) {
    return (
      <GradientBackground>
        <View style={[styles.centered, { paddingTop: insets.top + spacing.xl, paddingHorizontal: spacing.lg }]}>
          <ScreenBackButton />
          <CitySurfaceCard style={styles.emptyCard}>
            <Text variant="h3">Şehir bulunamadı</Text>
            <Text secondary>{error ?? 'Bu şehir kaydı yok.'}</Text>
          </CitySurfaceCard>
        </View>
      </GradientBackground>
    );
  }

  const statsHeader = (
    <View style={styles.statsRow}>
      <StatPill icon="people-outline" label={`${formatCityStatCount(overview.memberCount)} üye`} colors={colors} />
      <StatPill
        icon="radio-button-on"
        label={`${formatCityStatCount(overview.activeCount)} aktif`}
        accent={CITY_GOVERNANCE_ACCENT}
        colors={colors}
      />
    </View>
  );

  return (
    <CityPageShell
      slug={overview.slug}
      regionName={overview.name}
      regionLabel={overview.regionLabel}
      activeTab="home"
      subtitle="Liderlik, meclis ve şehir diplomasi"
      headerExtra={statsHeader}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} />}
    >
      <CitySurfaceCard style={styles.card}>
        <CitySectionTitle title="Şehir Lideri" icon="ribbon-outline" />
        {overview.leader ? (
          <CityLeaderChip leader={overview.leader} onPress={openLeaderProfile} />
        ) : (
          <EmptyBlock title={`${overview.name} sessiz`} body="İlk lider seçildiğinde burada görünecek." />
        )}
        {overview.myRole === 'leader' ? (
          <View style={[styles.youLead, { backgroundColor: `${CITY_GOVERNANCE_ACCENT}15` }]}>
            <Text style={{ color: CITY_GOVERNANCE_ACCENT, fontWeight: '700' }}>Bu şehrin liderisin</Text>
            <Button onPress={() => router.push(`/city/${overview.slug}/leader`)}>Lider Paneli</Button>
          </View>
        ) : null}
      </CitySurfaceCard>

      {electionsVisible && overview.activeElection ? (
        <CitySurfaceCard style={styles.card}>
          <CitySectionTitle title="Aktif Seçim" icon="checkbox-outline" />
          <Text variant="label">{overview.activeElection.title}</Text>
          <Text secondary variant="caption">
            {electionStatusLabel(overview.activeElection.status)}
            {' · '}
            {overview.activeElection.status === 'nomination'
              ? formatElectionCountdown(overview.activeElection.nominationEndsAt)
              : formatElectionCountdown(overview.activeElection.endsAt)}
          </Text>
          <Button onPress={() => router.push(cityElectionPath(overview.slug, overview.activeElection!.id))}>
            Seçime Git
          </Button>
        </CitySurfaceCard>
      ) : null}

      <View style={styles.actionList}>
        <CityActionTile
          icon="git-network-outline"
          title="Diplomasi"
          subtitle="Diğer şehirlerle ilişki kur"
          onPress={() => router.push(`/city/${overview.slug}/diplomacy`)}
        />
        <CityActionTile
          icon="business-outline"
          title="Meclis"
          subtitle="Öneri ver, oturumlara katıl"
          onPress={() => router.push(`/city/${overview.slug}/council`)}
        />
        <CityActionTile
          icon="time-outline"
          title="Şehir Tarihi"
          subtitle="Liderler ve önemli olaylar"
          onPress={() => router.push(`/city/${overview.slug}/history`)}
        />
        <CityActionTile
          icon="flame-outline"
          title="Vora Gündem"
          subtitle="Bölgesel canlı gündem akışı"
          onPress={() => router.push(cityAgendaPath())}
        />
        {overview.myRole === 'leader' ? (
          <CityActionTile
            icon="ribbon-outline"
            title="Lider Paneli"
            subtitle="Diplomasi talepleri ve ortak odalar"
            accent={CITY_GOVERNANCE_ACCENT}
            badge="Lider"
            onPress={() => router.push(`/city/${overview.slug}/leader`)}
          />
        ) : null}
      </View>

      <CitySurfaceCard style={styles.card}>
        <CitySectionTitle title="Aidiyet" icon="heart-outline" />
        {overview.isMember ? (
          <>
            <Text secondary>
              {overview.isPrimaryCity ? 'Ana şehrin' : 'Üyesisin'} ·{' '}
              {overview.myRole === 'leader' ? 'Lider' : 'Vatandaş'}
            </Text>
            {overview.myRole !== 'leader' ? (
              <Button variant="outline" onPress={() => void onLeave()} loading={busy}>
                Şehirden Ayrıl
              </Button>
            ) : null}
          </>
        ) : overview.governanceStatus === 'coming_soon' ? (
          <EmptyBlock title="Yakında açılacak" body={`${overview.name} şehir topluluğu henüz aktif değil.`} />
        ) : (
          <>
            <Text secondary>
              Katıl, seçimlere oy ver, meclis gündemini takip et ve şehir topluluğunun parçası ol.
            </Text>
            <Button onPress={() => void onJoin()} loading={busy}>
              {overview.name}&apos;a Katıl
            </Button>
          </>
        )}
      </CitySurfaceCard>
    </CityPageShell>
  );
}

function StatPill({
  icon,
  label,
  accent,
  colors,
}: {
  icon: 'people-outline' | 'radio-button-on';
  label: string;
  accent?: string;
  colors: { textSecondary: string };
}) {
  return (
    <View style={styles.statPill}>
      <Text variant="caption" style={{ color: accent ?? colors.textSecondary, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

function EmptyBlock({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyBlock}>
      <Text variant="label">{title}</Text>
      <Text secondary variant="caption">
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  card: {
    gap: spacing.md,
  },
  actionList: {
    gap: spacing.sm,
  },
  emptyBlock: {
    gap: spacing.xs,
  },
  emptyCard: {
    gap: spacing.sm,
    width: '100%',
  },
  emptyText: {
    marginTop: spacing.xs,
  },
  youLead: {
    borderRadius: 12,
    padding: spacing.sm,
    gap: spacing.sm,
  },
});
