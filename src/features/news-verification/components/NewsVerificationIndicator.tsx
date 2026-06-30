import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { NewsVerificationSheet } from '@/features/news-verification/components/NewsVerificationSheet';
import { NEWS_VERIFICATION_STATUS } from '@/features/news-verification/constants';
import { fetchVerificationSummary } from '@/features/news-verification/services/newsVerificationData';
import type {
  NewsVerificationSummary,
  NewsVerificationTarget,
} from '@/features/news-verification/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type NewsVerificationIndicatorProps = {
  target: NewsVerificationTarget;
  variant?: 'default' | 'reel';
  compact?: boolean;
};

export function NewsVerificationIndicator({
  target,
  variant = 'default',
  compact = false,
}: NewsVerificationIndicatorProps) {
  const { colors, isDark } = useTheme();
  const [summary, setSummary] = useState<NewsVerificationSummary | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchVerificationSummary(target);
    setSummary(data);
  }, [target]);

  useEffect(() => {
    void load();
  }, [load]);

  const status = summary?.status ?? 'none';
  const config = NEWS_VERIFICATION_STATUS[status];
  const isReel = variant === 'reel';

  const pillContent = (
    <>
      <Ionicons name={config.icon} size={compact ? 13 : 14} color={config.color} />
      <Text
        variant="caption"
        style={{
          color: config.color,
          fontWeight: '700',
          fontSize: compact ? 11 : 12,
        }}
      >
        {compact ? config.shortLabel : config.label}
      </Text>
      {!compact && status === 'none' ? (
        <Ionicons name="chevron-forward" size={12} color={config.color} />
      ) : null}
    </>
  );

  return (
    <>
      <Pressable
        onPress={() => setSheetOpen(true)}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={`Haber doğrulama: ${config.label}`}
      >
        {status === 'none' ? (
          <View
            style={[
              styles.pill,
              styles.pillMuted,
              {
                borderColor: isReel ? 'rgba(255,255,255,0.25)' : colors.border,
                backgroundColor: isReel
                  ? 'rgba(255,255,255,0.12)'
                  : isDark
                    ? 'rgba(255,255,255,0.06)'
                    : colors.surface,
              },
              compact && styles.pillCompact,
            ]}
          >
            <Ionicons
              name="shield-outline"
              size={compact ? 13 : 14}
              color={isReel ? '#fff' : colors.textMuted}
            />
            <Text
              variant="caption"
              style={{
                color: isReel ? '#fff' : colors.textSecondary,
                fontWeight: '600',
                fontSize: compact ? 11 : 12,
              }}
            >
              Doğrula
            </Text>
          </View>
        ) : (
          <LinearGradient
            colors={[`${config.color}${isDark ? '28' : '18'}`, `${config.color}06`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.pill,
              { borderColor: `${config.color}55` },
              compact && styles.pillCompact,
            ]}
          >
            {pillContent}
          </LinearGradient>
        )}

        {!compact && summary?.latestNote ? (
          <View
            style={[
              styles.notePreview,
              {
                backgroundColor: isReel ? 'rgba(0,0,0,0.35)' : `${config.color}10`,
                borderColor: `${config.color}22`,
              },
            ]}
          >
            <Ionicons name="chatbox-ellipses-outline" size={12} color={config.color} />
            <Text
              variant="caption"
              secondary={!isReel}
              style={isReel ? { color: 'rgba(255,255,255,0.85)', flex: 1 } : { flex: 1 }}
            >
              Doğrulama notlarını görüntüle
            </Text>
          </View>
        ) : null}
      </Pressable>

      <NewsVerificationSheet
        visible={sheetOpen}
        target={target}
        variant={variant}
        onClose={() => setSheetOpen(false)}
        onUpdated={(next) => {
          setSummary(next);
          setSheetOpen(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pillCompact: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  pillMuted: {
    borderStyle: 'dashed',
  },
  notePreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    maxWidth: '100%',
  },
});
