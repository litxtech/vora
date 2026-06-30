import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { RideDeparturePickerModal, type RideDeparturePickerMode } from '@/features/rides/components/RideDeparturePickerModal';
import {
  bumpRideDepartureToNextSlot,
  departureAtToIsoDate,
  departureAtToTimeInput,
  formatRideDepartureAt,
  mergeRideDatePart,
  mergeRideTimePart,
  rideMinimumDepartureDate,
} from '@/features/rides/utils/dateFormat';
import { isFutureRideDeparture } from '@/features/rides/utils/rideTimezone';
import { RIDES_ACCENT } from '@/features/rides/constants';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  value: Date;
  onChange: (next: Date) => void;
  minimumDate?: Date;
  showTime?: boolean;
  enforceFutureDeparture?: boolean;
};

function PickerField({
  label,
  value,
  placeholder,
  icon,
  onPress,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const shown = value?.trim();

  return (
    <View style={styles.fieldWrap}>
      <Text variant="caption" secondary>
        {label}
      </Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.fieldBtn,
          { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Ionicons name={icon} size={18} color={RIDES_ACCENT} />
        <Text variant="caption" style={{ flex: 1, fontWeight: shown ? '600' : '400' }} numberOfLines={1}>
          {shown || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

export function RideDepartureFields({
  value,
  onChange,
  minimumDate,
  showTime = true,
  enforceFutureDeparture = true,
}: Props) {
  const [picker, setPicker] = useState<RideDeparturePickerMode | null>(null);
  const labels = formatRideDepartureAt(value);

  const minDate = useMemo(
    () => minimumDate ?? rideMinimumDepartureDate(),
    [minimumDate],
  );

  const validateAndApply = (next: Date, mode: RideDeparturePickerMode) => {
    let merged =
      mode === 'date'
        ? mergeRideDatePart(value, next)
        : mergeRideTimePart(value, next.getHours(), next.getMinutes());

    if (enforceFutureDeparture && showTime && mode === 'date') {
      merged = bumpRideDepartureToNextSlot(merged);
    }

    const iso = departureAtToIsoDate(merged);
    const minIso = departureAtToIsoDate(minDate);

    if (iso < minIso) {
      Alert.alert('Tarih', 'Geçmiş bir tarih seçilemez. Bugün veya sonrasını seçin.');
      return;
    }

    if (enforceFutureDeparture && showTime && !isFutureRideDeparture(iso, departureAtToTimeInput(merged))) {
      Alert.alert('Saat', 'Kalkış saati geçmiş olamaz. İleriki bir saat seçin.');
      return;
    }

    onChange(merged);
    setPicker(null);
  };

  return (
    <>
      <View style={showTime ? styles.row : undefined}>
        <View style={showTime ? styles.col : undefined}>
          <PickerField
            label="Tarih"
            value={labels.dateLabel}
            placeholder="Tarih seçin"
            icon="calendar-outline"
            onPress={() => setPicker('date')}
          />
        </View>
        {showTime ? (
          <View style={styles.col}>
            <PickerField
              label="Saat"
              value={labels.timeLabel}
              placeholder="Saat seçin"
              icon="time-outline"
              onPress={() => setPicker('time')}
            />
          </View>
        ) : null}
      </View>

      <RideDeparturePickerModal
        visible={picker != null}
        mode={picker ?? 'date'}
        value={value}
        minDate={minDate}
        enforceFutureDeparture={enforceFutureDeparture}
        onClose={() => setPicker(null)}
        onConfirm={(next) => {
          if (picker) validateAndApply(next, picker);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  col: {
    flex: 1,
  },
  fieldWrap: {
    gap: spacing.xs,
  },
  fieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
});
