import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { REFERRAL_ROUTE, formatReferralCents } from '@/features/referral-earnings/constants';
import {
  fetchReferralWalletSummary,
  requestReferralPayout,
} from '@/features/referral-earnings/services/referralData';
import type { ReferralWalletSummary } from '@/features/referral-earnings/types';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { WALLET_FEATURE } from '@/features/wallet/featureFlags';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function ReferralWalletPanel() {
  const { colors } = useTheme();
  const showReferralDetail = useFeatureVisible(WALLET_FEATURE.referralDetail);
  const showReferralWithdraw = useFeatureVisible(WALLET_FEATURE.referralWithdraw);
  const [wallet, setWallet] = useState<ReferralWalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setWallet(await fetchReferralWalletSummary());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleWithdraw = async () => {
    if (!wallet || wallet.withdrawableCents < wallet.minWithdrawCents) {
      Alert.alert(
        'Çekim yapılamaz',
        `Minimum çekim tutarı ${formatReferralCents(wallet?.minWithdrawCents ?? 0)}`,
      );
      return;
    }

    setWithdrawing(true);
    const result = await requestReferralPayout(wallet.withdrawableCents);
    setWithdrawing(false);

    if (!result.ok) {
      Alert.alert('Hata', result.error);
      return;
    }

    Alert.alert('Talep alındı', 'Çekim talebiniz işleme alındı.');
    void load();
  };

  if (loading) {
    return (
      <GlassCard style={styles.card}>
        <Text variant="caption" secondary>
          Hakediş yükleniyor…
        </Text>
      </GlassCard>
    );
  }

  if (!wallet) return null;

  const hasActivity =
    wallet.pendingEarningsCents > 0 ||
    wallet.approvedEarningsCents > 0 ||
    wallet.paidCents > 0;

  if (!hasActivity) return null;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Text variant="label">Hakediş</Text>
        {showReferralDetail ? (
          <Button title="Detay" variant="ghost" onPress={() => router.push(REFERRAL_ROUTE)} />
        ) : null}
      </View>
      <View style={styles.row}>
        <WalletStat label="Bekleyen" value={formatReferralCents(wallet.pendingEarningsCents)} />
        <WalletStat
          label="Onaylanan"
          value={formatReferralCents(wallet.approvedEarningsCents)}
          accent={colors.primary}
        />
        <WalletStat
          label="Ödenebilir"
          value={formatReferralCents(wallet.withdrawableCents)}
          accent={colors.success}
        />
      </View>
      {showReferralWithdraw && wallet.withdrawableCents >= wallet.minWithdrawCents ? (
        <Button
          title={`Çekim Talep Et (${formatReferralCents(wallet.withdrawableCents)})`}
          onPress={() => void handleWithdraw()}
          loading={withdrawing}
        />
      ) : !showReferralWithdraw ? null : (
        <Text variant="caption" secondary>
          Minimum çekim: {formatReferralCents(wallet.minWithdrawCents)}
        </Text>
      )}
    </GlassCard>
  );
}

function WalletStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <Text variant="caption" secondary>
        {label}
      </Text>
      <Text variant="label" style={{ color: accent ?? colors.text }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, gap: 2 },
});
