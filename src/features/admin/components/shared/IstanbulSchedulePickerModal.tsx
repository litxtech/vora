import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import {
  buildIstanbulDateOptions,
  buildIstanbulTimeSlotOptions,
  isFutureIstanbulSchedule,
  isIstanbulScheduleToday,
  ISTANBUL_SCHEDULE_LABEL,
  mergeIstanbulDatePart,
  mergeIstanbulTimePart,
  type IstanbulScheduleParts,
  type IstanbulTimeSlot,
} from '@/features/admin/utils/istanbulSchedule';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type IstanbulSchedulePickerMode = 'date' | 'time';

type Props = {
  visible: boolean;
  mode: IstanbulSchedulePickerMode;
  value: IstanbulScheduleParts;
  onClose: () => void;
  onConfirm: (parts: IstanbulScheduleParts) => void;
};

export function IstanbulSchedulePickerModal({
  visible,
  mode,
  value,
  onClose,
  onConfirm,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const dateOptions = useMemo(() => buildIstanbulDateOptions(), []);
  const timeOptions = useMemo(() => buildIstanbulTimeSlotOptions(draft.dateIso), [draft.dateIso]);

  const title = mode === 'date' ? 'Tarih seçin' : 'Saat seçin';
  const hint =
    mode === 'date'
      ? `${ISTANBUL_SCHEDULE_LABEL} · bugün ve sonraki günler`
      : isIstanbulScheduleToday(draft)
        ? 'Bugün için geçmiş saat seçilemez'
        : `${ISTANBUL_SCHEDULE_LABEL} · her dakika`;

  if (!visible) return null;

  const handleConfirm = () => {
    if (!isFutureIstanbulSchedule(draft)) {
      Alert.alert('Zaman', 'Geçmiş bir tarih veya saat seçilemez.');
      return;
    }
    onConfirm(draft);
  };

  return (
    <Modal visible animationType={resolveModalAnimationType('slide')} presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={[styles.iconBtn, { backgroundColor: `${colors.textMuted}18` }]}
          >
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

        {mode === 'date' ? (
          <FlatList
            data={dateOptions}
            keyExtractor={(item) => item.dateIso}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 88 }]}
            renderItem={({ item }) => {
              const selected = item.dateIso === draft.dateIso;
              return (
                <Pressable
                  onPress={() => setDraft(mergeIstanbulDatePart(draft, item.dateIso))}
                  style={[
                    styles.option,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? `${colors.primary}14` : colors.surface,
                    },
                  ]}
                >
                  <Text variant="caption" style={{ flex: 1, fontWeight: selected ? '700' : '500' }}>
                    {item.label}
                  </Text>
                  {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
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
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 88 }]}
            ListEmptyComponent={
              <Text secondary style={styles.empty}>
                Bugün için uygun saat kalmadı. Tarihi yarına alın.
              </Text>
            }
            renderItem={({ item }: { item: IstanbulTimeSlot }) => {
              const selected = item.hour === draft.hour && item.minute === draft.minute;
              return (
                <Pressable
                  onPress={() => setDraft(mergeIstanbulTimePart(draft, item.hour, item.minute))}
                  style={[
                    styles.timeOption,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? `${colors.primary}14` : colors.surface,
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

        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + spacing.md,
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <Button title="Tamam" onPress={handleConfirm} />
          <Button title="İptal" variant="outline" onPress={onClose} style={{ marginTop: spacing.sm }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
