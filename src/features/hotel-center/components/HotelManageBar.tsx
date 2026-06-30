import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { HOTEL_ACCENT, HOTEL_GRADIENT, hotelEarningsPath } from '@/features/hotel-center/constants';
import { LinearGradient } from 'expo-linear-gradient';
import { radius, spacing } from '@/constants/theme';

type Props = {
  onCreate: () => void;
  onReservations: () => void;
  showCreate?: boolean;
  showReservations?: boolean;
  showEarnings?: boolean;
};

export function HotelManageBar({
  onCreate,
  onReservations,
  showCreate = true,
  showReservations = true,
  showEarnings = true,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text variant="caption" secondary style={styles.lead}>
        Otel, pansiyon veya öğrenci konaklamanızı buradan paylaşın — rezervasyonları takip edin.
      </Text>
      <View style={styles.row}>
        {showCreate ? (
          <Pressable onPress={onCreate} style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.9 : 1 }]}>
            <LinearGradient
              colors={[HOTEL_GRADIENT[0], HOTEL_GRADIENT[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGradient}
            >
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text variant="caption" style={styles.btnText}>
                Otel Ekle
              </Text>
            </LinearGradient>
          </Pressable>
        ) : null}

        {showReservations ? (
        <Pressable
          onPress={onReservations}
          style={({ pressed }) => [
            styles.btnOutline,
            {
              borderColor: HOTEL_ACCENT,
              backgroundColor: `${HOTEL_ACCENT}10`,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Ionicons name="calendar" size={18} color={HOTEL_ACCENT} />
          <Text variant="caption" style={[styles.btnText, { color: HOTEL_ACCENT }]}>
            Rezervasyonlar
          </Text>
        </Pressable>
        ) : null}
      </View>

      {showEarnings ? (
      <Pressable
        onPress={() => router.push(hotelEarningsPath() as never)}
        style={({ pressed }) => [
          styles.earningsBtn,
          { borderColor: `${HOTEL_ACCENT}44`, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <Ionicons name="wallet-outline" size={16} color={HOTEL_ACCENT} />
        <Text variant="caption" style={{ color: HOTEL_ACCENT, fontWeight: '700' }}>
          Kazançlarım · komisyon ve 7 gün ödeme planı
        </Text>
        <Ionicons name="chevron-forward" size={14} color={HOTEL_ACCENT} />
      </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  lead: {
    textAlign: 'center',
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  btnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  btnText: {
    color: '#fff',
    fontWeight: '800',
  },
  earningsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
});
