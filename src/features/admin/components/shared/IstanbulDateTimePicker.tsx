import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import {
  IstanbulSchedulePickerModal,
  type IstanbulSchedulePickerMode,
} from '@/features/admin/components/shared/IstanbulSchedulePickerModal';
import {
  formatIstanbulSchedule,
  ISTANBUL_SCHEDULE_LABEL,
  type IstanbulScheduleParts,
} from '@/features/admin/utils/istanbulSchedule';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  value: IstanbulScheduleParts;
  onChange: (parts: IstanbulScheduleParts) => void;
};

export function IstanbulDateTimePicker({ value, onChange }: Props) {
  const { colors } = useTheme();
  const [pickerMode, setPickerMode] = useState<IstanbulSchedulePickerMode | null>(null);

  const scheduleLabel = useMemo(() => formatIstanbulSchedule(value), [value]);

  const openPicker = (mode: IstanbulSchedulePickerMode) => setPickerMode(mode);
  const closePicker = () => setPickerMode(null);

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        onPress={() => openPicker('date')}
        style={[styles.scheduleCard, { borderColor: colors.border, backgroundColor: `${colors.surface}AA` }]}
      >
        <Text variant="label">{scheduleLabel}</Text>
        <Text secondary variant="caption">
          {ISTANBUL_SCHEDULE_LABEL} · dokunarak düzenleyin
        </Text>
      </Pressable>
      <View style={styles.actions}>
        <AdminActionChip
          label="Tarih seç"
          icon="calendar-outline"
          onPress={() => openPicker('date')}
          compact
        />
        <AdminActionChip
          label="Saat seç"
          icon="time-outline"
          onPress={() => openPicker('time')}
          compact
        />
      </View>

      <IstanbulSchedulePickerModal
        visible={pickerMode != null}
        mode={pickerMode ?? 'date'}
        value={value}
        onClose={closePicker}
        onConfirm={(parts) => {
          onChange(parts);
          closePicker();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  scheduleCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
