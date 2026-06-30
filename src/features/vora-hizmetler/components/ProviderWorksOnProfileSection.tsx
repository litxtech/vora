import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { ProviderPortfolioSection } from '@/features/vora-hizmetler/components/ProviderPortfolioSection';
import {
  serviceProviderDetailPath,
  VORA_HIZMETLER_ACCENT,
} from '@/features/vora-hizmetler/constants';
import { fetchProviderByUserId } from '@/features/vora-hizmetler/services/providerData';
import { fetchPublicProviderWorks } from '@/features/vora-hizmetler/services/providerWorkData';
import type { ProviderPublicWork, ServiceProviderProfile } from '@/features/vora-hizmetler/types';
import { spacing } from '@/constants/theme';

type ProviderWorksOnProfileSectionProps = {
  userId: string;
  isOwnProfile?: boolean;
  /** Profil sekmesi odaklandığında iş listesini yenile */
  reloadToken?: number;
};

export function ProviderWorksOnProfileSection({
  userId,
  isOwnProfile = false,
  reloadToken = 0,
}: ProviderWorksOnProfileSectionProps) {
  const [provider, setProvider] = useState<ServiceProviderProfile | null>(null);
  const [works, setWorks] = useState<ProviderPublicWork[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!userId) {
      setProvider(null);
      setWorks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const profileRes = await fetchProviderByUserId(userId);
    const nextProvider = profileRes.provider;
    setProvider(nextProvider);

    if (!nextProvider) {
      setWorks([]);
      setLoading(false);
      return;
    }

    const worksRes = await fetchPublicProviderWorks(nextProvider.id, 12);
    setWorks(worksRes.items);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll, reloadToken]);

  if (isOwnProfile) return null;
  if (loading || !provider) return null;
  if (!provider.showOnProfile) return null;
  if (works.length === 0) return null;

  const openProviderProfile = () => {
    router.push(serviceProviderDetailPath(provider.id) as never);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <Text variant="label">Tamamlanan işler</Text>
          <Text secondary variant="caption">
            {provider.displayName} · Vora Hizmetler
          </Text>
        </View>
        <Pressable onPress={openProviderProfile} hitSlop={8}>
          <Text variant="caption" style={{ color: VORA_HIZMETLER_ACCENT, fontWeight: '700' }}>
            Usta profili
          </Text>
        </Pressable>
      </View>

      <ProviderPortfolioSection items={works} showHeader={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleCopy: {
    flex: 1,
    gap: 2,
  },
});
