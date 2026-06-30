import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import {
  VORA_HIZMETLER_ACCENT,
  VORA_HIZMETLER_GRADIENT,
} from '@/features/vora-hizmetler/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  heroCompact: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconCompact: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  heroTitle: {
    color: '#fff',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    gap: 2,
    flexShrink: 1,
  },
  sectionLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.xs,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  menuAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  menuBody: {
    flex: 1,
    gap: 2,
    paddingVertical: spacing.md,
  },
  menuBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginRight: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyDesc: {
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.lg,
  },
  emptyBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  formStep: {
    gap: spacing.lg,
  },
  formStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: '#fff',
    fontWeight: '800',
  },
  formStepTitle: {
    flex: 1,
    gap: 2,
  },
  formStepDivider: {
    height: StyleSheet.hairlineWidth,
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    shadowColor: VORA_HIZMETLER_ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  gradientBtnText: {
    color: '#fff',
  },
});

type HizmetHeroBannerProps = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  colors?: readonly [string, string];
  compact?: boolean;
  children?: ReactNode;
};

export function HizmetHeroBanner({
  title,
  subtitle,
  icon = 'construct',
  colors = VORA_HIZMETLER_GRADIENT,
  compact = false,
  children,
}: HizmetHeroBannerProps) {
  return (
    <LinearGradient
      colors={[...colors]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, compact && styles.heroCompact]}
    >
      <View style={styles.heroGlow} />
      <View style={[styles.heroIcon, compact && styles.heroIconCompact]}>
        <Ionicons name={icon} size={compact ? 22 : 28} color="#fff" />
      </View>
      <Text variant={compact ? 'label' : 'h2'} style={styles.heroTitle}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" style={styles.heroSubtitle} numberOfLines={3}>
          {subtitle}
        </Text>
      ) : null}
      {children}
    </LinearGradient>
  );
}

type HizmetSectionHeaderProps = {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  action?: ReactNode;
};

export function HizmetSectionHeader({ title, subtitle, icon, action }: HizmetSectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: `${VORA_HIZMETLER_ACCENT}16` }]}>
        <Ionicons name={icon} size={18} color={VORA_HIZMETLER_ACCENT} />
      </View>
      <View style={styles.sectionHeaderText}>
        <Text variant="label">{title}</Text>
        {subtitle ? (
          <Text secondary variant="caption">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ?? <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />}
    </View>
  );
}

type HizmetMenuRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  badge?: string;
  accent?: string;
};

export function HizmetMenuRow({
  icon,
  title,
  subtitle,
  onPress,
  badge,
  accent = VORA_HIZMETLER_ACCENT,
}: HizmetMenuRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
      <GlassCard style={styles.menuRow} padded={false}>
        <View style={[styles.menuAccent, { backgroundColor: accent }]} />
        <View style={[styles.menuIcon, { backgroundColor: `${accent}14` }]}>
          <Ionicons name={icon} size={22} color={accent} />
        </View>
        <View style={styles.menuBody}>
          <Text variant="label">{title}</Text>
          <Text secondary variant="caption">
            {subtitle}
          </Text>
        </View>
        {badge ? (
          <View style={[styles.menuBadge, { backgroundColor: `${accent}18` }]}>
            <Text variant="caption" style={{ color: accent, fontWeight: '800', fontSize: 11 }}>
              {badge}
            </Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </GlassCard>
    </Pressable>
  );
}

type HizmetEmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function HizmetEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: HizmetEmptyStateProps) {
  const { colors } = useTheme();

  return (
    <GlassCard style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: `${VORA_HIZMETLER_ACCENT}12` }]}>
        <Ionicons name={icon} size={32} color={VORA_HIZMETLER_ACCENT} />
      </View>
      <Text variant="label" style={styles.emptyTitle}>
        {title}
      </Text>
      <Text secondary variant="caption" style={styles.emptyDesc}>
        {description}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={[styles.emptyBtn, { backgroundColor: VORA_HIZMETLER_ACCENT }]}>
          <Text variant="label" style={{ color: '#fff' }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </GlassCard>
  );
}

type HizmetFormStepProps = {
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  style?: ViewStyle;
};

export function HizmetFormStep({ step, title, subtitle, children, style }: HizmetFormStepProps) {
  const { colors } = useTheme();

  return (
    <GlassCard style={[styles.formStep, style]}>
      <View style={styles.formStepHeader}>
        <LinearGradient colors={[...VORA_HIZMETLER_GRADIENT]} style={styles.stepBadge}>
          <Text variant="caption" style={styles.stepBadgeText}>
            {step}
          </Text>
        </LinearGradient>
        <View style={styles.formStepTitle}>
          <Text variant="label">{title}</Text>
          {subtitle ? (
            <Text secondary variant="caption">
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={[styles.formStepDivider, { backgroundColor: colors.border }]} />
      {children}
    </GlassCard>
  );
}

type HizmetStatusChipProps = {
  label: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
};

export function HizmetStatusChip({ label, tone = 'default' }: HizmetStatusChipProps) {
  const { colors } = useTheme();
  const toneMap = {
    default: { bg: `${colors.textSecondary}14`, color: colors.textSecondary, border: colors.border },
    success: { bg: '#22C55E18', color: '#22C55E', border: '#22C55E40' },
    warning: { bg: '#F59E0B18', color: '#F59E0B', border: '#F59E0B40' },
    danger: { bg: '#EF444418', color: '#EF4444', border: '#EF444440' },
    accent: { bg: `${VORA_HIZMETLER_ACCENT}14`, color: VORA_HIZMETLER_ACCENT, border: `${VORA_HIZMETLER_ACCENT}40` },
  };
  const t = toneMap[tone];

  return (
    <View style={[styles.statusChip, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text variant="caption" style={{ color: t.color, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

export function HizmetLoadingState({ label = 'Yükleniyor…' }: { label?: string }) {
  return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator color={VORA_HIZMETLER_ACCENT} size="large" />
      <Text secondary variant="caption">
        {label}
      </Text>
    </View>
  );
}

export function HizmetGradientButton({
  label,
  onPress,
  icon,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [{ opacity: pressed || disabled ? 0.88 : 1 }]}
    >
      <LinearGradient
        colors={[...VORA_HIZMETLER_GRADIENT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientBtn}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={18} color="#fff" /> : null}
            <Text variant="label" style={styles.gradientBtnText}>
              {label}
            </Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}
