import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function AdminUserMetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

export function AdminUserInfoChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  const { colors } = useTheme();
  const color = accent ?? colors.text;

  return (
    <View style={[styles.infoChip, { borderColor: colors.border, backgroundColor: `${colors.surface}88` }]}>
      <Text variant="caption" muted style={{ fontSize: 11 }}>
        {label}
      </Text>
      <Text variant="caption" style={{ color, fontWeight: '700' }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export function AdminUserInfoGrid({ children }: { children: ReactNode }) {
  return <View style={styles.infoGrid}>{children}</View>;
}

const styles = StyleSheet.create({
  metaRow: {
    gap: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  infoChip: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: 2,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    minWidth: '45%',
  },
});
