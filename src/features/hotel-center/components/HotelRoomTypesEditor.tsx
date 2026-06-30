import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { HotelPriceInput } from '@/features/hotel-center/components/HotelPriceInput';
import {
  HOTEL_ACCENT,
  HOTEL_MAX_ROOM_PHOTOS,
  HOTEL_MAX_ROOM_TYPES,
  HOTEL_ROOM_TYPE_PRESETS,
  formatHotelRoomTypeAvailability,
} from '@/features/hotel-center/constants';
import { createEmptyDraftRoomType } from '@/features/hotel-center/services/hotelRoomTypes';
import type { DraftHotelRoomType } from '@/features/hotel-center/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  roomTypes: DraftHotelRoomType[];
  onChange: (next: DraftHotelRoomType[]) => void;
  showOccupied?: boolean;
};

function RoomPhotoTile({
  uri,
  onRemove,
}: {
  uri: string;
  onRemove: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.photoTile}>
      <View style={[styles.photoFrame, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
        <Image source={{ uri }} style={styles.photo} />
        <Pressable
          onPress={onRemove}
          hitSlop={6}
          style={[styles.photoRemove, { backgroundColor: colors.danger, borderColor: colors.surface }]}
        >
          <Ionicons name="close" size={12} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

function RoomTypeCard({
  room,
  index,
  total,
  showOccupied,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  room: DraftHotelRoomType;
  index: number;
  total: number;
  showOccupied: boolean;
  onUpdate: (next: DraftHotelRoomType) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { colors } = useTheme();
  const priceNum = parseInt(room.pricePerNight.replace(/\D/g, ''), 10) || 0;
  const totalCount = Math.max(1, parseInt(room.totalCount.replace(/\D/g, ''), 10) || 1);
  const occupiedCount = Math.min(
    totalCount,
    Math.max(0, parseInt(room.occupiedCount.replace(/\D/g, ''), 10) || 0),
  );

  const pickPhoto = async () => {
    if (room.photoUris.length >= HOTEL_MAX_ROOM_PHOTOS) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: HOTEL_MAX_ROOM_PHOTOS - room.photoUris.length,
    });
    if (!result.canceled) {
      onUpdate({
        ...room,
        photoUris: [...room.photoUris, ...result.assets.map((a) => a.uri)].slice(0, HOTEL_MAX_ROOM_PHOTOS),
      });
    }
  };

  return (
    <View style={[styles.roomCard, { backgroundColor: colors.surfaceElevated, borderColor: `${HOTEL_ACCENT}33` }]}>
      <View style={styles.roomCardHeader}>
        <View style={[styles.roomIndexBadge, { backgroundColor: `${HOTEL_ACCENT}18` }]}>
          <Text variant="caption" style={{ color: HOTEL_ACCENT, fontWeight: '800' }}>
            {index + 1}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="label">{room.name.trim() || `Oda tipi ${index + 1}`}</Text>
          <Text secondary variant="caption">
            {priceNum > 0 ? `${priceNum.toLocaleString('tr-TR')} ₺/gece` : 'Fiyat girilmedi'}
            {' · '}
            {formatHotelRoomTypeAvailability(totalCount, occupiedCount)}
          </Text>
        </View>
        <View style={styles.roomActions}>
          <Pressable onPress={onMoveUp} disabled={index === 0} hitSlop={6} style={{ opacity: index === 0 ? 0.3 : 1 }}>
            <Ionicons name="chevron-up" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={onMoveDown}
            disabled={index === total - 1}
            hitSlop={6}
            style={{ opacity: index === total - 1 ? 0.3 : 1 }}
          >
            <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={onRemove} hitSlop={6} disabled={total <= 1}>
            <Ionicons name="trash-outline" size={18} color={total <= 1 ? colors.textMuted : colors.danger} />
          </Pressable>
        </View>
      </View>

      <Input
        label="Oda adı"
        value={room.name}
        onChangeText={(name) => onUpdate({ ...room, name })}
        placeholder="Örn: Deluxe Deniz Manzaralı"
      />
      <Input
        label="Kısa açıklama"
        value={room.description}
        onChangeText={(description) => onUpdate({ ...room, description })}
        placeholder="Yatak tipi, manzara, m²…"
        multiline
        style={{ minHeight: 72, textAlignVertical: 'top' }}
      />

      <HotelPriceInput
        voraPrice={room.pricePerNight}
        onVoraPriceChange={(pricePerNight) => onUpdate({ ...room, pricePerNight })}
        listPrice={room.listPricePerNight}
        onListPriceChange={(listPricePerNight) => onUpdate({ ...room, listPricePerNight })}
        showListPrice={room.showListPrice}
        onToggleListPrice={(showListPrice) => onUpdate({ ...room, showListPrice })}
        studentDiscountPct={0}
      />

      <View style={styles.countRow}>
        <View style={{ flex: 1 }}>
          <Input
            label="Oda sayısı"
            value={room.totalCount}
            onChangeText={(totalCount) => {
              const nextTotal = Math.max(1, parseInt(totalCount.replace(/\D/g, ''), 10) || 1);
              const nextOccupied = Math.min(
                nextTotal,
                Math.max(0, parseInt(room.occupiedCount.replace(/\D/g, ''), 10) || 0),
              );
              onUpdate({
                ...room,
                totalCount,
                occupiedCount: nextOccupied < parseInt(room.occupiedCount.replace(/\D/g, ''), 10) || 0
                  ? String(nextOccupied)
                  : room.occupiedCount,
              });
            }}
            keyboardType="number-pad"
          />
        </View>
        {showOccupied ? (
          <View style={{ flex: 1 }}>
            <Input
              label="Dolu oda"
              value={room.occupiedCount}
              onChangeText={(occupiedCount) => onUpdate({ ...room, occupiedCount })}
              keyboardType="number-pad"
            />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Input
            label="Max kişi"
            value={room.maxGuests}
            onChangeText={(maxGuests) => onUpdate({ ...room, maxGuests })}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <View style={styles.photoSection}>
        <Text variant="caption" muted>
          Oda fotoğrafı · {room.photoUris.length}/{HOTEL_MAX_ROOM_PHOTOS}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoScroll}>
          <Pressable onPress={() => void pickPhoto()} style={[styles.photoAdd, { borderColor: `${HOTEL_ACCENT}55` }]}>
            <LinearGradient colors={[`${HOTEL_ACCENT}22`, `${HOTEL_ACCENT}08`]} style={styles.photoAddInner}>
              <Ionicons name="camera-outline" size={22} color={HOTEL_ACCENT} />
            </LinearGradient>
          </Pressable>
          {room.photoUris.map((uri, photoIndex) => (
            <RoomPhotoTile
              key={`${uri}-${photoIndex}`}
              uri={uri}
              onRemove={() =>
                onUpdate({ ...room, photoUris: room.photoUris.filter((_, i) => i !== photoIndex) })
              }
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

export function HotelRoomTypesEditor({ roomTypes, onChange, showOccupied = false }: Props) {
  const { colors } = useTheme();

  const updateAt = (index: number, next: DraftHotelRoomType) => {
    onChange(roomTypes.map((room, i) => (i === index ? next : room)));
  };

  const removeAt = (index: number) => {
    if (roomTypes.length <= 1) return;
    onChange(roomTypes.filter((_, i) => i !== index));
  };

  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= roomTypes.length) return;
    const next = [...roomTypes];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    onChange(next);
  };

  const addPreset = (preset: string) => {
    if (roomTypes.length >= HOTEL_MAX_ROOM_TYPES) return;
    onChange([...roomTypes, createEmptyDraftRoomType(preset)]);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.presetRow}>
        {HOTEL_ROOM_TYPE_PRESETS.map((preset) => (
          <Pressable
            key={preset}
            onPress={() => addPreset(preset)}
            disabled={roomTypes.length >= HOTEL_MAX_ROOM_TYPES}
            style={({ pressed }) => [
              styles.presetChip,
              {
                borderColor: `${HOTEL_ACCENT}44`,
                backgroundColor: colors.surface,
                opacity: pressed ? 0.85 : roomTypes.length >= HOTEL_MAX_ROOM_TYPES ? 0.45 : 1,
              },
            ]}
          >
            <Ionicons name="add" size={12} color={HOTEL_ACCENT} />
            <Text variant="caption" style={{ color: HOTEL_ACCENT, fontWeight: '600' }}>
              {preset}
            </Text>
          </Pressable>
        ))}
      </View>

      {roomTypes.map((room, index) => (
        <RoomTypeCard
          key={room.clientKey}
          room={room}
          index={index}
          total={roomTypes.length}
          showOccupied={showOccupied}
          onUpdate={(next) => updateAt(index, next)}
          onRemove={() => removeAt(index)}
          onMoveUp={() => move(index, -1)}
          onMoveDown={() => move(index, 1)}
        />
      ))}

      <Pressable
        onPress={() => onChange([...roomTypes, createEmptyDraftRoomType()])}
        disabled={roomTypes.length >= HOTEL_MAX_ROOM_TYPES}
        style={({ pressed }) => [
          styles.addRoomBtn,
          {
            borderColor: `${HOTEL_ACCENT}55`,
            opacity: pressed ? 0.88 : roomTypes.length >= HOTEL_MAX_ROOM_TYPES ? 0.45 : 1,
          },
        ]}
      >
        <Ionicons name="add-circle-outline" size={20} color={HOTEL_ACCENT} />
        <Text variant="label" style={{ color: HOTEL_ACCENT }}>
          Oda tipi ekle
        </Text>
        <Text secondary variant="caption">
          {roomTypes.length}/{HOTEL_MAX_ROOM_TYPES}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  roomCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  roomCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  roomIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  countRow: { flexDirection: 'row', gap: spacing.sm },
  photoSection: { gap: spacing.xs },
  photoScroll: { gap: spacing.sm },
  photoAdd: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  photoAddInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photoTile: { width: 72 },
  photoFrame: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  addRoomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
});
