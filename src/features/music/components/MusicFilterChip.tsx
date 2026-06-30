import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MusicFilterChipProps = {
  label: string;
  active?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accent?: boolean;
};

export function MusicFilterChip({ label, active, icon, onPress, accent }: MusicFilterChipProps) {
  const { colors } = useTheme();
  const tint = accent ? colors.accent : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active
          ? { backgroundColor: tint }
          : { backgroundColor: `${colors.textMuted}14` },
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={13}
          color={active ? '#fff' : colors.textSecondary}
        />
      ) : null}
      <Text
        variant="caption"
        style={{
          color: active ? '#fff' : colors.textSecondary,
          fontWeight: active ? '600' : '500',
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
});
