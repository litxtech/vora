import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import { MarketplaceOrderRow } from '@/features/marketplace/components/MarketplaceOrderRow';
import { formatCents, marketplaceAccountPath } from '@/features/marketplace/constants';
import { fetchBuyerOrders } from '@/features/marketplace/services/orderData';
import { exportMarketplaceStatementPdf } from '@/features/marketplace/services/salesStatementPdfExport';
import type { MarketplaceOrder } from '@/features/marketplace/types';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function BuyerOrdersScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setOrders(await fetchBuyerOrders(user.id));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const totalSpent = useMemo(
    () => orders.reduce((s, o) => s + (o.status !== 'cancelled' && o.status !== 'refunded' ? o.grossAmountCents : 0), 0),
    [orders],
  );

  const exportPdf = async () => {
    if (!orders.length) {
      Alert.alert('PDF', 'Dışa aktarılacak alış kaydı yok.');
      return;
    }
    setExporting(true);
    const result = await exportMarketplaceStatementPdf(orders, 'buyer', profile?.full_name);
    setExporting(false);
    if (result.error) Alert.alert('PDF', result.error);
  };

  return (
    <GradientBackground>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, gap: spacing.sm }}
        ListHeaderComponent={
          <>
            <AuthHeader title="Alışlarım" subtitle="Ne aldınız, ne zaman, kime ödediniz" />
            <GlassCard style={styles.summary}>
              <Text variant="label">{orders.length} sipariş</Text>
              <Text secondary variant="caption">Toplam harcama: {formatCents(totalSpent)}</Text>
            </GlassCard>
            <View style={styles.headerActions}>
              <Button
                title={exporting ? 'PDF hazırlanıyor…' : 'PDF alış özeti'}
                onPress={exportPdf}
                disabled={exporting || !orders.length}
              />
              <Pressable onPress={() => router.push(marketplaceAccountPath() as never)} style={styles.linkRow}>
                <Ionicons name="grid-outline" size={14} color={colors.primary} />
                <Text variant="caption" style={{ color: colors.primary }}>
                  Hesap paneli
                </Text>
              </Pressable>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <MarketplaceOrderRow
            order={item}
            mode="buyer"
            onPress={() => router.push(`/marketplace-center/order/${item.id}` as never)}
          />
        )}
        ListEmptyComponent={!loading ? <Text secondary>Henüz alış yok.</Text> : null}
        refreshing={loading}
        onRefresh={load}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  summary: { gap: spacing.xs, marginBottom: spacing.sm },
  headerActions: { gap: spacing.sm, marginBottom: spacing.md },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
