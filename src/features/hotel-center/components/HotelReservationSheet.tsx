import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { StickyKeyboardFooter } from '@/components/keyboard/StickyKeyboardFooter';
import {
  HOTEL_ACCENT,
  discountedPrice,
  formatHotelPrice,
  hotelCommissionBreakdown,
} from '@/features/hotel-center/constants';
import { HotelFeeBreakdown } from '@/features/hotel-center/components/HotelFeeBreakdown';
import { HotelRoomTypesList } from '@/features/hotel-center/components/HotelRoomTypesList';
import {
  createHotelReservation,
  formatReservationTotal,
  startHotelStripeCheckout,
} from '@/features/hotel-center/services/hotelPayment';
import type { HotelListingDetail, HotelRoomType } from '@/features/hotel-center/types';
import { radius, spacing } from '@/constants/theme';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  visible: boolean;
  hotel: HotelListingDetail;
  onClose: () => void;
  onSuccess: (reservationId: string, reservationCode: string) => void;
};

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function splitFullName(fullName: string | null | undefined): { first: string; last: string } {
  if (!fullName?.trim()) return { first: '', last: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function isValidPhone(phone: string): boolean {
  return phone.replace(/\D/g, '').length >= 10;
}

function firstAvailableRoomType(roomTypes: HotelRoomType[]): HotelRoomType | null {
  return roomTypes.find((room) => room.totalCount - room.occupiedCount > 0) ?? roomTypes[0] ?? null;
}

export function HotelReservationSheet({ visible, hotel, onClose, onSuccess }: Props) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const tomorrow = useMemo(() => addDays(new Date(), 1), []);
  const dayAfter = useMemo(() => addDays(new Date(), 2), []);

  const [checkIn, setCheckIn] = useState(tomorrow);
  const [checkOut, setCheckOut] = useState(dayAfter);
  const [guestsCount, setGuestsCount] = useState(1);
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLastName, setGuestLastName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [applyStudentDiscount, setApplyStudentDiscount] = useState(hotel.studentDiscountPct > 0);
  const [guestNote, setGuestNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [payAtHotel, setPayAtHotel] = useState(false);
  const [picker, setPicker] = useState<'checkIn' | 'checkOut' | null>(null);
  const [footerHeight, setFooterHeight] = useState(0);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string | null>(null);

  const roomTypes = hotel.roomTypes ?? [];
  const selectedRoomType =
    roomTypes.find((room) => room.id === selectedRoomTypeId) ?? firstAvailableRoomType(roomTypes);

  useEffect(() => {
    if (!visible) return;
    const fromProfile = splitFullName(profile?.full_name);
    setCheckIn(tomorrow);
    setCheckOut(dayAfter);
    setGuestsCount(1);
    setGuestFirstName(fromProfile.first);
    setGuestLastName(fromProfile.last);
    setGuestPhone('');
    setApplyStudentDiscount(hotel.studentDiscountPct > 0);
    setGuestNote('');
    setPicker(null);
    const defaultRoom = firstAvailableRoomType(roomTypes);
    setSelectedRoomTypeId(defaultRoom?.id ?? null);
  }, [visible, hotel.id, hotel.studentDiscountPct, hotel.roomTypes, tomorrow, dayAfter, profile?.full_name]);

  const nights = nightsBetween(checkIn, checkOut);
  const baseNightly = selectedRoomType?.pricePerNight ?? hotel.pricePerNight;
  const nightly = applyStudentDiscount && hotel.studentDiscountPct > 0
    ? discountedPrice(baseNightly, hotel.studentDiscountPct)
    : baseNightly;
  const grossCents = nightly * nights * 100;

  const handleReserve = async () => {
    if (checkOut <= checkIn) {
      Alert.alert('Tarih hatası', 'Çıkış tarihi girişten sonra olmalı.');
      return;
    }
    if (roomTypes.length > 0 && !selectedRoomType) {
      Alert.alert('Oda seçimi', 'Lütfen bir oda tipi seçin.');
      return;
    }
    if (selectedRoomType && guestsCount > selectedRoomType.maxGuests) {
      Alert.alert('Kapasite', `${selectedRoomType.name} en fazla ${selectedRoomType.maxGuests} kişi alır.`);
      return;
    }
    if (!guestFirstName.trim()) {
      Alert.alert('İletişim bilgisi', 'Ad alanı zorunludur.');
      return;
    }
    if (!guestLastName.trim()) {
      Alert.alert('İletişim bilgisi', 'Soyad alanı zorunludur.');
      return;
    }
    if (!isValidPhone(guestPhone)) {
      Alert.alert('İletişim bilgisi', 'Geçerli bir telefon numarası girin.');
      return;
    }

    setSubmitting(true);
    const payload = {
      hotelId: hotel.id,
      roomTypeId: selectedRoomType?.id ?? null,
      checkIn: toIsoDate(checkIn),
      checkOut: toIsoDate(checkOut),
      guestsCount,
      applyStudentDiscount: applyStudentDiscount && hotel.studentDiscountPct > 0,
      guestFirstName: guestFirstName.trim(),
      guestLastName: guestLastName.trim(),
      guestPhone: guestPhone.trim(),
      guestNote: guestNote.trim() || undefined,
    };

    const result = payAtHotel
      ? await createHotelReservation(payload)
      : await startHotelStripeCheckout(payload).then((r) =>
          r.error
            ? { reservationId: null as string | null, reservationCode: null as string | null, error: r.error }
            : { reservationId: 'stripe', reservationCode: null, error: null },
        );
    setSubmitting(false);

    if (result.error) {
      Alert.alert('Rezervasyon', result.error);
      return;
    }
    if (payAtHotel) {
      if (!result.reservationId || !result.reservationCode) return;
      onSuccess(result.reservationId, result.reservationCode);
      onClose();
      return;
    }

    Alert.alert('Ödeme', 'Stripe ödeme sayfası açıldı. Ödeme tamamlandığında rezervasyonunuz onaylanır.');
    onClose();
  };

  const onDateChange = (field: 'checkIn' | 'checkOut', date?: Date) => {
    setPicker(Platform.OS === 'ios' ? field : null);
    if (!date) return;
    if (field === 'checkIn') {
      setCheckIn(date);
      if (date >= checkOut) setCheckOut(addDays(date, 1));
    } else {
      setCheckOut(date);
    }
  };

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('slide')} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              maxHeight: '92%',
            },
          ]}
        >
          <View style={styles.handle} />

          <KeyboardAwareScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            bottomOffset={footerHeight + spacing.md}
            extraKeyboardSpace={spacing.sm}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: footerHeight + spacing.md },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <Text variant="h3">Rezervasyon</Text>
            <Text secondary variant="caption">
              {hotel.name}
              {selectedRoomType ? ` · ${selectedRoomType.name}` : ''}
              {' · '}ödeme otelde yapılır
            </Text>

            {roomTypes.length > 0 ? (
              <HotelRoomTypesList
                roomTypes={roomTypes}
                studentDiscountPct={hotel.studentDiscountPct}
                selectable
                selectedId={selectedRoomType?.id ?? null}
                onSelect={(room) => setSelectedRoomTypeId(room.id)}
              />
            ) : null}

            <Text variant="label" style={styles.sectionLabel}>
              İletişim bilgileri
            </Text>
            <View style={styles.nameRow}>
              <TextInput
                value={guestFirstName}
                onChangeText={setGuestFirstName}
                placeholder="Ad"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                style={[styles.fieldInput, styles.nameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
              />
              <TextInput
                value={guestLastName}
                onChangeText={setGuestLastName}
                placeholder="Soyad"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                style={[styles.fieldInput, styles.nameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
              />
            </View>
            <TextInput
              value={guestPhone}
              onChangeText={setGuestPhone}
              placeholder="Telefon (05xx xxx xx xx)"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              style={[styles.fieldInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
            />

            <View style={styles.dateRow}>
              <Pressable
                onPress={() => setPicker('checkIn')}
                style={[styles.dateBox, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
              >
                <Text variant="caption" secondary>Giriş</Text>
                <Text variant="label">{toIsoDate(checkIn)}</Text>
              </Pressable>
              <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
              <Pressable
                onPress={() => setPicker('checkOut')}
                style={[styles.dateBox, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
              >
                <Text variant="caption" secondary>Çıkış</Text>
                <Text variant="label">{toIsoDate(checkOut)}</Text>
              </Pressable>
            </View>

            {picker ? (
              <DateTimePicker
                value={picker === 'checkIn' ? checkIn : checkOut}
                mode="date"
                minimumDate={picker === 'checkIn' ? new Date() : addDays(checkIn, 1)}
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, date) => onDateChange(picker, date)}
              />
            ) : null}

            <View style={styles.guestRow}>
              <Text variant="label">Misafir sayısı</Text>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => setGuestsCount((c) => Math.max(1, c - 1))}
                  style={[styles.stepBtn, { borderColor: colors.border }]}
                >
                  <Ionicons name="remove" size={18} color={colors.text} />
                </Pressable>
                <Text variant="label">{guestsCount}</Text>
                <Pressable
                  onPress={() => setGuestsCount((c) => Math.min(8, c + 1))}
                  style={[styles.stepBtn, { borderColor: colors.border }]}
                >
                  <Ionicons name="add" size={18} color={colors.text} />
                </Pressable>
              </View>
            </View>

            {hotel.studentDiscountPct > 0 ? (
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="label">Öğrenci indirimi (%{hotel.studentDiscountPct})</Text>
                  <Text secondary variant="caption">
                    Geçerli öğrenci belgesi gerekebilir
                  </Text>
                </View>
                <Switch
                  value={applyStudentDiscount}
                  onValueChange={setApplyStudentDiscount}
                  trackColor={{ true: `${HOTEL_ACCENT}88`, false: colors.border }}
                  thumbColor={applyStudentDiscount ? HOTEL_ACCENT : colors.surface}
                />
              </View>
            ) : null}

            <Text variant="label" style={styles.noteLabel}>
              Otele not
            </Text>
            <TextInput
              value={guestNote}
              onChangeText={setGuestNote}
              placeholder="Varış saati, özel istek… (opsiyonel)"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={300}
              textAlignVertical="top"
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
            />

            <View style={styles.payModeRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="label">Otelde öde</Text>
                <Text secondary variant="caption">
                  Kapalıyken Vora güvenli online ödeme
                </Text>
              </View>
              <Switch value={payAtHotel} onValueChange={setPayAtHotel} trackColor={{ true: HOTEL_ACCENT }} />
            </View>

            <View style={[styles.totalBox, { backgroundColor: `${HOTEL_ACCENT}10`, borderColor: `${HOTEL_ACCENT}33` }]}>
              <Text variant="caption" secondary>
                {nights} gece × {formatHotelPrice(nightly)}
              </Text>
              <Text variant="h3" style={{ color: HOTEL_ACCENT }}>
                {formatReservationTotal(grossCents)}
              </Text>
              <HotelFeeBreakdown
                {...hotelCommissionBreakdown(grossCents)}
                role="guest"
                compact
              />
            </View>
          </KeyboardAwareScrollView>

          <StickyKeyboardFooter
            backgroundColor={colors.surface}
            style={[styles.footer, { borderTopColor: colors.border, paddingTop: spacing.sm }]}
            onLayoutHeight={setFooterHeight}
          >
            <View style={styles.actions}>
              <Button title="Vazgeç" variant="outline" onPress={onClose} style={styles.btn} />
              <Button
                title={payAtHotel ? 'Rezervasyon Yap' : 'Güvenli Ödeme ile Rezervasyon Yap'}
                onPress={() => void handleReserve()}
                loading={submitting}
                style={styles.btn}
              />
            </View>
          </StickyKeyboardFooter>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  payModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.45)',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  sectionLabel: {
    marginTop: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  nameInput: {
    flex: 1,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dateBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  noteLabel: {
    marginTop: spacing.sm,
  },
  input: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  totalBox: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: { flex: 1 },
});
