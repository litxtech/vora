import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { PurchaseHistoryCard } from '@/features/purchase-history/components/PurchaseHistoryCard';
import { PURCHASE_HISTORY_NOTICE } from '@/features/purchase-history/constants';
import {
  fetchMyPackagePurchases,
  submitPackageDispute,
} from '@/features/purchase-history/services/purchaseHistory';
import type { PackagePurchase } from '@/features/purchase-history/types';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function PurchaseHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [items, setItems] = useState<PackagePurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }
    const result = await fetchMyPackagePurchases();
    setItems(result.items);
    setError(result.error);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onSubmit = useCallback(
    async (item: PackagePurchase, reason: string) => {
      setSubmittingId(item.id);
      setSubmitError(null);
      const result = await submitPackageDispute(item.source, item.sourceId, reason);
      setSubmittingId(null);
      if (result.error) {
        setSubmitError(result.error);
        return;
      }
      setDisputeId(null);
      await load();
    },
    [load],
  );

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
      >
        <AuthHeader
          title="Satın Alma Geçmişi"
          subtitle="Satın aldığınız paketler, kullanım durumu ve itirazlarınız."
        />

        <View style={[styles.notice, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}28` }]}>
          <Ionicons name="time-outline" size={16} color={colors.primary} />
          <Text variant="caption" style={{ flex: 1, color: colors.text }}>
            {PURCHASE_HISTORY_NOTICE}
          </Text>
        </View>

        {!user ? (
          <Text secondary>Satın alma geçmişini görmek için giriş yapın.</Text>
        ) : loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : error ? (
          <Text style={{ color: colors.danger }}>{error}</Text>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={28} color={colors.textMuted} />
            <Text secondary style={styles.emptyText}>
              Henüz satın alınmış bir paket yok.
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <PurchaseHistoryCard
              key={item.id}
              item={item}
              expanded={disputeId === item.id}
              submitting={submittingId === item.id}
              error={disputeId === item.id ? submitError : null}
              onToggleDispute={() => {
                setSubmitError(null);
                setDisputeId((current) => (current === item.id ? null : item.id));
              }}
              onSubmit={(reason) => void onSubmit(item, reason)}
            />
          ))
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  loader: {
    marginTop: spacing.lg,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
  },
});
