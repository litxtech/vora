import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { ServiceRequestCard } from '@/features/vora-hizmetler/components/ServiceRequestCard';
import {
  SERVICE_STATUS_LABELS,
  VORA_HIZMETLER_ACCENT,
} from '@/features/vora-hizmetler/constants';
import { useServiceRequests } from '@/features/vora-hizmetler/hooks/useServiceRequests';
import { useMyProviderProfile } from '@/features/vora-hizmetler/hooks/useProviderProfile';
import { getAndroidFlatListPerfProps } from '@/lib/device/androidPerfProfile';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type MyListingsPanelProps = {
  userId: string | null;
  onCreatePress: () => void;
};

export function MyListingsPanel({ userId, onCreatePress }: MyListingsPanelProps) {
  const { colors } = useTheme();
  const { provider } = useMyProviderProfile(userId);
  const { listings, loading } = useServiceRequests({
    requesterId: userId ?? undefined,
  });

  const openListings = listings.filter((item) => item.status === 'pending_offers');
  const otherListings = listings.filter((item) => item.status !== 'pending_offers');
  const listPerf = getAndroidFlatListPerfProps();

  const openProviderManage = useCallback(() => {
    router.push('/vora-hizmetler/provider-manage' as never);
  }, []);

  if (!userId) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="log-in-outline" size={36} color={`${VORA_HIZMETLER_ACCENT}55`} />
        <Text variant="label">Giriş yapın</Text>
        <Text secondary variant="body" style={styles.emptyText}>
          İlanlarınızı görmek ve yönetmek için oturum açın.
        </Text>
      </View>
    );
  }

  return (
    <>
      <Pressable onPress={onCreatePress} style={[styles.createBtn, { backgroundColor: VORA_HIZMETLER_ACCENT }]}>
        <Ionicons name="add-circle-outline" size={22} color="#fff" />
        <Text variant="label" style={{ color: '#fff' }}>
          Yeni İlan Ver
        </Text>
      </Pressable>

      {provider ? (
        <Pressable
          onPress={openProviderManage}
          style={[styles.providerLink, { borderColor: '#10B98155', backgroundColor: '#10B98110' }]}
        >
          <Ionicons name="construct-outline" size={18} color="#10B981" />
          <View style={styles.providerLinkCopy}>
            <Text variant="label" style={{ color: '#10B981' }}>
              Usta profilim
            </Text>
            <Text secondary variant="caption">
              İş ilanlarına teklif vermek için profilinizi yönetin
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#10B981" />
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.push('/vora-hizmetler/provider-setup' as never)}
          style={[styles.providerLink, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
        >
          <Ionicons name="briefcase-outline" size={18} color={VORA_HIZMETLER_ACCENT} />
          <View style={styles.providerLinkCopy}>
            <Text variant="label">Usta mısınız?</Text>
            <Text secondary variant="caption">
              Profil oluşturun, iş ilanlarına teklif verin
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </Pressable>
      )}

      <Text variant="label" style={styles.sectionTitle}>
        Aktif İlanlarım ({openListings.length})
      </Text>

      {loading ? (
        <ActivityIndicator color={VORA_HIZMETLER_ACCENT} style={styles.loader} />
      ) : openListings.length ? (
        <FlatList
          data={openListings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ServiceRequestCard listing={item} isOwnListing />}
          scrollEnabled={false}
          {...listPerf}
        />
      ) : (
        <View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
          <Text secondary variant="body" style={styles.emptyText}>
            Henüz aktif ilanınız yok. Yeni ilan vererek ustaların teklif göndermesini bekleyin.
          </Text>
        </View>
      )}

      {otherListings.length ? (
        <>
          <Text variant="label" style={styles.sectionTitle}>
            Geçmiş İlanlar
          </Text>
          <FlatList
            data={otherListings.slice(0, 10)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ServiceRequestCard
                listing={item}
                isOwnListing
                statusLabel={SERVICE_STATUS_LABELS[item.status]}
              />
            )}
            scrollEnabled={false}
            {...listPerf}
          />
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 14,
    marginBottom: spacing.md,
  },
  providerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  providerLinkCopy: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    marginBottom: spacing.md,
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
  emptyCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
