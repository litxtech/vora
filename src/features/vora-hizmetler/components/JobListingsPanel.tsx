import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { HizmetProfessionPickerTrigger } from '@/features/vora-hizmetler/components/HizmetProfessionPickerTrigger';
import { HizmetProfessionSheet } from '@/features/vora-hizmetler/components/HizmetProfessionSheet';
import { ServiceRequestCard } from '@/features/vora-hizmetler/components/ServiceRequestCard';
import {
  serviceCategoryLabel,
  VORA_HIZMETLER_ACCENT,
  type ServiceProfessionOption,
} from '@/features/vora-hizmetler/constants';
import { useServiceRequests } from '@/features/vora-hizmetler/hooks/useServiceRequests';
import type { ServiceCategory } from '@/features/vora-hizmetler/types';
import { radius, spacing } from '@/constants/theme';
import { getAndroidFlatListPerfProps } from '@/lib/device/androidPerfProfile';

type JobListingsPanelProps = {
  regionId: string | null;
  providerId?: string | null;
};

export function JobListingsPanel({ regionId, providerId }: JobListingsPanelProps) {
  const [selectedProfession, setSelectedProfession] = useState<ServiceProfessionOption | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [professionSheetOpen, setProfessionSheetOpen] = useState(false);

  const { listings, loading } = useServiceRequests({
    regionId,
    category: selectedCategory ?? undefined,
  });

  const filteredListings = useMemo(() => {
    if (!selectedProfession) return listings;
    return listings.filter((item) => item.category === selectedProfession.category);
  }, [listings, selectedProfession]);

  const handleProfessionSelect = useCallback((option: ServiceProfessionOption) => {
    setSelectedProfession((prev) => {
      const next = prev?.id === option.id ? null : option;
      setSelectedCategory(next ? option.category : null);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedProfession(null);
    setSelectedCategory(null);
  }, []);

  const listPerf = getAndroidFlatListPerfProps();

  return (
    <>
      <View style={styles.filterRow}>
        <HizmetProfessionPickerTrigger
          label={selectedProfession?.label ?? 'Meslek filtrele'}
          hint={selectedProfession ? serviceCategoryLabel(selectedProfession.category) : 'Tüm ilanlar'}
          active={!!selectedProfession}
          onPress={() => setProfessionSheetOpen(true)}
        />
        {selectedProfession || selectedCategory ? (
          <Pressable
            onPress={clearSelection}
            style={[styles.filterChip, { backgroundColor: `${VORA_HIZMETLER_ACCENT}14`, borderColor: VORA_HIZMETLER_ACCENT }]}
          >
            <Ionicons name="close" size={14} color={VORA_HIZMETLER_ACCENT} />
            <Text variant="caption" style={{ color: VORA_HIZMETLER_ACCENT, fontWeight: '700' }}>
              Temizle
            </Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator color={VORA_HIZMETLER_ACCENT} style={styles.loader} />
      ) : (
        <FlatList
          data={filteredListings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ServiceRequestCard listing={item} showOfferButton={!!providerId} providerId={providerId} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="briefcase-outline" size={36} color={`${VORA_HIZMETLER_ACCENT}55`} />
              <Text variant="label" style={styles.emptyTitle}>
                Açık ilan yok
              </Text>
              <Text secondary variant="body" style={styles.emptyText}>
                {selectedCategory
                  ? 'Bu meslekte şu an açık ilan bulunmuyor.'
                  : 'Bölgenizde açık iş ilanı yok. İlanlarım sekmesinden ilan verebilirsiniz.'}
              </Text>
            </View>
          }
          scrollEnabled={false}
          {...listPerf}
        />
      )}

      <HizmetProfessionSheet
        visible={professionSheetOpen}
        onClose={() => setProfessionSheetOpen(false)}
        title="Meslek Filtresi"
        subtitle="Hangi iş ilanlarını görmek istersiniz?"
        selectedProfessionId={selectedProfession?.id ?? null}
        onSelect={handleProfessionSelect}
      />
    </>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
