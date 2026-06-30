import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { formatServicePrice, VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import type { AiRequestAssistResult } from '@/features/vora-hizmetler/types';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AiRequestAssistPanelProps = {
  result: AiRequestAssistResult | null;
  loading?: boolean;
};

export function AiRequestAssistPanel({ result, loading }: AiRequestAssistPanelProps) {
  const { colors } = useTheme();

  if (loading) {
    return (
      <GlassCard style={styles.card}>
        <View style={styles.loadingRow}>
          <ActivityIndicator color={VORA_HIZMETLER_ACCENT} size="small" />
          <Text secondary variant="caption">
            Yapay zekâ analiz ediyor…
          </Text>
        </View>
      </GlassCard>
    );
  }

  if (!result) return null;

  return (
    <GlassCard style={[styles.card, { borderColor: `${VORA_HIZMETLER_ACCENT}40` }]}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={18} color={VORA_HIZMETLER_ACCENT} />
        <Text variant="label" style={{ color: VORA_HIZMETLER_ACCENT }}>
          Yapay Zekâ Destekli Talep
        </Text>
      </View>

      <View style={styles.grid}>
        <AssistItem label="Kategori" value={result.categoryLabel} icon="grid-outline" />
        <AssistItem label="Tahmini süre" value={result.estimatedDuration} icon="time-outline" />
        <AssistItem
          label="Yakındaki ustalar"
          value={`${result.nearbyProviders} kişi`}
          icon="people-outline"
        />
        <AssistItem
          label="Tahmini fiyat"
          value={`${formatServicePrice(result.estimatedPriceMin)} – ${formatServicePrice(result.estimatedPriceMax)}`}
          icon="cash-outline"
        />
      </View>
    </GlassCard>
  );
}

function AssistItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.item, { backgroundColor: colors.surfaceElevated }]}>
      <Ionicons name={icon} size={16} color={VORA_HIZMETLER_ACCENT} />
      <Text secondary variant="caption">
        {label}
      </Text>
      <Text variant="caption" style={{ fontWeight: '700' }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  item: {
    width: '48%',
    padding: spacing.md,
    borderRadius: 12,
    gap: 4,
  },
});
