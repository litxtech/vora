import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { HizmetEmptyState } from '@/features/vora-hizmetler/components/HizmetUi';
import { ServiceRequestCard } from '@/features/vora-hizmetler/components/ServiceRequestCard';
import {
  SERVICE_STATUS_LABELS,
  VORA_HIZMETLER_ACCENT,
} from '@/features/vora-hizmetler/constants';
import {
  fetchProviderActiveJobs,
  fetchProviderJobHistory,
} from '@/features/vora-hizmetler/services/providerJobData';
import type { ServiceRequestListing } from '@/features/vora-hizmetler/types';
import { getAndroidFlatListPerfProps } from '@/lib/device/androidPerfProfile';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ActiveJobsPanelProps = {
  providerId: string | null;
  userId: string | null;
};

export function ActiveJobsPanel({ providerId, userId }: ActiveJobsPanelProps) {
  const { colors } = useTheme();
  const [active, setActive] = useState<ServiceRequestListing[]>([]);
  const [history, setHistory] = useState<ServiceRequestListing[]>([]);
  const [loading, setLoading] = useState(false);
  const listPerf = getAndroidFlatListPerfProps();

  const load = useCallback(async () => {
    if (!providerId) return;
    setLoading(true);
    const [activeResult, historyResult] = await Promise.all([
      fetchProviderActiveJobs(providerId),
      fetchProviderJobHistory(providerId),
    ]);
    setActive(activeResult.listings);
    setHistory(historyResult.listings);
    setLoading(false);
  }, [providerId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!userId) {
    return (
      <HizmetEmptyState
        icon="log-in-outline"
        title="Giriş yapın"
        description="Aktif işlerinizi görmek için oturum açın."
      />
    );
  }

  if (!providerId) {
    return (
      <HizmetEmptyState
        icon="construct-outline"
        title="Usta profili gerekli"
        description="Aktif işlerinizi görmek için usta profili oluşturun."
        actionLabel="Usta Profili Oluştur"
        onAction={() => router.push('/vora-hizmetler/provider-setup' as never)}
      />
    );
  }

  if (loading && !active.length && !history.length) {
    return <ActivityIndicator color={VORA_HIZMETLER_ACCENT} style={styles.loader} />;
  }

  return (
    <View style={styles.wrap}>
      <Text variant="label">Aktif İşler ({active.length})</Text>
      <Text secondary variant="caption" style={styles.subtitle}>
        Kabul edilen ve devam eden işleriniz
      </Text>

      {active.length ? (
        <FlatList
          data={active}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ServiceRequestCard
              listing={item}
              statusLabel={SERVICE_STATUS_LABELS[item.status]}
            />
          )}
          scrollEnabled={false}
          {...listPerf}
        />
      ) : (
        <GlassCard style={[styles.emptyCard, { borderColor: colors.border }]}>
          <Text secondary variant="body" style={styles.emptyText}>
            Şu an aktif işiniz yok. İş İlanları sekmesinden teklif verin.
          </Text>
          <Pressable
            onPress={() => router.push('/vora-hizmetler?tab=jobs' as never)}
            style={[styles.linkBtn, { borderColor: `${VORA_HIZMETLER_ACCENT}40` }]}
          >
            <Ionicons name="briefcase-outline" size={16} color={VORA_HIZMETLER_ACCENT} />
            <Text variant="caption" style={{ color: VORA_HIZMETLER_ACCENT, fontWeight: '700' }}>
              İş ilanlarına git
            </Text>
          </Pressable>
        </GlassCard>
      )}

      {history.length ? (
        <>
          <Text variant="label" style={styles.historyTitle}>
            Tamamlanan İşler
          </Text>
          <FlatList
            data={history.slice(0, 10)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ServiceRequestCard
                listing={item}
                statusLabel={SERVICE_STATUS_LABELS[item.status]}
              />
            )}
            scrollEnabled={false}
            {...listPerf}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.md,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  emptyCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  historyTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
});
