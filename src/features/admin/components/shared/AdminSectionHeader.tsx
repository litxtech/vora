import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AdminSectionHeaderProps = {
  title: string;
  hint?: string;
};

export function AdminSectionHeader({ title, hint }: AdminSectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={[styles.accent, { backgroundColor: colors.primary }]} />
      <View style={styles.texts}>
        <Text variant="label">{title}</Text>
        {hint ? (
          <Text secondary variant="caption">
            {hint}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  accent: {
    width: 2,
    height: 14,
    borderRadius: 2,
  },
  texts: { gap: 1 },
});
