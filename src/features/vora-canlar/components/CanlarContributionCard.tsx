import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { CANLAR_ACCENT, formatMinor } from '@/features/vora-canlar/constants';
import { DONATION_TOTAL_DEFINITION } from '@/features/vora-canlar/services/money';
import { loadContributionStats } from '@/features/vora-canlar/services/api';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { spacing } from '@/constants/theme';
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

export function CanlarContributionCard({
  userId,
  isOwnProfile,
  onNavigate,
  style,
}: {
  userId: string;
  isOwnProfile: boolean;
  onNavigate?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
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

  const openCanlar = () => {
    onNavigate?.();
    router.push('/vora-canlar' as never);
  };

  return (
    <View
      style={[
        styles.button,
        style,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={spoken}
        onPress={openCanlar}
        style={({ pressed }) => [styles.mainHit, { opacity: pressed ? 0.82 : 1 }]}
      >
        <View style={styles.mark}>
          <Ionicons name="paw" size={18} color={CANLAR_ACCENT} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>
            Vora Canlar
          </Text>
          <Text secondary numberOfLines={2} style={styles.line}>
            {indicators.map((item) => `${item.value} ${item.label.toLocaleLowerCase('tr-TR')}`).join('  ·  ')}
          </Text>
        </View>
      </Pressable>
      {isOwnProfile ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gizlilik ayarları"
          hitSlop={8}
          onPress={() => {
            onNavigate?.();
            router.push('/vora-canlar/privacy' as never);
          }}
          style={styles.iconHit}
        >
          <Ionicons name="options-outline" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
      <Pressable
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no"
        onPress={openCanlar}
        style={styles.chevronHit}
      >
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${CANLAR_ACCENT}22`,
  },
  mainHit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  title: { fontWeight: '800', fontSize: 16 },
  line: { fontSize: 13, lineHeight: 18 },
  iconHit: { padding: 4 },
  chevronHit: { padding: 4 },
});
