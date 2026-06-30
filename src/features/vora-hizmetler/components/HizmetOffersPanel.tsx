import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { HizmetEmptyState } from '@/features/vora-hizmetler/components/HizmetUi';
import { useOfferInbox } from '@/features/vora-hizmetler/hooks/useOfferInbox';
import { withdrawServiceOffer } from '@/features/vora-hizmetler/services/offerData';
import {
  formatServicePrice,
  OFFER_STATUS_LABELS,
  serviceRequestDetailPath,
  VORA_HIZMETLER_ACCENT,
} from '@/features/vora-hizmetler/constants';
import type { ServiceOfferInboxItem } from '@/features/vora-hizmetler/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type HizmetOffersPanelProps = {
  userId: string | null;
  providerId?: string | null;
  /** customer · provider · all (her iki liste) */
  variant?: 'customer' | 'provider' | 'all';
};

export function HizmetOffersPanel({
  userId,
  providerId,
  variant = 'all',
}: HizmetOffersPanelProps) {
  const { colors } = useTheme();
  const { incoming, outgoing, loading, reloadInbox } = useOfferInbox(userId, providerId);

  useFocusEffect(
    useCallback(() => {
      void reloadInbox();
    }, [reloadInbox]),
  );

  if (!userId) {
    return (
      <HizmetEmptyState
        icon="log-in-outline"
        title="Giriş yapın"
        description="Gelen ve gönderdiğiniz teklifleri görmek için oturum açın."
      />
    );
  }

  if (loading && !incoming.length && !outgoing.length) {
    return <ActivityIndicator color={VORA_HIZMETLER_ACCENT} style={styles.loader} />;
  }

  return (
    <View style={styles.wrap}>
      {variant !== 'provider' ? (
        <OfferSection
          title="Gelen Teklifler"
          subtitle="İlanlarınıza gelen usta teklifleri"
          items={incoming}
          emptyText="Henüz gelen teklif yok. İlanlarım sekmesinden ilan verin veya Ustalar sekmesinden davet gönderin."
          colors={colors}
          onRefresh={reloadInbox}
        />
      ) : null}
      {variant !== 'customer' && providerId ? (
        <OfferSection
          title="Verdiğim Teklifler"
          subtitle="İş ilanlarına gönderdiğiniz teklifler"
          items={outgoing}
          emptyText="Henüz teklif göndermediniz. İş İlanları sekmesinden teklif verin."
          colors={colors}
          onRefresh={reloadInbox}
        />
      ) : null}
      {variant === 'all' && !providerId ? (
        <GlassCard style={styles.emptyCard}>
          <Text secondary variant="caption" style={{ textAlign: 'center', lineHeight: 18 }}>
            Usta profiliniz yok. İş ilanlarına teklif vermek için İlanlarım sekmesinden usta profili oluşturun.
          </Text>
        </GlassCard>
      ) : null}
    </View>
  );
}

function OfferSection({
  title,
  subtitle,
  items,
  emptyText,
  colors,
  onRefresh,
}: {
  title: string;
  subtitle: string;
  items: ServiceOfferInboxItem[];
  emptyText: string;
  colors: ReturnType<typeof useTheme>['colors'];
  onRefresh: () => void;
}) {
  return (
    <View style={styles.section}>
      <Text variant="label">{title}</Text>
      <Text secondary variant="caption">
        {subtitle}
      </Text>
      {items.length ? (
        items.map((item) => (
          <OfferInboxCard key={item.id} item={item} colors={colors} onRefresh={onRefresh} />
        ))
      ) : (
        <GlassCard style={styles.emptyCard}>
          <Text secondary variant="caption" style={{ textAlign: 'center', lineHeight: 18 }}>
            {emptyText}
          </Text>
        </GlassCard>
      )}
    </View>
  );
}

function OfferInboxCard({
  item,
  colors,
  onRefresh,
}: {
  item: ServiceOfferInboxItem;
  colors: ReturnType<typeof useTheme>['colors'];
  onRefresh: () => void;
}) {
  const [withdrawing, setWithdrawing] = useState(false);
  const statusColor =
    item.status === 'accepted'
      ? '#10B981'
      : item.status === 'rejected'
        ? colors.textMuted
        : item.status === 'pending'
          ? VORA_HIZMETLER_ACCENT
          : colors.textSecondary;

  const openRequest = () => {
    router.push(serviceRequestDetailPath(item.requestId) as never);
  };

  const openSubmit = () => {
    if (item.status === 'rejected' && item.direction === 'outgoing') {
      router.push(`/vora-hizmetler/submit-offer/${item.requestId}` as never);
      return;
    }
    openRequest();
  };

  const handleWithdraw = () => {
    Alert.alert('Teklifi geri çek', 'Bekleyen teklifiniz iptal edilecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Geri Çek',
        style: 'destructive',
        onPress: async () => {
          setWithdrawing(true);
          const result = await withdrawServiceOffer(item.id);
          setWithdrawing(false);
          if (result.error) Alert.alert('Hata', result.error);
          else onRefresh();
        },
      },
    ]);
  };

  return (
    <Pressable onPress={openSubmit} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
      <GlassCard style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardBody}>
            <Text variant="label" numberOfLines={1}>
              {item.requestTitle}
            </Text>
            <Text secondary variant="caption" numberOfLines={1}>
              {item.direction === 'incoming'
                ? `${item.providerName ?? 'Usta'} · ${formatServicePrice(item.price)}`
                : `${formatServicePrice(item.price)} · ${OFFER_STATUS_LABELS[item.status]}`}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: `${statusColor}16`, borderColor: `${statusColor}35` }]}>
            <Text variant="caption" style={{ color: statusColor, fontWeight: '700', fontSize: 10 }}>
              {OFFER_STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>
        {item.status === 'rejected' && item.direction === 'outgoing' ? (
          <View style={styles.reofferHint}>
            <Ionicons name="refresh-outline" size={14} color={VORA_HIZMETLER_ACCENT} />
            <Text variant="caption" style={{ color: VORA_HIZMETLER_ACCENT, fontWeight: '600' }}>
              Yeni teklif gönder
            </Text>
          </View>
        ) : null}
        {item.status === 'pending' && item.direction === 'outgoing' ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              handleWithdraw();
            }}
            disabled={withdrawing}
            style={styles.withdrawBtn}
          >
            <Ionicons name="close-circle-outline" size={14} color={colors.textMuted} />
            <Text variant="caption" style={{ color: colors.textMuted, fontWeight: '600' }}>
              {withdrawing ? 'Geri çekiliyor…' : 'Teklifi geri çek'}
            </Text>
          </Pressable>
        ) : null}
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  emptyCard: {
    paddingVertical: spacing.lg,
  },
  card: {
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  reofferHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
});
