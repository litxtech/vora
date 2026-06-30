import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AdminUserCollapsibleSectionProps = {
  title: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function AdminUserCollapsibleSection({
  title,
  hint,
  icon,
  defaultOpen = false,
  children,
}: AdminUserCollapsibleSectionProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <GlassCard style={styles.card}>
      <Pressable
        style={styles.header}
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}12` }]}>
          <Ionicons name={icon ?? 'document-text-outline'} size={18} color={colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text variant="label">{title}</Text>
          {hint ? (
            <Text variant="caption" muted numberOfLines={1}>
              {hint}
            </Text>
          ) : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </Pressable>
      {open ? <View style={[styles.body, { borderTopColor: colors.border }]}>{children}</View> : null}
    </GlassCard>
  );
}

export function AdminUserInfoRow({ label, value }: { label: string; value: unknown }) {
  const display =
    value == null
      ? '—'
      : typeof value === 'boolean'
        ? value
          ? 'Evet'
          : 'Hayır'
        : String(value).trim() || '—';

  return (
    <View style={styles.infoRow}>
      <Text variant="caption" secondary style={styles.infoLabel}>
        {label}
      </Text>
      <Text variant="body" style={styles.infoValue}>
        {display}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  body: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
  },
  infoRow: {
    gap: 2,
  },
  infoLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoValue: {
    lineHeight: 20,
  },
});
