import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { ridesSupportPath, RIDES_ACCENT } from '@/features/rides/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function RidesSupportButton() {
  return (
    <Pressable
      onPress={() => router.push(ridesSupportPath() as never)}
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      accessibilityRole="button"
      accessibilityLabel="Canlı destek"
    >
      <Ionicons name="headset" size={15} color="#fff" />
      <Text variant="caption" style={styles.btnText}>
        Destek
      </Text>
    </Pressable>
  );
}

export function RidesSupportNote() {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => router.push(ridesSupportPath() as never)}
      style={[styles.note, { borderColor: `${RIDES_ACCENT}33`, backgroundColor: `${RIDES_ACCENT}0D` }]}
    >
      <View style={[styles.noteIcon, { backgroundColor: `${RIDES_ACCENT}18` }]}>
        <Ionicons name="chatbubbles-outline" size={16} color={RIDES_ACCENT} />
      </View>
      <View style={styles.noteCopy}>
        <Text variant="caption" style={{ color: RIDES_ACCENT, fontWeight: '700' }}>
          Canlı destek ve şikayetler
        </Text>
        <Text secondary variant="caption" style={styles.noteText}>
          Şoför şikayetleri, iade talepleri ve tüm yolculuk sorunları için canlı destek merkezini
          kullanın.
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: RIDES_ACCENT,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.full,
    shadowColor: RIDES_ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  btnPressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  noteIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteCopy: { flex: 1, gap: 2 },
  noteText: { lineHeight: 16, fontSize: 11 },
});
