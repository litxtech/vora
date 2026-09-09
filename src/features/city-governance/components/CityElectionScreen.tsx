import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import {
  ElectionCandidateCard,
  openCandidateProfile,
} from '@/features/city-governance/components/ElectionCandidateCard';
import { CITY_GOVERNANCE_ACCENT } from '@/features/city-governance/constants';
import { CITY_ELECTIONS_FEATURE } from '@/features/city-governance/featureFlags';
import { useCityElection } from '@/features/city-governance/hooks/useCityElection';
import {
  applyCityElectionCandidacy,
  castCityElectionVote,
  electionStatusLabel,
  finalizeCityElection,
  formatElectionCountdown,
} from '@/features/city-governance/services/cityElections';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { canAdmin } from '@/constants/roles';
import { useTheme } from '@/providers/ThemeProvider';

type CityElectionScreenProps = {
  electionId: string;
};

export function CityElectionScreen({ electionId }: CityElectionScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { requireAuth } = useRequireAuth();
  const electionsVisible = useFeatureVisible(CITY_ELECTIONS_FEATURE.id);
  const { detail, loading, error, reload } = useCityElection(electionId, user?.id ?? null);
  const [statement, setStatement] = useState('');
  const [busy, setBusy] = useState(false);

  const onApply = async () => {
    if (!(await requireAuth('Adaylık'))) return;
    if (!statement.trim()) {
      Alert.alert('Adaylık', 'Kısa bir seçim mesajı yaz.');
      return;
    }
    setBusy(true);
    try {
      await applyCityElectionCandidacy(electionId, statement.trim());
      setStatement('');
      await reload();
    } catch (err) {
      Alert.alert('Adaylık', err instanceof Error ? err.message : 'Adaylık başarısız');
    } finally {
      setBusy(false);
    }
  };

  const onVote = async (candidateUserId: string) => {
    if (!(await requireAuth('Oy kullanma'))) return;
    Alert.alert('Oy Kullan', 'Seçimin geri alınamaz. Devam edilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Oy Ver',
        onPress: () => {
          setBusy(true);
          void castCityElectionVote(electionId, candidateUserId)
            .then(() => reload())
            .catch((err) => {
              Alert.alert('Oy', err instanceof Error ? err.message : 'Oy kullanılamadı');
            })
            .finally(() => setBusy(false));
        },
      },
    ]);
  };

  const onFinalize = async () => {
    setBusy(true);
    try {
      await finalizeCityElection(electionId);
      await reload();
      Alert.alert('Seçim', 'Seçim sonuçlandırıldı.');
    } catch (err) {
      Alert.alert('Seçim', err instanceof Error ? err.message : 'Sonuçlandırılamadı');
    } finally {
      setBusy(false);
    }
  };

  if (!electionsVisible) {
    return (
      <GradientBackground>
        <View style={[styles.centered, { paddingTop: insets.top + spacing.xl }]}>
          <ScreenBackButton />
          <GlassCard style={styles.emptyCard}>
            <Text variant="h3">Seçimler kapalı</Text>
            <Text secondary>Bu ortamda şehir seçimleri henüz aktif değil.</Text>
          </GlassCard>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} />}
      >
        <ScreenBackButton />

        {loading && !detail ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}

        {error ? (
          <GlassCard style={styles.emptyCard}>
            <Text variant="h3">Seçim bulunamadı</Text>
            <Text secondary>{error}</Text>
          </GlassCard>
        ) : null}

        {detail ? (
          <>
            <View style={styles.hero}>
              <Text variant="caption" style={{ color: CITY_GOVERNANCE_ACCENT, fontWeight: '700' }}>
                {detail.regionName.toUpperCase()} · SEÇİM
              </Text>
              <Text variant="h1" style={styles.title}>
                {detail.title}
              </Text>
              {detail.description ? <Text secondary>{detail.description}</Text> : null}
              <View style={styles.statusRow}>
                <StatusChip label={electionStatusLabel(detail.status)} />
                <Text secondary variant="caption">
                  {detail.status === 'nomination'
                    ? `Adaylık · ${formatElectionCountdown(detail.nominationEndsAt)}`
                    : detail.status === 'voting'
                      ? `Oy · ${formatElectionCountdown(detail.endsAt)}`
                      : null}
                </Text>
              </View>
            </View>

            {!detail.isEligible && user ? (
              <GlassCard style={styles.noticeCard}>
                <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
                <Text secondary variant="caption" style={styles.noticeText}>
                  Oy kullanmak veya aday olmak için aktif şehir üyesi olmalı ve hesabın seçim
                  kurallarına uygun olmalıdır.
                </Text>
              </GlassCard>
            ) : null}

            {detail.canApply ? (
              <GlassCard style={styles.card}>
                <Text variant="h3">Aday Ol</Text>
                <Text secondary>Kısa seçim mesajın seçmenler tarafından görülecek.</Text>
                <Input
                  value={statement}
                  onChangeText={setStatement}
                  placeholder="Trabzon'u Vora'nın en aktif şehri yapacağız."
                  multiline
                />
                <Button onPress={() => void onApply()} loading={busy}>
                  Adaylığı Gönder
                </Button>
              </GlassCard>
            ) : null}

            <GlassCard style={styles.card}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people-outline" size={18} color={CITY_GOVERNANCE_ACCENT} />
                <Text variant="h3">Adaylar</Text>
              </View>

              {detail.candidates.length === 0 ? (
                <Text secondary>Henüz aday yok. İlk aday sen olabilirsin.</Text>
              ) : (
                detail.candidates.map((candidate) => (
                  <ElectionCandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    selected={detail.myVoteCandidateUserId === candidate.userId}
                    disabled={!detail.canVote || busy}
                    showVotes={detail.status === 'counting' || detail.status === 'completed'}
                    onVote={
                      detail.canVote && candidate.status === 'approved'
                        ? () => void onVote(candidate.userId)
                        : undefined
                    }
                    onOpenProfile={() => openCandidateProfile(candidate.username)}
                  />
                ))
              )}
            </GlassCard>

            {profile?.role && canAdmin(profile.role) &&
            (detail.status === 'voting' || detail.status === 'counting') ? (
              <GlassCard style={styles.card}>
                <Text variant="label">Admin</Text>
                <Button variant="outline" onPress={() => void onFinalize()} loading={busy}>
                  Seçimi Sonuçlandır
                </Button>
              </GlassCard>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </GradientBackground>
  );
}

function StatusChip({ label }: { label: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: `${CITY_GOVERNANCE_ACCENT}20` }]}>
      <Text style={{ color: CITY_GOVERNANCE_ACCENT, fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  hero: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  title: {
    fontWeight: '900',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noticeCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  noticeText: {
    flex: 1,
  },
  emptyCard: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
