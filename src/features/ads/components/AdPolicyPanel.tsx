import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AD_POLICY_HIGHLIGHTS, AD_POLICY_META } from '@/features/ads/constants/adPolicy';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AdPolicyPanelProps = {
  compact?: boolean;
};

export function AdPolicyPanel({ compact = false }: AdPolicyPanelProps) {
  const { colors } = useTheme();

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}14` }]}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text variant="label">{AD_POLICY_META.title}</Text>
          <Text secondary variant="caption">
            Sürüm {AD_POLICY_META.version} · {AD_POLICY_META.lastUpdated}
          </Text>
        </View>
      </View>

      {!compact ? (
        <Text secondary variant="caption" style={styles.summary}>
          {AD_POLICY_META.summary}
        </Text>
      ) : null}

      <View style={styles.highlights}>
        {AD_POLICY_HIGHLIGHTS.map((item) => (
          <View key={item} style={styles.highlightRow}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text secondary variant="caption" style={styles.highlightText}>
              {item}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => router.push('/ads/policy' as Href)}
        style={({ pressed }) => [
          styles.linkBtn,
          { borderColor: colors.border, backgroundColor: colors.surfaceElevated, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Text variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
          Reklam Politikamız
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, gap: 2 },
  summary: { lineHeight: 18 },
  highlights: { gap: spacing.xs },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  highlightText: { flex: 1, lineHeight: 18 },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xs,
  },
});
