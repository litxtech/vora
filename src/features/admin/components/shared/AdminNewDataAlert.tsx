import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  message: string;
  tone?: 'warning' | 'danger' | 'primary';
  onDismiss: () => void;
};

export function AdminNewDataAlert({ message, tone = 'primary', onDismiss }: Props) {
  const { colors } = useTheme();

  const toneColor =
    tone === 'danger' ? colors.danger : tone === 'warning' ? colors.warning : colors.primary;

  return (
    <Pressable
      onPress={onDismiss}
      style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`${message}. Kapatmak için dokunun.`}
    >
      <LinearGradient
        colors={[`${toneColor}30`, `${toneColor}0A`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.card, { borderColor: `${toneColor}55` }]}
      >
        <View style={[styles.dot, { backgroundColor: toneColor }]} />
        <View style={styles.texts}>
          <Text variant="caption" style={{ color: toneColor, fontWeight: '700' }}>
            Yeni veri
          </Text>
          <Text secondary variant="caption" numberOfLines={2}>
            {message}
          </Text>
        </View>
        <View style={[styles.dismiss, { backgroundColor: `${toneColor}18` }]}>
          <Ionicons name="close" size={14} color={toneColor} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
  },
  texts: {
    flex: 1,
    gap: 1,
  },
  dismiss: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
