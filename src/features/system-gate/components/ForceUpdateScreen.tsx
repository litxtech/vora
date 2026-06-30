import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { openUrl } from '@/lib/linking/openUrl';
import { parseChangelogLines, resolveStoreUrl } from '@/features/system-gate/services/configParsers';
import type { MinAppVersionConfig } from '@/features/system-gate/types';
import { useTheme } from '@/providers/ThemeProvider';

type ForceUpdateScreenProps = {
  config: MinAppVersionConfig;
  currentVersion: string;
  minVersion: string;
  preview?: boolean;
  onUpdate?: () => void;
};

export function ForceUpdateScreen({
  config,
  currentVersion,
  minVersion,
  preview = false,
  onUpdate,
}: ForceUpdateScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const changelog = parseChangelogLines(config.changelog);

  const handleUpdate = () => {
    if (onUpdate) {
      onUpdate();
      return;
    }
    void openUrl(resolveStoreUrl(config, platform));
  };

  return (
    <GradientBackground style={preview ? styles.previewRoot : undefined}>
      <View style={[styles.page, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.hero}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}22`, borderColor: `${colors.primary}44` }]}>
            <Ionicons name="rocket-outline" size={40} color={colors.primary} />
          </View>
          <Text variant="h1" style={styles.title}>
            {config.title}
          </Text>
          <Text secondary variant="body" style={styles.message}>
            {config.message}
          </Text>
        </View>

        <GlassCard style={styles.card}>
          <View style={styles.versionRow}>
            <View style={styles.versionCol}>
              <Text secondary variant="caption">
                Mevcut sürüm
              </Text>
              <Text variant="label">{currentVersion}</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
            <View style={styles.versionCol}>
              <Text secondary variant="caption">
                Gerekli sürüm
              </Text>
              <Text variant="label" style={{ color: colors.primary }}>
                {minVersion}+
              </Text>
            </View>
          </View>

          {changelog.length > 0 ? (
            <View style={styles.changelog}>
              <Text variant="label">Bu sürümde</Text>
              {changelog.map((line) => (
                <View key={line} style={styles.changelogRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text variant="body" style={styles.changelogText}>
                    {line}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </GlassCard>

        {!preview ? (
          <Button
            title={platform === 'ios' ? 'App Store\'da Güncelle' : 'Play Store\'da Güncelle'}
            onPress={handleUpdate}
          />
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
    minHeight: 420,
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
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  versionCol: {
    flex: 1,
    gap: spacing.xs,
  },
  changelog: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148,163,184,0.35)',
  },
  changelogRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  changelogText: {
    flex: 1,
    lineHeight: 20,
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
