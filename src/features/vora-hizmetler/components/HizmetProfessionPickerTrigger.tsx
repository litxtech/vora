import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { VORA_HIZMETLER_ACCENT, VORA_HIZMETLER_GRADIENT } from '@/features/vora-hizmetler/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type HizmetProfessionPickerTriggerProps = {
  label: string;
  hint?: string;
  onPress: () => void;
  active?: boolean;
};

export function HizmetProfessionPickerTrigger({
  label,
  hint = 'Meslek veya hizmet seç',
  onPress,
  active = false,
}: HizmetProfessionPickerTriggerProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.trigger,
        {
          borderColor: active ? VORA_HIZMETLER_ACCENT : colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {active ? <LinearGradient colors={[`${VORA_HIZMETLER_ACCENT}14`, `${VORA_HIZMETLER_ACCENT}06`]} style={styles.triggerBg} /> : null}
      <LinearGradient colors={active ? [...VORA_HIZMETLER_GRADIENT] : [`${VORA_HIZMETLER_ACCENT}18`, `${VORA_HIZMETLER_ACCENT}08`]} style={styles.iconWrap}>
        <Ionicons name="briefcase-outline" size={18} color={active ? '#fff' : VORA_HIZMETLER_ACCENT} />
      </LinearGradient>
      <View style={styles.textCol}>
        <Text variant="label" numberOfLines={1}>
          {label}
        </Text>
        <Text secondary variant="caption" numberOfLines={1}>
          {hint}
        </Text>
      </View>
      <View style={[styles.chevron, { backgroundColor: `${colors.textSecondary}10` }]}>
        <Ionicons name="chevron-up" size={16} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  triggerBg: {
    ...StyleSheet.absoluteFillObject,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
