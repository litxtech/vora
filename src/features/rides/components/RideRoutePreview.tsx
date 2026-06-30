import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { rideCityName, RIDES_ACCENT } from '@/features/rides/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type RideRoutePreviewProps = {
  fromCityId: string;
  toCityId: string;
  stopCityIds?: string[];
  compact?: boolean;
};

export function RideRoutePreview({ fromCityId, toCityId, stopCityIds = [], compact = false }: RideRoutePreviewProps) {
  const { colors } = useTheme();
  const stops = stopCityIds.filter((id) => id && id !== fromCityId && id !== toCityId);
  const nodes = [fromCityId, ...stops, toCityId];

  if (compact) {
    const label = nodes.map((id) => rideCityName(id)).join(' → ');
    return (
      <Text variant="caption" numberOfLines={2} style={{ color: RIDES_ACCENT, fontWeight: '700' }}>
        {label}
      </Text>
    );
  }

  return (
    <View style={[styles.wrap, { backgroundColor: `${RIDES_ACCENT}10`, borderColor: `${RIDES_ACCENT}33` }]}>
      <View style={styles.row}>
        {nodes.map((cityId, index) => {
          const isFirst = index === 0;
          const isLast = index === nodes.length - 1;
          const isStop = !isFirst && !isLast;

          return (
            <View key={`${cityId}-${index}`} style={styles.nodeGroup}>
              {index > 0 ? (
                <View style={styles.connector}>
                  <View style={[styles.line, { backgroundColor: RIDES_ACCENT }]} />
                  <Ionicons name="chevron-forward" size={12} color={RIDES_ACCENT} />
                </View>
              ) : null}
              <View style={styles.nodeCol}>
                <View
                  style={[
                    styles.dot,
                    isFirst && styles.dotFrom,
                    isLast && styles.dotTo,
                    isStop && styles.dotStop,
                  ]}
                >
                  <Ionicons
                    name={isFirst ? 'navigate' : isLast ? 'flag' : 'ellipse'}
                    size={isStop ? 6 : 12}
                    color="#fff"
                  />
                </View>
                <Text variant="caption" numberOfLines={2} style={[styles.cityLabel, { color: colors.text }]}>
                  {rideCityName(cityId)}
                </Text>
                {isFirst ? (
                  <Text variant="caption" secondary style={styles.roleLabel}>
                    Nereden
                  </Text>
                ) : isLast ? (
                  <Text variant="caption" secondary style={styles.roleLabel}>
                    Nereye
                  </Text>
                ) : (
                  <Text variant="caption" secondary style={styles.roleLabel}>
                    Durak
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  nodeGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    maxWidth: '100%',
  },
  connector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 2,
    gap: 2,
  },
  line: {
    width: 12,
    height: 2,
    borderRadius: 1,
  },
  nodeCol: {
    alignItems: 'center',
    maxWidth: 88,
    minWidth: 64,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RIDES_ACCENT,
  },
  dotFrom: { backgroundColor: '#1565C0' },
  dotTo: { backgroundColor: '#F07167' },
  dotStop: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: `${RIDES_ACCENT}CC`,
  },
  cityLabel: {
    textAlign: 'center',
    fontWeight: '700',
    marginTop: 4,
    fontSize: 11,
    lineHeight: 14,
  },
  roleLabel: {
    fontSize: 10,
    marginTop: 1,
  },
});
