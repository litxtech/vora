import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import { openHizmetlerInAppMap } from '@/features/vora-hizmetler/services/mapNavigation';
import type { ServiceCategory } from '@/features/vora-hizmetler/types';
import type { RegionId } from '@/constants/regions';
import { useAuth } from '@/providers/AuthProvider';

/** Derin link uyumluluğu — anında uygulama içi harita sekmesine yönlendirir. */
export function ServiceMapScreen() {
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ category?: string }>();
  const regionId = (profile?.region_id ?? 'trabzon') as RegionId;

  useEffect(() => {
    openHizmetlerInAppMap({
      category: typeof params.category === 'string' ? (params.category as ServiceCategory) : null,
      regionId,
    });
  }, [params.category, regionId]);

  return (
    <GradientBackground>
      <View style={styles.loader}>
        <ActivityIndicator color={VORA_HIZMETLER_ACCENT} size="large" />
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
