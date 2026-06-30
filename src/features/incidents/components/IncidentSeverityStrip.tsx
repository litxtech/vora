import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { INCIDENT_SEVERITY } from '@/features/incidents/constants';
import type { IncidentGraphItem } from '@/features/incidents/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;

type Props = {
  incidents: IncidentGraphItem[];
  activeSeverity: string | null;
  onSelect: (severity: string | null) => void;
  /** Harita üzerine bindirilmiş açık-koyu varyant */
  overlay?: boolean;
};

export function IncidentSeverityStrip({ incidents, activeSeverity, onSelect, overlay = false }: Props) {
  const { colors } = useTheme();

  const counts = SEVERITY_ORDER.reduce<Record<string, number>>((acc, key) => {
    acc[key] = incidents.filter((item) => item.severity === key).length;
    return acc;
  }, {});

  const hasAny = SEVERITY_ORDER.some((key) => counts[key] > 0);
  if (!hasAny) return null;

  const allActive = !activeSeverity;

  return (
    <Animated.View entering={FadeInDown.delay(100).springify()}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Pressable
          onPress={() => onSelect(null)}
          style={[
            styles.chip,
            overlay && styles.overlayChip,
            overlay
              ? {
                  backgroundColor: allActive ? 'rgba(255,255,255,0.92)' : 'rgba(10,14,20,0.55)',
                  borderColor: allActive ? '#fff' : 'rgba(255,255,255,0.22)',
                }
              : {
                  backgroundColor: allActive ? `${colors.danger}18` : colors.surfaceElevated,
                  borderColor: allActive ? colors.danger : colors.border,
                },
          ]}
        >
          <Ionicons
            name="grid-outline"
            size={13}
            color={overlay ? (allActive ? '#0A0E14' : 'rgba(255,255,255,0.82)') : allActive ? colors.danger : colors.textMuted}
          />
          <Text
            variant="caption"
            style={{
              color: overlay ? (allActive ? '#0A0E14' : '#fff') : allActive ? colors.danger : colors.text,
              fontWeight: '700',
            }}
          >
            Tümü · {incidents.length}
          </Text>
        </Pressable>
        {SEVERITY_ORDER.map((key) => {
          if (counts[key] === 0) return null;
          const meta = INCIDENT_SEVERITY[key];
          const active = activeSeverity === key;
          return (
            <Pressable
              key={key}
              onPress={() => onSelect(active ? null : key)}
              style={[
                styles.chip,
                overlay && styles.overlayChip,
                overlay
                  ? {
                      backgroundColor: active ? `${meta.color}E6` : 'rgba(10,14,20,0.55)',
                      borderColor: active ? meta.color : 'rgba(255,255,255,0.22)',
                    }
                  : {
                      backgroundColor: active ? `${meta.color}20` : colors.surfaceElevated,
                      borderColor: active ? meta.color : colors.border,
                    },
              ]}
            >
              <Ionicons name={meta.icon} size={13} color={overlay ? (active ? '#fff' : meta.color) : meta.color} />
              <Text
                variant="caption"
                style={{
                  color: overlay ? '#fff' : active ? meta.color : colors.text,
                  fontWeight: '700',
                }}
              >
                {meta.label} · {counts[key]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  overlayChip: {
    paddingVertical: 6,
  },
});
