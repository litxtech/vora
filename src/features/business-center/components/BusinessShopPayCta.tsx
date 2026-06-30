import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/constants/theme';

type Props = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  securePayment?: boolean;
  compact?: boolean;
  onPress: () => void;
};

export function BusinessShopPayCta({
  label,
  icon,
  accent,
  securePayment = false,
  compact = false,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation?.();
        onPress();
      }}
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
    >
      <LinearGradient
        colors={[`${accent}EE`, `${accent}BB`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.btn, compact && styles.btnCompact]}
      >
        <Ionicons name={icon} size={compact ? 13 : 15} color="#fff" />
        <Text variant="caption" style={styles.label}>
          {label}
        </Text>
        {securePayment ? (
          <View style={styles.secureChip}>
            <Ionicons name="shield-checkmark" size={9} color="#fff" />
          </View>
        ) : null}
      </LinearGradient>
      {securePayment && !compact ? (
        <Text variant="caption" style={styles.trustHint}>
          Vora güvenli ödeme
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  btnCompact: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    marginTop: 4,
  },
  label: { color: '#fff', fontWeight: '800', fontSize: 12 },
  secureChip: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustHint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
});
