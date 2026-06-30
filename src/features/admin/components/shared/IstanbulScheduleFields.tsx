import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { IstanbulDateTimePicker } from '@/features/admin/components/shared/IstanbulDateTimePicker';
import { AdminFilterChip } from '@/features/admin/components/shared/AdminFilterChip';
import { ISTANBUL_SCHEDULE_LABEL, type IstanbulScheduleParts } from '@/features/admin/utils/istanbulSchedule';
import { spacing } from '@/constants/theme';

const SEND_WHEN_OPTIONS = [
  { id: 'now' as const, label: 'Hemen (manuel gönder)' },
  { id: 'scheduled' as const, label: 'Tarih ve saat seç' },
];

type Props = {
  sendWhen: 'now' | 'scheduled';
  schedule: IstanbulScheduleParts;
  onSendWhenChange: (value: 'now' | 'scheduled') => void;
  onScheduleChange: (parts: IstanbulScheduleParts) => void;
};

export function IstanbulScheduleFields({
  sendWhen,
  schedule,
  onSendWhenChange,
  onScheduleChange,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text secondary variant="caption">
        Ne zaman gönderilsin?
      </Text>
      <AdminFilterChip options={SEND_WHEN_OPTIONS} value={sendWhen} onChange={onSendWhenChange} />

      {sendWhen === 'scheduled' ? (
        <View style={styles.scheduleBlock}>
          <IstanbulDateTimePicker value={schedule} onChange={onScheduleChange} />
          <Text secondary variant="caption">
            Seçilen {ISTANBUL_SCHEDULE_LABEL.toLowerCase()} ile push otomatik gider.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  scheduleBlock: { gap: spacing.sm },
});
