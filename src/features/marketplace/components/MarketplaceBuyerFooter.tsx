import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { MARKETPLACE_ACCENT, MARKETPLACE_GRADIENT } from '@/features/marketplace/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  canCheckout: boolean;
  canOffer: boolean;
  isFree: boolean;
  offerLabel: string;
  checkoutLoading: boolean;
  onMessage: () => void;
  onOffer: () => void;
  onCheckout: () => void;
  bottomInset: number;
};

export function MarketplaceBuyerFooter({
  canCheckout,
  canOffer,
  isFree,
  offerLabel,
  checkoutLoading,
  onMessage,
  onOffer,
  onCheckout,
  bottomInset,
}: Props) {
  const { colors } = useTheme();

  const primary = canCheckout
    ? { icon: 'cart-outline' as const, label: 'Satın Al', onPress: onCheckout, gradient: true }
    : canOffer
      ? { icon: 'pricetag-outline' as const, label: offerLabel, onPress: onOffer, gradient: false }
      : isFree
        ? { icon: 'hand-left-outline' as const, label: 'İlgileniyorum', onPress: onMessage, gradient: false }
        : null;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingBottom: bottomInset + spacing.sm,
          backgroundColor: `${colors.background}F5`,
          borderTopColor: colors.border,
        },
      ]}
    >
      {canCheckout ? (
        <View style={styles.trustInline}>
          <Ionicons name="shield-checkmark" size={12} color={MARKETPLACE_ACCENT} />
          <Text variant="caption" style={[styles.trustText, { color: MARKETPLACE_ACCENT }]} numberOfLines={1}>
            Vora güvenli ödeme · teslimde onay
          </Text>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <SecondaryIcon icon="chatbubble-outline" label="Mesaj" onPress={onMessage} />
        {canCheckout && canOffer ? (
          <SecondaryIcon icon="pricetag-outline" label={offerLabel} onPress={onOffer} />
        ) : null}

        {primary ? (
          <Pressable
            onPress={primary.onPress}
            disabled={checkoutLoading}
            style={styles.primaryWrap}
          >
            {primary.gradient ? (
              <LinearGradient
                colors={[MARKETPLACE_GRADIENT[0], MARKETPLACE_GRADIENT[1]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.primaryBtn, checkoutLoading && { opacity: 0.7 }]}
              >
                {checkoutLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name={primary.icon} size={18} color="#fff" />
                    <Text variant="label" style={styles.primaryLabel}>
                      {primary.label}
                    </Text>
                  </>
                )}
              </LinearGradient>
            ) : (
              <View style={[styles.primaryBtn, { backgroundColor: MARKETPLACE_ACCENT }]}>
                <Ionicons name={primary.icon} size={18} color="#fff" />
                <Text variant="label" style={styles.primaryLabel}>
                  {primary.label}
                </Text>
              </View>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function SecondaryIcon({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.secondaryBtn,
        {
          backgroundColor: `${colors.surface}CC`,
          borderColor: colors.border,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  trustInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  trustText: {
    fontWeight: '600',
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  primaryWrap: { flex: 1, borderRadius: radius.lg, overflow: 'hidden' },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
  },
  primaryLabel: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondaryBtn: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
