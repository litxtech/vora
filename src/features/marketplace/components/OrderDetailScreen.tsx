import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { MarketplaceTimeline } from '@/features/marketplace/components/MarketplaceTimeline';
import { PayoutCountdownBar } from '@/features/marketplace/components/PayoutCountdownBar';
import { formatCents, ORDER_STATUS_LABELS } from '@/features/marketplace/constants';
import {
  buyerConfirmReceipt,
  buyerOpenDispute,
  fetchMarketplaceOrder,
  fetchOrderEvents,
  sellerMarkShipped,
} from '@/features/marketplace/services/orderData';
import { exportMarketplaceOrderPdf } from '@/features/marketplace/services/orderPdfExport';
import type { MarketplaceOrder, MarketplaceOrderEvent } from '@/features/marketplace/types';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [order, setOrder] = useState<MarketplaceOrder | null>(null);
  const [events, setEvents] = useState<MarketplaceOrderEvent[]>([]);
  const [tracking, setTracking] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const o = await fetchMarketplaceOrder(id);
    setOrder(o);
    if (o) setEvents(await fetchOrderEvents(id));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!order) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <Text secondary>Yükleniyor...</Text>
        </View>
      </GradientBackground>
    );
  }

  const isBuyer = user?.id === order.buyerId;
  const isSeller = user?.id === order.sellerId;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, gap: spacing.md }}>
        <AuthHeader title={order.orderNumber} subtitle={ORDER_STATUS_LABELS[order.status]} />

        <GlassCard style={styles.block}>
          <Text variant="label">{order.listingTitle}</Text>
          <Text secondary variant="caption">Brüt: {formatCents(order.grossAmountCents)}</Text>
          <Text secondary variant="caption">Komisyon: -{formatCents(order.commissionCents)}</Text>
          <Text variant="label" style={{ color: colors.success }}>Net: {formatCents(order.sellerNetCents)}</Text>
          <Text secondary variant="caption">Alıcı: {order.buyerName}</Text>
          <Text secondary variant="caption">Satıcı: {order.sellerName}</Text>
        </GlassCard>

        <PayoutCountdownBar payoutDueAt={order.payoutDueAt} payoutCompletedAt={order.payoutCompletedAt} />

        <Text variant="label">Süreç</Text>
        <MarketplaceTimeline
          currentStatus={order.status}
          events={events}
          paidAt={order.paidAt}
          sellerShippedAt={order.sellerShippedAt}
          buyerConfirmedAt={order.buyerConfirmedAt}
          platformApprovedAt={order.platformApprovedAt}
          payoutCompletedAt={order.payoutCompletedAt}
        />

        {isSeller && order.status === 'paid_escrow' ? (
          <>
            <Input label="Kargo takip no (opsiyonel)" value={tracking} onChangeText={setTracking} />
            <Button
              title="Teslim ettim / Kargoya verdim"
              onPress={async () => {
                const r = await sellerMarkShipped(order.id, tracking);
                if (r.error) Alert.alert('Hata', r.error);
                else load();
              }}
            />
          </>
        ) : null}

        {isBuyer && order.status === 'seller_shipped' ? (
          <Button
            title="Teslim aldım, onaylıyorum"
            onPress={async () => {
              const r = await buyerConfirmReceipt(order.id);
              if (r.error) Alert.alert('Hata', r.error);
              else load();
            }}
          />
        ) : null}

        {isBuyer && (order.status === 'paid_escrow' || order.status === 'seller_shipped') ? (
          <>
            <Input
              label="Uyuşmazlık açıklaması"
              value={disputeReason}
              onChangeText={setDisputeReason}
              placeholder="Sorunu kısaca anlatın"
            />
            <Button
              title="Uyuşmazlık bildir"
              variant="secondary"
              onPress={async () => {
                const r = await buyerOpenDispute(order.id, disputeReason);
                if (r.error) Alert.alert('Hata', r.error);
                else load();
              }}
            />
          </>
        ) : null}

        <Button
          title={exportingPdf ? 'PDF hazırlanıyor…' : 'PDF özeti indir'}
          variant="secondary"
          onPress={async () => {
            setExportingPdf(true);
            const r = await exportMarketplaceOrderPdf(order, events);
            setExportingPdf(false);
            if (r.error) Alert.alert('PDF', r.error);
          }}
        />

        {order.payoutReference ? (
          <Text secondary variant="caption">Banka ref: {order.payoutReference}</Text>
        ) : null}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  block: { gap: spacing.xs },
});
