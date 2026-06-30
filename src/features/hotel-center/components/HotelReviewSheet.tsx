import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { HotelStarRating } from '@/features/hotel-center/components/HotelStarRating';
import { HOTEL_ACCENT, HOTEL_GUEST_TYPE_LABELS } from '@/features/hotel-center/constants';
import type { HotelGuestType } from '@/features/hotel-center/types';
import { radius, spacing } from '@/constants/theme';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  visible: boolean;
  initialRating?: number;
  initialGuestType?: HotelGuestType;
  initialComment?: string;
  onClose: () => void;
  onSubmit: (rating: number, guestType: HotelGuestType, comment: string) => Promise<void>;
};

const GUEST_TYPES: HotelGuestType[] = ['student', 'guest', 'other'];

export function HotelReviewSheet({
  visible,
  initialRating = 0,
  initialGuestType = 'guest',
  initialComment = '',
  onClose,
  onSubmit,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [rating, setRating] = useState(initialRating);
  const [guestType, setGuestType] = useState<HotelGuestType>(initialGuestType);
  const [comment, setComment] = useState(initialComment);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setRating(initialRating);
    setGuestType(initialGuestType);
    setComment(initialComment);
  }, [visible, initialRating, initialGuestType, initialComment]);

  const handleSubmit = async () => {
    if (rating < 1) return;
    setSubmitting(true);
    await onSubmit(rating, guestType, comment);
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.sm }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Ionicons name="star" size={16} color={HOTEL_ACCENT} />
            <Text variant="label">Değerlendirme</Text>
          </View>

          <View style={styles.stars}>
            <HotelStarRating rating={rating} size={26} interactive onRate={setRating} />
          </View>

          <View style={styles.guestTypes}>
            {GUEST_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => setGuestType(type)}
                style={[
                  styles.guestChip,
                  {
                    backgroundColor: guestType === type ? `${HOTEL_ACCENT}18` : colors.surfaceElevated,
                    borderColor: guestType === type ? HOTEL_ACCENT : colors.border,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  style={{ color: guestType === type ? HOTEL_ACCENT : colors.text, fontWeight: '600', fontSize: 11 }}
                >
                  {HOTEL_GUEST_TYPE_LABELS[type]}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Kısa yorum (opsiyonel)"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            textAlignVertical="top"
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
          />

          <View style={styles.actions}>
            <Button title="Vazgeç" variant="outline" onPress={onClose} style={styles.btn} size="compact" />
            <Button
              title="Gönder"
              onPress={() => void handleSubmit()}
              loading={submitting}
              disabled={rating < 1}
              style={styles.btn}
              size="compact"
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)',
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stars: { alignItems: 'center', paddingVertical: spacing.xs },
  guestTypes: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  guestChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  input: {
    minHeight: 56,
    maxHeight: 88,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  btn: { flex: 1 },
});
