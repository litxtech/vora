import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { HotelPriceDisplay } from '@/features/hotel-center/components/HotelPriceDisplay';
import {
  HOTEL_ACCENT,
  formatHotelRoomTypeAvailability,
} from '@/features/hotel-center/constants';
import type { HotelRoomType } from '@/features/hotel-center/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  roomTypes: HotelRoomType[];
  studentDiscountPct: number;
  selectedId?: string | null;
  onSelect?: (roomType: HotelRoomType) => void;
  selectable?: boolean;
};

export function HotelRoomTypesList({
  roomTypes,
  studentDiscountPct,
  selectedId,
  onSelect,
  selectable = false,
}: Props) {
  const { colors } = useTheme();

  if (roomTypes.length === 0) return null;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="bed-outline" size={18} color={HOTEL_ACCENT} />
        <Text variant="label">Oda tipleri</Text>
        <Text secondary variant="caption">
          {roomTypes.length} seçenek
        </Text>
      </View>

      <View style={styles.list}>
        {roomTypes.map((room) => {
          const available = room.totalCount - room.occupiedCount;
          const isSelected = selectedId === room.id;
          const isDisabled = selectable && available < 1;

          return (
            <Pressable
              key={room.id}
              disabled={!selectable || isDisabled}
              onPress={() => onSelect?.(room)}
              style={({ pressed }) => [
                styles.roomRow,
                {
                  borderColor: isSelected ? HOTEL_ACCENT : colors.border,
                  backgroundColor: isSelected ? `${HOTEL_ACCENT}10` : colors.surfaceElevated,
                  opacity: pressed ? 0.9 : isDisabled ? 0.55 : 1,
                },
              ]}
            >
              {room.mediaUrls[0] ? (
                <Image source={{ uri: room.mediaUrls[0] }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumbPlaceholder, { backgroundColor: `${HOTEL_ACCENT}14` }]}>
                  <Ionicons name="bed-outline" size={20} color={HOTEL_ACCENT} />
                </View>
              )}

              <View style={styles.roomCopy}>
                <Text variant="label">{room.name}</Text>
                {room.description ? (
                  <Text secondary variant="caption" numberOfLines={2}>
                    {room.description}
                  </Text>
                ) : null}
                <View style={styles.metaRow}>
                  <Text variant="caption" muted>
                    {room.maxGuests} kişi
                  </Text>
                  <Text
                    variant="caption"
                    style={{ color: available > 0 ? HOTEL_ACCENT : colors.danger, fontWeight: '600' }}
                  >
                    {formatHotelRoomTypeAvailability(room.totalCount, room.occupiedCount)}
                  </Text>
                </View>
              </View>

              <View style={styles.priceCol}>
                <HotelPriceDisplay
                  pricePerNight={room.pricePerNight}
                  listPricePerNight={room.listPricePerNight}
                  studentDiscountPct={studentDiscountPct}
                  size="sm"
                />
                {selectable && isSelected ? (
                  <Ionicons name="checkmark-circle" size={18} color={HOTEL_ACCENT} style={styles.check} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  list: { gap: spacing.sm },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
  thumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomCopy: { flex: 1, gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  priceCol: { alignItems: 'flex-end', gap: 4, minWidth: 88 },
  check: { marginTop: 2 },
});
