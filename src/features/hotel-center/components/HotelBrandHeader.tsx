import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import {
  HOTEL_ACCENT,
  HOTEL_CENTER_DEF,
  HOTEL_GRADIENT,
} from '@/features/hotel-center/constants';
import { radius, spacing } from '@/constants/theme';

type Props = {
  regionLabel: string;
};

export function HotelBrandHeader({ regionLabel }: Props) {
  return (
    <LinearGradient
      colors={[`${HOTEL_GRADIENT[0]}22`, `${HOTEL_GRADIENT[1]}12`, 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, { borderColor: `${HOTEL_ACCENT}33` }]}
    >
      <View style={styles.row}>
        <LinearGradient
          colors={[HOTEL_GRADIENT[0], HOTEL_GRADIENT[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBox}
        >
          <Ionicons name="bed" size={22} color="#fff" />
        </LinearGradient>

        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text variant="h3" style={styles.title}>
              {HOTEL_CENTER_DEF.title}
            </Text>
            <View style={[styles.regionPill, { backgroundColor: `${HOTEL_ACCENT}20` }]}>
              <Ionicons name="location-outline" size={11} color={HOTEL_ACCENT} />
              <Text variant="caption" style={{ color: HOTEL_ACCENT, fontWeight: '700' }}>
                {regionLabel}
              </Text>
            </View>
          </View>
          <Text secondary variant="caption">
            {HOTEL_CENTER_DEF.subtitle}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  title: {
    fontWeight: '800',
  },
  regionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
});
