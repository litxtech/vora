import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { formatCount } from '@/features/profile/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ProfileViewsPillProps = {
  value: number;
  onPress?: () => void;
};

export function ProfileViewsPill({ value, onPress }: ProfileViewsPillProps) {
  const { colors } = useTheme();

  const content = (
    <>
      <Ionicons name="eye-outline" size={14} color={colors.textSecondary} />
      <Text variant="caption" style={{ color: colors.text, fontWeight: '700' }}>
        {formatCount(value)}
      </Text>
      <Text secondary variant="caption" style={styles.label}>
        görüntülenme
      </Text>
    </>
  );

  const containerStyle = [
    styles.pill,
    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
  ];

  if (!onPress) {
    return <View style={containerStyle}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [...containerStyle, { opacity: pressed ? 0.7 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 11 },
});
