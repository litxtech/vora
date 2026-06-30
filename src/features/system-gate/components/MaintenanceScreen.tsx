import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import type { MaintenanceModeConfig } from '@/features/system-gate/types';
import { useTheme } from '@/providers/ThemeProvider';

type MaintenanceScreenProps = {
  config: MaintenanceModeConfig;
  preview?: boolean;
  onRetry?: () => void;
  retrying?: boolean;
};

function formatEstimatedEnd(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MaintenanceScreen({
  config,
  preview = false,
  onRetry,
  retrying = false,
}: MaintenanceScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const estimatedEnd = formatEstimatedEnd(config.estimated_end);

  return (
    <GradientBackground style={preview ? styles.previewRoot : undefined}>
      <View style={[styles.page, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.hero}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.warning}22`, borderColor: `${colors.warning}44` }]}>
            <Ionicons name="construct-outline" size={40} color={colors.warning} />
          </View>
          <Text variant="h1" style={styles.title}>
            {config.title}
          </Text>
          <Text secondary variant="body" style={styles.message}>
            {config.message}
          </Text>
        </View>

        <GlassCard style={styles.card}>
          {estimatedEnd ? (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color={colors.accent} />
              <View style={styles.infoText}>
                <Text variant="label">Tahmini bitiş</Text>
                <Text secondary variant="caption">
                  {estimatedEnd}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text secondary variant="caption" style={styles.infoText}>
                Bakım tamamlandığında uygulamaya otomatik olarak devam edebilirsiniz.
              </Text>
            </View>
          )}
        </GlassCard>

        {!preview ? (
          <Button title="Tekrar Dene" variant="secondary" loading={retrying} onPress={onRetry} />
        ) : (
          <View style={[styles.previewBadge, { backgroundColor: `${colors.warning}18`, borderColor: `${colors.warning}44` }]}>
            <Ionicons name="eye-outline" size={14} color={colors.warning} />
            <Text variant="caption" style={{ color: colors.warning, fontWeight: '600' }}>
              Kullanıcı önizlemesi
            </Text>
          </View>
        )}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  previewRoot: {
    minHeight: 380,
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    gap: spacing.xs,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'center',
  },
});
