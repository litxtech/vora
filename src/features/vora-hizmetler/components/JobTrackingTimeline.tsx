import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { SERVICE_STATUS_FLOW, SERVICE_STATUS_LABELS, VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import type { ServiceRequestStatus } from '@/features/vora-hizmetler/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type JobTrackingTimelineProps = {
  currentStatus: ServiceRequestStatus;
};

export function JobTrackingTimeline({ currentStatus }: JobTrackingTimelineProps) {
  const { colors } = useTheme();
  const currentIndex = SERVICE_STATUS_FLOW.indexOf(currentStatus);
  const progress = currentIndex >= 0 ? (currentIndex / (SERVICE_STATUS_FLOW.length - 1)) * 100 : 0;

  return (
    <View style={styles.wrap}>
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <LinearGradient
          colors={[VORA_HIZMETLER_ACCENT, '#38BDF8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${Math.max(progress, 8)}%` }]}
        />
      </View>

      <View style={styles.stepsRow}>
        {SERVICE_STATUS_FLOW.map((status, index) => {
          const isPast = index <= currentIndex;
          const isCurrent = status === currentStatus;

          return (
            <View key={status} style={styles.stepCol}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isPast ? VORA_HIZMETLER_ACCENT : colors.surfaceElevated,
                    borderColor: isCurrent ? VORA_HIZMETLER_ACCENT : isPast ? VORA_HIZMETLER_ACCENT : colors.border,
                  },
                  isCurrent && styles.dotCurrent,
                ]}
              >
                {isPast && !isCurrent ? (
                  <Ionicons name="checkmark" size={10} color="#fff" />
                ) : isCurrent ? (
                  <View style={styles.dotInner} />
                ) : null}
              </View>
              <Text
                variant="caption"
                numberOfLines={2}
                style={[
                  styles.stepLabel,
                  {
                    fontWeight: isCurrent ? '800' : '500',
                    color: isPast ? colors.text : colors.textSecondary,
                  },
                ]}
              >
                {SERVICE_STATUS_LABELS[status]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  stepCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCurrent: {
    width: 22,
    height: 22,
    borderRadius: 11,
    shadowColor: VORA_HIZMETLER_ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  stepLabel: {
    textAlign: 'center',
    fontSize: 9,
    lineHeight: 12,
  },
});
