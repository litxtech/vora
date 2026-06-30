import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type SensitiveContentOverlayProps = {
  onReveal: () => void;
  blurred?: boolean;
};

export function SensitiveContentOverlay({ onReveal, blurred = true }: SensitiveContentOverlayProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.overlay, blurred && styles.blurred, { backgroundColor: colors.surface }]}>
      <Ionicons name="eye-off-outline" size={32} color={colors.textSecondary} />
      <Text variant="label">Hassas İçerik</Text>
      <Text secondary variant="caption" style={styles.desc}>
        Bu içerik kan, şiddet veya ağır kaza görüntüleri içerebilir.
      </Text>
      <Pressable style={[styles.btn, { borderColor: colors.primary }]} onPress={onReveal}>
        <Text style={{ color: colors.primary }}>Görmek istiyorum</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
  },
  blurred: { opacity: 0.95 },
  desc: { textAlign: 'center', maxWidth: 260 },
  btn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.full,
  },
});
