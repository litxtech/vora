import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { CANLAR_ACCENT, formatMinor } from '@/features/vora-canlar/constants';
import { DONATION_TOTAL_DEFINITION } from '@/features/vora-canlar/services/money';
import { loadContributionStats } from '@/features/vora-canlar/services/api';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Stats = {
  animals_supported: number | null;
  verified_rescues: number | null;
  donation_net_of_refunds_minor: number | null;
  in_kind_count: number | null;
  verified_in_kind_value_minor: number | null;
  volunteer_count: number | null;
};

function showCount(value: number | null) {
  return value == null ? 'gizli' : String(value);
}

function compactMoney(minor: number) {
  const sign = minor < 0 ? '-' : '';
  const lira = Math.trunc(Math.abs(minor) / 100);
  return `${sign}${lira.toLocaleString('tr-TR')} ₺`;
}

export function CanlarContributionCard({ userId, isOwnProfile }: { userId: string; isOwnProfile: boolean }) {
  const visible = useFeatureVisible('vora-canlar');
  const { colors } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!visible) return;
    void loadContributionStats(userId).then((result) => {
      if (result.data) setStats(result.data as unknown as Stats);
    });
  }, [userId, visible]);

  if (!visible || !stats) return null;

  const indicators = [
    { key: 'animals', label: 'Hayvan', value: showCount(stats.animals_supported) },
    { key: 'rescues', label: 'Kurtarma', value: showCount(stats.verified_rescues) },
    {
      key: 'donation',
      label: 'Bağış',
      value:
        stats.donation_net_of_refunds_minor == null ? 'gizli' : compactMoney(stats.donation_net_of_refunds_minor),
    },
    { key: 'inkind', label: 'Ayni', value: showCount(stats.in_kind_count) },
    { key: 'volunteer', label: 'Gönüllü', value: showCount(stats.volunteer_count) },
  ];

  const spoken = [
    `Vora Canlar. Desteklenen hayvan ${showCount(stats.animals_supported)}.`,
    `Doğrulanmış kurtarma ${showCount(stats.verified_rescues)}.`,
    `Bağış ${stats.donation_net_of_refunds_minor == null ? 'gizli' : formatMinor(stats.donation_net_of_refunds_minor)}. ${DONATION_TOTAL_DEFINITION}`,
    stats.verified_in_kind_value_minor != null
      ? `Doğrulanmış ayni değer ${formatMinor(stats.verified_in_kind_value_minor)}.`
      : `Ayni yardım ${showCount(stats.in_kind_count)}.`,
    `Gönüllülük ${showCount(stats.volunteer_count)}.`,
  ].join(' ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      onPress={() => router.push('/vora-canlar' as never)}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <View style={styles.top}>
        <View style={styles.mark}>
          <Ionicons name="paw" size={16} color={CANLAR_ACCENT} />
        </View>
        <Text style={styles.title} numberOfLines={1}>
          Vora Canlar
        </Text>
        {isOwnProfile ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gizlilik ayarları"
            hitSlop={8}
            onPress={() => router.push('/vora-canlar/privacy' as never)}
            style={styles.iconHit}
          >
            <Ionicons name="options-outline" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
      <View style={styles.indicators}>
        {indicators.map((item) => (
          <View key={item.key} style={styles.indicator}>
            <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
              {item.value}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 10 }} numberOfLines={1}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  mark: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${CANLAR_ACCENT}22`,
  },
  title: { flex: 1, color: CANLAR_ACCENT, fontWeight: '800', fontSize: 15 },
  indicators: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  indicator: { flex: 1, alignItems: 'center', minWidth: 0 },
  value: { fontSize: 13, fontWeight: '800' },
  iconHit: { padding: 2 },
});
