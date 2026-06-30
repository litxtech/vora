import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { PLATFORM_GUIDE_CATEGORY_META } from '@/features/platform-guide/constants';
import type { PlatformGuideListItem } from '@/features/platform-guide/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type PlatformGuideCardProps = {
  guide: PlatformGuideListItem;
  onPress: () => void;
};

export function PlatformGuideCard({ guide, onPress }: PlatformGuideCardProps) {
  const { colors } = useTheme();
  const meta = PLATFORM_GUIDE_CATEGORY_META[guide.category] ?? PLATFORM_GUIDE_CATEGORY_META.general;
  const iconName = (guide.icon as keyof typeof Ionicons.glyphMap) || meta.icon;

  return (
    <Pressable onPress={onPress}>
      <GlassCard style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: `${meta.accent}22` }]}>
          <Ionicons name={iconName} size={22} color={meta.accent} />
        </View>
        <View style={styles.content}>
          <Text variant="label">{guide.title}</Text>
          {guide.summary ? (
            <Text secondary variant="caption" numberOfLines={2}>
              {guide.summary}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <Text variant="caption" style={{ color: meta.accent }}>
              {meta.label}
            </Text>
            {guide.hasVideo ? (
              <View style={styles.badge}>
                <Ionicons name="videocam-outline" size={12} color={colors.textMuted} />
              </View>
            ) : null}
            {guide.hasImage ? (
              <View style={styles.badge}>
                <Ionicons name="image-outline" size={12} color={colors.textMuted} />
              </View>
            ) : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, gap: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { opacity: 0.85 },
});
