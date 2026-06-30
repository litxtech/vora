import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { RideCityField, RideCityPicker } from '@/features/rides/components/RideCityPicker';
import { RideDepartureFields } from '@/features/rides/components/RideDepartureFields';
import { RideRoutePreview } from '@/features/rides/components/RideRoutePreview';
import {
  RIDES_ACCENT,
} from '@/features/rides/constants';
import type { RideFilters } from '@/features/rides/types';
import {
  defaultRideDepartureAt,
  departureAtToIsoDate,
  parseRideDepartureAt,
} from '@/features/rides/utils/dateFormat';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  visible: boolean;
  filters: RideFilters;
  onClose: () => void;
  onApply: (filters: RideFilters) => void;
};

type CityPickerMode = 'from' | 'to' | null;

export function RideSearchSheet({ visible, filters, onClose, onApply }: Props) {
  const { colors } = useTheme();
  const [local, setLocal] = useState<RideFilters>(filters);
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [cityPicker, setCityPicker] = useState<CityPickerMode>(null);

  useEffect(() => {
    if (visible) {
      setLocal(filters);
      setFilterDate(
        filters.departureDate ? parseRideDepartureAt(filters.departureDate, '12:00') : null,
      );
    }
  }, [visible, filters]);

  if (!visible) return null;

  const handleApply = () => {
    onApply({
      ...local,
      departureDate: filterDate ? departureAtToIsoDate(filterDate) : null,
    });
  };

  return (
    <>
      <Modal visible animationType={resolveModalAnimationType('slide')} transparent onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text variant="h3" style={{ marginBottom: spacing.md }}>
              Yolculuk Ara
            </Text>

            <RideCityField
              label="Nereden"
              value={local.fromCityId ?? null}
              placeholder="Tüm şehirler"
              onPress={() => setCityPicker('from')}
            />
            <RideCityField
              label="Nereye"
              value={local.toCityId ?? null}
              placeholder="Tüm şehirler"
              onPress={() => setCityPicker('to')}
            />

            <View style={styles.dateRow}>
              {filterDate ? (
                <View style={{ flex: 1 }}>
                  <RideDepartureFields
                    value={filterDate}
                    onChange={setFilterDate}
                    showTime={false}
                    enforceFutureDeparture={false}
                  />
                </View>
              ) : (
                <Pressable
                  onPress={() => setFilterDate(defaultRideDepartureAt())}
                  style={[styles.datePlaceholder, { borderColor: colors.border, backgroundColor: colors.surface }]}
                >
                  <Text variant="caption" secondary>
                    Tarih seçin (isteğe bağlı)
                  </Text>
                </Pressable>
              )}
              {filterDate ? (
                <Pressable onPress={() => setFilterDate(null)} hitSlop={8} style={styles.clearDate}>
                  <Text variant="caption" style={{ color: RIDES_ACCENT }}>
                    Temizle
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.toggles}>
              <Pressable
                onPress={() => setLocal((f) => ({ ...f, womenOnly: !f.womenOnly }))}
                style={[styles.toggle, local.womenOnly && { backgroundColor: `${RIDES_ACCENT}22` }]}
              >
                <Text variant="caption">♀ Kadınlara özel</Text>
              </Pressable>
              <Pressable
                onPress={() => setLocal((f) => ({ ...f, petsAllowed: !f.petsAllowed }))}
                style={[styles.toggle, local.petsAllowed && { backgroundColor: `${RIDES_ACCENT}22` }]}
              >
                <Text variant="caption">🐾 Evcil hayvan</Text>
              </Pressable>
              <Pressable
                onPress={() => setLocal((f) => ({ ...f, noSmoking: !f.noSmoking }))}
                style={[styles.toggle, local.noSmoking && { backgroundColor: `${RIDES_ACCENT}22` }]}
              >
                <Text variant="caption">🚭 Sigara yok</Text>
              </Pressable>
            </View>

            {local.fromCityId && local.toCityId ? (
              <RideRoutePreview
                fromCityId={local.fromCityId}
                toCityId={local.toCityId}
                stopCityIds={[]}
              />
            ) : null}

            <Button title="Ara" onPress={handleApply} />
            <Button title="Kapat" variant="outline" onPress={onClose} style={{ marginTop: spacing.sm }} />
          </Pressable>
        </Pressable>
      </Modal>

      <RideCityPicker
        visible={cityPicker === 'from'}
        title="Nereden"
        selectedId={local.fromCityId}
        onClose={() => setCityPicker(null)}
        onSelect={(id) => {
          setLocal((f) => ({ ...f, fromCityId: id }));
          setCityPicker(null);
        }}
      />
      <RideCityPicker
        visible={cityPicker === 'to'}
        title="Nereye"
        selectedId={local.toCityId}
        onClose={() => setCityPicker(null)}
        onSelect={(id) => {
          setLocal((f) => ({ ...f, toCityId: id }));
          setCityPicker(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
    gap: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  toggles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginVertical: spacing.sm },
  dateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  datePlaceholder: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
    justifyContent: 'center',
  },
  clearDate: { paddingBottom: spacing.md },
  toggle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
});
