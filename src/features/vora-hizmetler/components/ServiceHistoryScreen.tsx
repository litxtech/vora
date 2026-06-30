import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { ServiceRequestCard } from '@/features/vora-hizmetler/components/ServiceRequestCard';
import { HizmetEmptyState, HizmetHeroBanner, HizmetStatusChip } from '@/features/vora-hizmetler/components/HizmetUi';
import { SERVICE_STATUS_LABELS, VORA_HIZMETLER_ACCENT } from '@/features/vora-hizmetler/constants';
import { fetchServiceHistory } from '@/features/vora-hizmetler/services/requestData';
import type { ServiceRequestListing } from '@/features/vora-hizmetler/types';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

function statusTone(status: ServiceRequestListing['status']) {
  if (status === 'completed' || status === 'rated') return 'success' as const;
  if (status === 'cancelled') return 'danger' as const;
  if (status === 'pending_offers') return 'warning' as const;
  return 'accent' as const;
}

export function ServiceHistoryScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<ServiceRequestListing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const result = await fetchServiceHistory(user.id);
    setItems(result.items);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <GradientBackground>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.page}
        ListHeaderComponent={
          <>
            <ScreenBackButton />
            <HizmetHeroBanner
              title="İş Geçmişim"
              subtitle="Yaptırdığınız işler, ödemeler ve durum takibi"
              icon="time-outline"
              compact
            />
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.itemWrap}>
            <ServiceRequestCard listing={item} />
            <HizmetStatusChip label={SERVICE_STATUS_LABELS[item.status]} tone={statusTone(item.status)} />
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={VORA_HIZMETLER_ACCENT} style={styles.loader} />
          ) : (
            <HizmetEmptyState
              icon="briefcase-outline"
              title="Henüz iş geçmişi yok"
              description="Usta talebi oluşturduğunuzda tamamlanan işleriniz burada listelenir."
            />
          )
        }
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    paddingBottom: 80,
  },
  itemWrap: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  loader: {
    marginTop: spacing.xxl,
  },
});
