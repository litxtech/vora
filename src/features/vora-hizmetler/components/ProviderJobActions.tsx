import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { HizmetGradientButton, HizmetSectionHeader } from '@/features/vora-hizmetler/components/HizmetUi';
import { advanceProviderJobStatus } from '@/features/vora-hizmetler/services/providerJobData';
import { openHizmetlerJobLocation } from '@/features/vora-hizmetler/services/mapNavigation';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { VORA_HIZMETLER_FEATURE } from '@/features/vora-hizmetler/featureFlags';
import type { ServiceRequestListing } from '@/features/vora-hizmetler/types';
import { spacing } from '@/constants/theme';

type ProviderJobActionsProps = {
  requestId: string;
  listing: ServiceRequestListing;
  hasPayment: boolean;
  onUpdated: () => void;
};

export function ProviderJobActions({
  requestId,
  listing,
  hasPayment,
  onUpdated,
}: ProviderJobActionsProps) {
  const [loading, setLoading] = useState(false);
  const showStartJob = useFeatureVisible(VORA_HIZMETLER_FEATURE.providerStartJob);
  const showOpenMap = useFeatureVisible(VORA_HIZMETLER_FEATURE.providerOpenMap);

  const canStartJob = listing.status === 'en_route' && hasPayment && showStartJob;
  const isActive = ['en_route', 'in_progress'].includes(listing.status);
  const canOpenMap = isActive && listing.latitude != null && listing.longitude != null && showOpenMap;

  const handleStartJob = () => {
    Alert.alert(
      'İşe başla',
      'Müşteriye işe başladığınız bildirilecek.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'İşe Başladım',
          onPress: async () => {
            setLoading(true);
            const result = await advanceProviderJobStatus(requestId, 'in_progress');
            setLoading(false);
            if (result.error) {
              Alert.alert('Hata', result.error);
              return;
            }
            onUpdated();
          },
        },
      ],
    );
  };

  if (!canStartJob && !canOpenMap) return null;

  return (
    <GlassCard style={styles.card}>
      <HizmetSectionHeader
        title="Usta İşlemleri"
        subtitle="Durumu güncelleyin veya konuma gidin"
        icon="construct-outline"
      />
      <View style={styles.actions}>
        {canStartJob ? (
          <HizmetGradientButton
            label="İşe Başladım"
            icon="hammer-outline"
            onPress={handleStartJob}
            loading={loading}
          />
        ) : null}
        {canOpenMap ? (
          <Button
            title="Haritada Aç"
            variant="secondary"
            onPress={() =>
              openHizmetlerJobLocation(listing.latitude!, listing.longitude!, listing.regionId as never)
            }
            style={styles.mapBtn}
          />
        ) : null}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
  mapBtn: {
    marginBottom: 0,
  },
});
