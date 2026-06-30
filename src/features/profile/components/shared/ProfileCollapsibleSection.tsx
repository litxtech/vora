import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ProfileCollapsibleSectionProps = {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  trailing?: ReactNode;
  onExpandedChange?: (expanded: boolean) => void;
  children: ReactNode;
};

export function ProfileCollapsibleSection({
  title,
  icon,
  iconColor,
  trailing,
  onExpandedChange,
  children,
}: ProfileCollapsibleSectionProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const accent = iconColor ?? colors.primary;

  return (
    <GlassCard style={styles.card} padded={false}>
      <Pressable
        onPress={() =>
          setExpanded((prev) => {
            const next = !prev;
            onExpandedChange?.(next);
            return next;
          })
        }
        style={({ pressed }) => [styles.header, { opacity: pressed ? 0.75 : 1 }]}
      >
        <View style={styles.headerLeft}>
          {icon ? (
            <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
              <Ionicons name={icon} size={18} color={accent} />
            </View>
          ) : null}
          <Text variant="label">{title}</Text>
        </View>
        <View style={styles.headerRight}>
          {trailing}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
        </View>
      </Pressable>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
});
