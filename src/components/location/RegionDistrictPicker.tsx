import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LocationSheetPicker } from '@/components/location/LocationSheetPicker';
import { DISTRICTS } from '@/constants/districts';
import { REGIONS } from '@/constants/regions';
import type { RegionId } from '@/constants/regions';
import { spacing } from '@/constants/theme';

type RegionDistrictPickerProps = {
  regionId: RegionId | null;
  district: string | null;
  onRegionChange: (id: RegionId) => void;
  onDistrictChange: (district: string) => void;
};

export function RegionDistrictPicker({
  regionId,
  district,
  onRegionChange,
  onDistrictChange,
}: RegionDistrictPickerProps) {
  const regionOptions = useMemo(
    () =>
      REGIONS.map((region) => ({
        id: region.id,
        label: region.name,
        icon: 'location-outline' as const,
      })),
    [],
  );

  const districtOptions = useMemo(() => {
    if (!regionId) return [];
    return (DISTRICTS[regionId] ?? []).map((item) => ({
      id: item,
      label: item,
      icon: 'map-outline' as const,
    }));
  }, [regionId]);

  return (
    <View style={styles.wrap}>
      <LocationSheetPicker
        label="Şehir"
        value={regionId}
        options={regionOptions}
        onChange={onRegionChange}
        placeholder="Şehir seçin"
        sheetTitle="Şehir seçin"
        searchPlaceholder="Şehir ara…"
      />

      <LocationSheetPicker
        label="İlçe"
        value={district}
        options={districtOptions}
        onChange={onDistrictChange}
        placeholder={regionId ? 'İlçe seçin' : 'Önce şehir seçin'}
        sheetTitle="İlçe seçin"
        sheetSubtitle={
          regionId ? REGIONS.find((region) => region.id === regionId)?.name : undefined
        }
        searchPlaceholder="İlçe ara…"
        disabled={!regionId || districtOptions.length === 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
});
