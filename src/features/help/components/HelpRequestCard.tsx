import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import {
  HELP_CATEGORIES,
  HELP_URGENCY_OPTIONS,
  URGENCY_COLORS,
  helpRequestDetailPath,
  type HelpRequest,
} from '@/features/help/constants';
import { formatHelpRelativeTime } from '@/features/help/utils/formatRelativeTime';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const URGENCY_LABELS = Object.fromEntries(
  HELP_URGENCY_OPTIONS.map((option) => [option.value, option.label]),
) as Record<HelpRequest['urgency'], string>;

export const HelpRequestCard = memo(function HelpRequestCard({ item }: { item: HelpRequest }) {
  const { colors } = useTheme();
  const cat = HELP_CATEGORIES[item.category];
  const urgencyColor = URGENCY_COLORS[item.urgency];

  return (
    <Pressable
      onPress={() => router.push(helpRequestDetailPath(item.id) as never)}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <GlassCard style={[styles.card, { borderColor: `${cat.color}28` }]} padded={false}>
        <LinearGradient
          colors={[`${cat.color}18`, `${cat.color}04`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={[styles.accent, { backgroundColor: urgencyColor }]} />

          <View style={styles.body}>
            <View style={styles.topRow}>
              <View style={[styles.icon, { backgroundColor: `${cat.color}22` }]}>
                <Ionicons name={cat.icon as keyof typeof Ionicons.glyphMap} size={20} color={cat.color} />
              </View>
              <View style={styles.meta}>
                <Text variant="label" numberOfLines={1} style={styles.title}>
                  {item.title}
                </Text>
                <View style={styles.chips}>
                  <View style={[styles.chip, { backgroundColor: `${cat.color}16` }]}>
                    <Text variant="caption" style={{ color: cat.color, fontWeight: '600', fontSize: 10 }}>
                      {cat.label}
                    </Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: `${urgencyColor}18`, borderColor: `${urgencyColor}40` }]}>
                    <View style={[styles.urgencyDot, { backgroundColor: urgencyColor }]} />
                    <Text variant="caption" style={{ color: urgencyColor, fontWeight: '700', fontSize: 10 }}>
                      {URGENCY_LABELS[item.urgency]}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={[styles.chevron, { backgroundColor: `${cat.color}12` }]}>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
            </View>

            <Text secondary variant="caption" numberOfLines={2} style={styles.description}>
              {item.description}
            </Text>

            <View style={styles.footer}>
              <View style={styles.footerItem}>
                <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                <Text variant="caption" secondary style={styles.footerText}>
                  {formatHelpRelativeTime(item.createdAt)}
                </Text>
              </View>
              {item.contactInfo ? (
                <View style={styles.footerItem}>
                  <Ionicons name="call-outline" size={12} color={cat.color} />
                  <Text variant="caption" style={{ color: cat.color, fontSize: 11 }}>
                    İletişim var
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </LinearGradient>
      </GlassCard>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    minHeight: 108,
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
    marginVertical: spacing.sm,
    marginLeft: spacing.xs,
    borderRadius: radius.full,
  },
  body: {
    flex: 1,
    padding: spacing.md,
    paddingLeft: spacing.sm,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  title: {
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  urgencyDot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    lineHeight: 17,
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11,
  },
});
