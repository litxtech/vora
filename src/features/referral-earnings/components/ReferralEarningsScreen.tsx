import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { ReferralInviteeCard } from '@/features/referral-earnings/components/ReferralInviteeCard';
import {
  REFERRAL_GRADIENT,
  REFERRAL_INVITED_BY_ROUTE,
  formatReferralCents,
} from '@/features/referral-earnings/constants';
import {
  fetchReferralInvitees,
  fetchReferralUserSummary,
} from '@/features/referral-earnings/services/referralData';
import type { ReferralInviteeRow, ReferralUserSummary } from '@/features/referral-earnings/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

function StatTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const { colors } = useTheme();
  return (
    <GlassCard style={styles.statTile}>
      <Text variant="caption" secondary>
        {label}
      </Text>
      <Text variant="h3" style={{ color: accent ?? colors.text }}>
        {value}
      </Text>
    </GlassCard>
  );
}

export function ReferralEarningsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [summary, setSummary] = useState<ReferralUserSummary | null>(null);
  const [invitees, setInvitees] = useState<ReferralInviteeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const [nextSummary, nextInvitees] = await Promise.all([
      fetchReferralUserSummary(),
      fetchReferralInvitees(),
    ]);
    setSummary(nextSummary);
    setInvitees(nextInvitees);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCopy = async () => {
    if (!summary?.inviteCode) return;
    await Clipboard.setStringAsync(summary.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <GradientBackground>
      <AuthHeader title="Hakediş" subtitle="Davet et, kazan" showBack />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />
        }
      >
        {loading ? (
          <Text secondary variant="body" style={styles.centered}>
            Yükleniyor…
          </Text>
        ) : (
          <>
            <LinearGradient colors={[...REFERRAL_GRADIENT]} style={styles.hero}>
              <Text variant="caption" style={styles.heroCaption}>
                Davet başına hakediş
              </Text>
              <Text variant="h1" style={styles.heroAmount}>
                {formatReferralCents(summary?.rewardAmountCents ?? 0)}
              </Text>
              {summary?.inviteCode ? (
                <Pressable onPress={() => void handleCopy()} style={styles.codeRow}>
                  <Text variant="body" style={styles.codeText}>
                    {summary.inviteCode}
                  </Text>
                  <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color="#fff" />
                </Pressable>
              ) : null}
            </LinearGradient>

            <View style={styles.statsGrid}>
              <StatTile label="Toplam Davet" value={String(summary?.totalInvites ?? 0)} />
              <StatTile
                label="Bekleyen"
                value={String(summary?.pendingCount ?? 0)}
                accent={colors.warning}
              />
              <StatTile
                label="Hak Edilen"
                value={String(summary?.earnedCount ?? 0)}
                accent={colors.success}
              />
              <StatTile label="Ödenen" value={String(summary?.paidCount ?? 0)} accent={colors.primary} />
              <StatTile label="Reddedilen" value={String(summary?.rejectedCount ?? 0)} accent={colors.error} />
              <StatTile
                label="Toplam Kazanç"
                value={formatReferralCents(summary?.totalPaidCents ?? 0)}
                accent={colors.success}
              />
            </View>

            <GlassCard style={styles.totalCard}>
              <Text variant="caption" secondary>
                Toplam Hakediş (bekleyen + onaylı)
              </Text>
              <Text variant="h2" style={{ color: colors.primary }}>
                {formatReferralCents(
                  (summary?.pendingEarningsCents ?? 0) + (summary?.approvedEarningsCents ?? 0),
                )}
              </Text>
            </GlassCard>

            <View style={styles.actions}>
              <Button
                title="Beni Davet Eden"
                variant="secondary"
                onPress={() => router.push(REFERRAL_INVITED_BY_ROUTE)}
              />
              <Button title="Yenile" variant="ghost" onPress={() => void load(true)} loading={refreshing} />
            </View>

            <Text variant="label" style={styles.sectionTitle}>
              Davet Ettiklerin
            </Text>

            {invitees.length === 0 ? (
              <GlassCard style={styles.empty}>
                <Ionicons name="people-outline" size={28} color={colors.textMuted} />
                <Text variant="body" secondary>
                  Henüz davetli yok. Kodunu paylaşarak başla.
                </Text>
              </GlassCard>
            ) : (
              invitees.map((row) => <ReferralInviteeCard key={row.commissionId} row={row} />)
            )}
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  centered: { textAlign: 'center', marginTop: spacing.xl },
  hero: { borderRadius: 20, padding: spacing.lg, gap: spacing.sm },
  heroCaption: { color: 'rgba(255,255,255,0.85)' },
  heroAmount: { color: '#fff', fontWeight: '800' },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  codeText: { color: '#fff', fontWeight: '700', letterSpacing: 0.5 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statTile: { width: '48%', flexGrow: 1, gap: spacing.xs },
  totalCard: { gap: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm },
  sectionTitle: { marginTop: spacing.sm },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
});
