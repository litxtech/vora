import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type PostUploadProgressPanelProps = {
  progress: number;
  message: string;
  etaSec?: number | null;
  onCancel?: () => void;
  compact?: boolean;
};

export function PostUploadProgressPanel({
  progress,
  message,
  etaSec,
  onCancel,
  compact = false,
}: PostUploadProgressPanelProps) {
  const { colors } = useTheme();
  const pct = Math.round(Math.min(Math.max(progress, 0), 1) * 100);

  return (
    <View
      style={[
        styles.wrap,
        compact ? styles.wrapCompact : styles.wrapFull,
        { backgroundColor: `${colors.surface}EE`, borderColor: colors.border },
      ]}
    >
      <View style={styles.row}>
        <ActivityIndicator size="small" color={colors.primary} />
        <View style={styles.textCol}>
          <Text variant="caption" style={styles.message}>
            {message}
          </Text>
          <Text variant="caption" secondary>
            %{pct}
            {etaSec != null && etaSec > 0 ? ` · ~${etaSec} sn` : ''}
          </Text>
        </View>
        {onCancel ? (
          <Pressable
            onPress={onCancel}
            hitSlop={10}
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Yüklemeyi iptal et"
          >
            <Ionicons name="close" size={16} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${pct}%`,
              backgroundColor: colors.primary,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  wrapFull: {
    marginTop: spacing.xs,
  },
  wrapCompact: {
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  message: {
    fontWeight: '600',
  },
  cancelBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
});
