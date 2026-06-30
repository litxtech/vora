import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { HizmetSectionHeader } from '@/features/vora-hizmetler/components/HizmetUi';
import {
  fetchHizmetLiveLocation,
  subscribeHizmetLiveLocation,
  upsertHizmetLiveLocation,
  type HizmetLiveLocation,
} from '@/features/vora-hizmetler/services/liveLocationData';
import { openHizmetlerJobLocation } from '@/features/vora-hizmetler/services/mapNavigation';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { VORA_HIZMETLER_FEATURE } from '@/features/vora-hizmetler/featureFlags';
import { spacing } from '@/constants/theme';

const SHARE_INTERVAL_MS = 20_000;

type HizmetLiveLocationPanelProps = {
  requestId: string;
  mode: 'share' | 'track';
  jobLatitude?: number | null;
  jobLongitude?: number | null;
  regionId?: string | null;
};

export function HizmetLiveLocationPanel({
  requestId,
  mode,
  jobLatitude,
  jobLongitude,
  regionId,
}: HizmetLiveLocationPanelProps) {
  const visible = useFeatureVisible(VORA_HIZMETLER_FEATURE.detailLiveLocation);
  const [location, setLocation] = useState<HizmetLiveLocation | null>(null);
  const [sharing, setSharing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (mode === 'track') {
      void fetchHizmetLiveLocation(requestId).then(setLocation);
      return subscribeHizmetLiveLocation(requestId, setLocation);
    }
    return undefined;
  }, [mode, requestId]);

  useEffect(() => {
    if (mode !== 'share' || !sharing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return undefined;
    }

    const shareOnce = async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await upsertHizmetLiveLocation(
        requestId,
        pos.coords.latitude,
        pos.coords.longitude,
        pos.coords.heading ?? undefined,
      );
    };

    void shareOnce();
    intervalRef.current = setInterval(() => void shareOnce(), SHARE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [mode, requestId, sharing]);

  const toggleShare = async () => {
    if (sharing) {
      setSharing(false);
      return;
    }
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Konum izni', 'Canlı konum için konum izni gerekli.');
      return;
    }
    setSharing(true);
  };

  if (!visible) return null;

  if (mode === 'share') {
    return (
      <GlassCard style={styles.card}>
        <HizmetSectionHeader
          title="Canlı Konum"
          subtitle={sharing ? 'Konumunuz müşteriyle paylaşılıyor' : 'Yola çıkınca konum paylaşımını açın'}
          icon="navigate-outline"
        />
        <Button
          title={sharing ? 'Konum Paylaşımını Durdur' : 'Canlı Konum Paylaş'}
          variant={sharing ? 'outline' : 'secondary'}
          onPress={toggleShare}
        />
      </GlassCard>
    );
  }

  return (
    <GlassCard style={styles.card}>
      <HizmetSectionHeader
        title="Usta Konumu"
        subtitle={
          location
            ? `Son güncelleme: ${new Date(location.updatedAt).toLocaleTimeString('tr-TR')}`
            : 'Usta henüz konum paylaşmadı'
        }
        icon="location-outline"
      />
      {location ? (
        <View style={styles.trackRow}>
          {location.etaMinutes != null ? (
            <Text variant="caption">Tahmini varış: ~{location.etaMinutes} dk</Text>
          ) : null}
          <Button
            title="Haritada Takip Et"
            variant="secondary"
            onPress={() =>
              openHizmetlerJobLocation(location.latitude, location.longitude, regionId as never)
            }
            style={styles.mapBtn}
          />
        </View>
      ) : jobLatitude != null && jobLongitude != null ? (
        <Button
          title="İş Konumunu Gör"
          variant="outline"
          onPress={() => openHizmetlerJobLocation(jobLatitude, jobLongitude, regionId as never)}
          style={styles.mapBtn}
        />
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  trackRow: {
    gap: spacing.sm,
  },
  mapBtn: {
    marginBottom: 0,
  },
});
