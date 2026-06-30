import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import {
  buildRideDateOptions,
  buildRideTimeSlotOptions,
  bumpRideDepartureToNextSlot,
  departureAtToIsoDate,
  departureAtToTimeInput,
  formatRideDateOptionLabel,
  isRideDepartureToday,
  mergeRideDatePart,
  mergeRideTimePart,
  type RideTimeSlot,
} from '@/features/rides/utils/dateFormat';
import { RIDES_ACCENT } from '@/features/rides/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type RideDeparturePickerMode = 'date' | 'time';

type Props = {
  visible: boolean;
  mode: RideDeparturePickerMode;
  value: Date;
  minDate: Date;
  enforceFutureDeparture: boolean;
  onClose: () => void;
  onConfirm: (next: Date) => void;
};

export function RideDeparturePickerModal({
  visible,
  mode,
  value,
  minDate,
  enforceFutureDeparture,
  onClose,
  onConfirm,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!visible) return;
    setDraft(enforceFutureDeparture ? bumpRideDepartureToNextSlot(value) : value);
  }, [visible, value, enforceFutureDeparture]);

  const dateOptions = useMemo(() => buildRideDateOptions(minDate), [minDate]);
  const timeOptions = useMemo(() => {
    const notBefore = enforceFutureDeparture && isRideDepartureToday(draft) ? new Date() : undefined;
    return buildRideTimeSlotOptions(notBefore);
  }, [draft, enforceFutureDeparture]);

  const selectedDateIso = departureAtToIsoDate(draft);
  const selectedTime = departureAtToTimeInput(draft);

  const title = mode === 'date' ? 'Tarih seçin' : 'Saat seçin';
  const hint =
    mode === 'date'
      ? 'Yalnızca bugün ve sonraki günler'
      : enforceFutureDeparture && isRideDepartureToday(draft)
        ? 'Bugün için geçmiş saat seçilemez'
        : '15 dakikalık aralıklar';

  if (!visible) return null;

  const handleConfirm = () => onConfirm(draft);

  return (
    <Modal visible animationType={resolveModalAnimationType('slide')} presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8} style={[styles.iconBtn, { backgroundColor: `${colors.textMuted}18` }]}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>
          <View style={styles.headerText}>
            <Text variant="h3">{title}</Text>
            <Text secondary variant="caption">
              {hint}
            </Text>
          </View>
          <View style={styles.iconBtn} />
        </View>

        <View style={styles.body}>
        {mode === 'date' ? (
          <FlatList
            data={dateOptions}
            keyExtractor={(item) => departureAtToIsoDate(item)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const iso = departureAtToIsoDate(item);
              const selected = iso === selectedDateIso;
              return (
                <Pressable
                  onPress={() => {
                    let next = mergeRideDatePart(draft, item);
                    if (enforceFutureDeparture) next = bumpRideDepartureToNextSlot(next);
                    setDraft(next);
                  }}
                  style={[
                    styles.option,
                    {
                      borderColor: selected ? RIDES_ACCENT : colors.border,
                      backgroundColor: selected ? `${RIDES_ACCENT}14` : colors.surface,
                    },
                  ]}
                >
                  <Text variant="caption" style={{ flex: 1, fontWeight: selected ? '700' : '500' }}>
                    {formatRideDateOptionLabel(item)}
                  </Text>
                  {selected ? <Ionicons name="checkmark-circle" size={20} color={RIDES_ACCENT} /> : null}
                </Pressable>
              );
            }}
          />
        ) : (
          <FlatList
            data={timeOptions}
            keyExtractor={(item) => item.label}
            numColumns={3}
            columnWrapperStyle={styles.timeRow}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text secondary style={styles.empty}>
                Bugün için uygun saat kalmadı. Tarihi yarına alın.
              </Text>
            }
            renderItem={({ item }: { item: RideTimeSlot }) => {
              const selected = item.label === selectedTime;
              return (
                <Pressable
                  onPress={() => setDraft(mergeRideTimePart(draft, item.hours, item.minutes))}
                  style={[
                    styles.timeOption,
                    {
                      borderColor: selected ? RIDES_ACCENT : colors.border,
                      backgroundColor: selected ? `${RIDES_ACCENT}14` : colors.surface,
                    },
                  ]}
                >
                  <Text variant="caption" style={{ fontWeight: selected ? '700' : '500' }}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            }}
          />
        )}
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md, borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <Button title="Tamam" onPress={handleConfirm} />
          <Button title="İptal" variant="outline" onPress={onClose} style={{ marginTop: spacing.sm }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerText: { flex: 1, alignItems: 'center', gap: 2 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xs,
  },
  timeRow: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  timeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: '30%',
  },
  empty: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
