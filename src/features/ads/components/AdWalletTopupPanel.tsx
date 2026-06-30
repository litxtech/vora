import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import {
  AD_CPC_CENTS,
  AD_SESSION_HOURS,
  AD_TOPUP_PRESETS_CENTS,
  estimateClicksFromBudget,
  formatBudget,
  formatCpcKurus,
  parseTopupAmountTry,
  validateTopupAmountCents,
} from '@/features/ads/constants';
import { useAdWalletTopup } from '@/features/ads/hooks/useAdWalletTopup';
import { formatWalletBalance } from '@/features/ads/services/adBilling';
import type { AdWalletSummary } from '@/features/ads/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  wallet: AdWalletSummary;
  variant?: 'full' | 'compact';
};

const ACCENT = '#7C3AED';

export function AdWalletTopupPanel({ wallet, variant = 'full' }: Props) {
  const { colors } = useTheme();
  const { topup, isLoading, isPresetLoading } = useAdWalletTopup();
  const [customAmount, setCustomAmount] = useState('');

  const estimatedClicks = estimateClicksFromBudget(wallet.balanceCents, wallet.cpcCents);
  const presets = useMemo(
    () => AD_TOPUP_PRESETS_CENTS.filter((c) => c >= wallet.minTopupCents),
    [wallet.minTopupCents],
  );

  const handlePreset = (amountCents: number) => {
    if (isLoading) return;
    void topup(amountCents);
  };

  const handleCustomTopup = () => {
    const cents = parseTopupAmountTry(customAmount);
    if (cents === null) {
      Alert.alert('Geçersiz tutar', 'Lütfen geçerli bir tutar girin.');
      return;
    }
    const validationError = validateTopupAmountCents(cents, wallet.minTopupCents);
    if (validationError) {
      Alert.alert('Geçersiz tutar', validationError);
      return;
    }
    void topup(cents).then((ok) => {
      if (ok) setCustomAmount('');
    });
  };

  const customBusy = isLoading && !presets.some((p) => isPresetLoading(p));

  if (variant === 'compact') {
    return (
      <View style={[styles.compactWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.compactHeader}>
          <Text variant="caption" style={{ fontWeight: '700' }}>
            {formatWalletBalance(wallet.balanceCents)}
          </Text>
          <Text secondary variant="caption" style={{ fontSize: 10 }}>
            · {formatCpcKurus(wallet.cpcCents)}/tıklama
          </Text>
        </View>
        <View style={styles.presetRow}>
          {presets.slice(0, 4).map((amountCents) => {
            const busy = isPresetLoading(amountCents);
            return (
              <Pressable
                key={amountCents}
                disabled={isLoading}
                onPress={() => handlePreset(amountCents)}
                style={({ pressed }) => [
                  styles.presetChipSm,
                  {
                    borderColor: busy ? ACCENT : colors.border,
                    backgroundColor: busy ? `${ACCENT}18` : colors.surfaceElevated,
                    opacity: pressed || isLoading ? 0.7 : 1,
                  },
                ]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={ACCENT} />
                ) : (
                  <Text variant="caption" style={{ fontWeight: '700', fontSize: 11 }}>
                    {formatBudget(amountCents)}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <GlassCard style={styles.card}>
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: `${ACCENT}16` }]}>
          <Ionicons name="wallet-outline" size={28} color={ACCENT} />
        </View>
        <View style={styles.heroCopy}>
          <Text secondary variant="caption">
            Reklam cüzdanı bakiyesi
          </Text>
          <Text variant="h2" style={{ fontWeight: '800', letterSpacing: -0.5 }}>
            {formatWalletBalance(wallet.balanceCents)}
          </Text>
          <Text secondary variant="caption">
            ~{estimatedClicks.toLocaleString('tr-TR')} tıklama · {formatCpcKurus(wallet.cpcCents)} · oturum{' '}
            {AD_SESSION_HOURS} sa
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.section}>
        <Text variant="label">Hızlı yükleme</Text>
        <Text secondary variant="caption" style={styles.sectionHint}>
          Paket seçin; ödeme uygulama içinde açılır.
        </Text>
        <View style={styles.presetGrid}>
          {presets.map((amountCents) => {
            const busy = isPresetLoading(amountCents);
            const clicks = estimateClicksFromBudget(amountCents, AD_CPC_CENTS);
            return (
              <Pressable
                key={amountCents}
                disabled={isLoading}
                onPress={() => handlePreset(amountCents)}
                style={({ pressed }) => [
                  styles.presetTile,
                  {
                    borderColor: busy ? ACCENT : colors.border,
                    backgroundColor: busy ? `${ACCENT}12` : colors.surfaceElevated,
                    opacity: pressed || (isLoading && !busy) ? 0.65 : 1,
                  },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={ACCENT} style={{ marginVertical: 8 }} />
                ) : (
                  <>
                    <Text variant="label" style={{ color: ACCENT, fontWeight: '800' }}>
                      {formatBudget(amountCents)}
                    </Text>
                    <Text secondary variant="caption" style={{ fontSize: 10 }}>
                      ~{clicks.toLocaleString('tr-TR')} tıklama
                    </Text>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="label">İstediğiniz tutar</Text>
        <Text secondary variant="caption" style={styles.sectionHint}>
          Min. {formatBudget(wallet.minTopupCents)} — max. {formatBudget(1_000_000)}
        </Text>
        <View style={styles.customRow}>
          <View style={styles.customInput}>
            <Input
              label="Tutar (₺)"
              value={customAmount}
              onChangeText={setCustomAmount}
              placeholder="Örn. 150"
              keyboardType="decimal-pad"
            />
          </View>
          <Button
            title={customBusy ? '…' : 'Yükle'}
            size="compact"
            fullWidth={false}
            loading={customBusy}
            disabled={isLoading && !customBusy}
            onPress={handleCustomTopup}
            style={styles.customBtn}
          />
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, padding: spacing.md },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1, gap: 2 },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -spacing.xs,
  },
  section: { gap: spacing.sm },
  sectionHint: { marginTop: -4, lineHeight: 16 },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  presetTile: {
    width: '31%',
    minWidth: 96,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 2,
    minHeight: 64,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  presetChipSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    minWidth: 52,
    alignItems: 'center',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  customInput: { flex: 1 },
  customBtn: {
    marginBottom: spacing.xs,
    minWidth: 88,
  },
  compactWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
