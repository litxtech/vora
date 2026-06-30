import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ScreenBackButton } from '@/components/ui/ScreenBackButton';
import { Text } from '@/components/ui/Text';
import { HizmetLiveLocationPanel } from '@/features/vora-hizmetler/components/HizmetLiveLocationPanel';
import { JobCompletionProofPanel } from '@/features/vora-hizmetler/components/JobCompletionProofPanel';
import { JobTrackingTimeline } from '@/features/vora-hizmetler/components/JobTrackingTimeline';
import { ProviderJobActions } from '@/features/vora-hizmetler/components/ProviderJobActions';
import { ServiceDisputePanel } from '@/features/vora-hizmetler/components/ServiceDisputePanel';
import { HizmetEscrowBanner } from '@/features/vora-hizmetler/components/HizmetEscrowBanner';
import { ServiceOfferCard } from '@/features/vora-hizmetler/components/ServiceOfferCard';
import { ServicePaymentSection } from '@/features/vora-hizmetler/components/ServicePaymentSection';
import {
  HizmetGradientButton,
  HizmetSectionHeader,
  HizmetStatusChip,
} from '@/features/vora-hizmetler/components/HizmetUi';
import {
  formatServicePrice,
  serviceCategoryColor,
  serviceCategoryIcon,
  serviceCategoryLabel,
  serviceUrgencyLabel,
  SERVICE_STATUS_LABELS,
  serviceRequestEditPath,
  VORA_HIZMETLER_ACCENT,
} from '@/features/vora-hizmetler/constants';
import { useMyProviderProfile } from '@/features/vora-hizmetler/hooks/useProviderProfile';
import { useServiceOffers } from '@/features/vora-hizmetler/hooks/useServiceOffers';
import { openServiceChat, resolveServiceChatPartner } from '@/features/vora-hizmetler/services/messaging';
import { rejectServiceOffer } from '@/features/vora-hizmetler/services/offerData';
import {
  completeServiceJob,
  fetchRequestPayments,
  startHizmetStripeCheckout,
  type ServicePaymentSummary,
} from '@/features/vora-hizmetler/services/paymentData';
import { acceptServiceOffer, cancelServiceRequest, fetchServiceRequestById } from '@/features/vora-hizmetler/services/requestData';
import type { ServiceRequestListing } from '@/features/vora-hizmetler/types';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { VORA_HIZMETLER_FEATURE } from '@/features/vora-hizmetler/featureFlags';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

export function ServiceRequestDetailScreen() {
  const { id, pay, checkout } = useLocalSearchParams<{ id: string; pay?: string; checkout?: string }>();
  const { user } = useAuth();
  const { provider: myProvider } = useMyProviderProfile(user?.id ?? null);
  const { colors } = useTheme();
  const showDetailEdit = useFeatureVisible(VORA_HIZMETLER_FEATURE.detailEdit);
  const showDetailCancel = useFeatureVisible(VORA_HIZMETLER_FEATURE.detailCancel);
  const showDetailChat = useFeatureVisible(VORA_HIZMETLER_FEATURE.detailChat);
  const showDetailPay = useFeatureVisible(VORA_HIZMETLER_FEATURE.detailPay);
  const showDetailComplete = useFeatureVisible(VORA_HIZMETLER_FEATURE.detailComplete);
  const showDetailReview = useFeatureVisible(VORA_HIZMETLER_FEATURE.detailReview);
  const showDetailCompareOffers = useFeatureVisible(VORA_HIZMETLER_FEATURE.detailCompareOffers);
  const showDetailSubmitOffer = useFeatureVisible(VORA_HIZMETLER_FEATURE.detailSubmitOffer);
  const showDetailAcceptOffer = useFeatureVisible(VORA_HIZMETLER_FEATURE.detailAcceptOffer);
  const showDetailRejectOffer = useFeatureVisible(VORA_HIZMETLER_FEATURE.detailRejectOffer);
  const showDetailDispute = useFeatureVisible(VORA_HIZMETLER_FEATURE.detailDispute);
  const showDetailCompletionProof = useFeatureVisible(VORA_HIZMETLER_FEATURE.detailCompletionProof);
  const showDetailLiveLocation = useFeatureVisible(VORA_HIZMETLER_FEATURE.detailLiveLocation);
  const [listing, setListing] = useState<ServiceRequestListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [hasPayment, setHasPayment] = useState(false);
  const [payment, setPayment] = useState<ServicePaymentSummary | null>(null);

  const { offers, loading: offersLoading, reloadOffers } = useServiceOffers(id ?? null);

  const loadPayments = useCallback(async () => {
    if (!id) return;
    const result = await fetchRequestPayments(id);
    const active = result.payments[0] ?? null;
    setPayment(active);
    setHasPayment(
      result.payments.some((p) => p.status === 'authorized' || p.status === 'completed'),
    );
  }, [id]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const result = await fetchServiceRequestById(id);
    setListing(result.listing);
    setLoading(false);
    await loadPayments();
  }, [id, loadPayments]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (checkout !== 'success' || loading) return;
    void load().then(() => {
      Alert.alert(
        'Ödeme alındı',
        'Vora güvencesindesiniz. Paranız işiniz teslim edilene kadar platformda güvende kalacak.',
        [{ text: 'Tamam' }],
      );
    });
  }, [checkout, loading, load]);

  const runStripePayment = async (offerId: string) => {
    if (!id) return;
    setPayLoading(true);
    const result = await startHizmetStripeCheckout(id, offerId);
    setPayLoading(false);
    if (result.error) {
      Alert.alert('Ödeme', result.error);
      return;
    }
    await load();
    reloadOffers();
  };

  const handleAcceptOffer = async (offerId: string, providerId: string) => {
    if (!id || !user?.id) return;
    Alert.alert(
      'Teklifi kabul et ve öde',
      'Teklif kabul edilir edilmez güvenli ödeme yapmanız gerekir (Yerel Pazar ile aynı altyapı).',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kabul Et',
          onPress: async () => {
            const result = await acceptServiceOffer(id, offerId, providerId);
            if (result.error) {
              Alert.alert('Hata', result.error);
              return;
            }
            await load();
            reloadOffers();
            await runStripePayment(offerId);
          },
        },
      ],
    );
  };

  const handleRejectOffer = (offerId: string, providerName: string | null) => {
    Alert.alert(
      'Teklifi reddet',
      `${providerName ?? 'Usta'} teklifini reddediyorsunuz. Usta yeni teklif gönderebilir.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: async () => {
            const result = await rejectServiceOffer(offerId);
            if (result.error) Alert.alert('Hata', result.error);
            else reloadOffers();
          },
        },
      ],
    );
  };

  const handleOpenChat = async () => {
    if (!id || !user?.id) return;
    setChatLoading(true);
    const partner = await resolveServiceChatPartner(id, user.id);
    setChatLoading(false);
    if (!partner.partnerUserId) {
      Alert.alert('Mesajlaşma', partner.error ?? 'Sohbet partneri bulunamadı.');
      return;
    }
    const result = await openServiceChat(partner.partnerUserId, {
      requestId: id,
      requesterId: partner.requesterId,
      providerUserId: partner.providerUserId,
    });
    if (result.error) Alert.alert('Hata', result.error);
  };

  const handleCompleteJob = () => {
    if (!id) return;
    Alert.alert(
      'İş bitti',
      'İşten memnun musunuz? Onayladığınızda usta hesabına 7 gün içinde ödeme yatırılır. Paranız Vora güvencesinde kalır.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'İş Bitti',
          onPress: async () => {
            setCompleteLoading(true);
            const result = await completeServiceJob(id);
            setCompleteLoading(false);
            if (result.error) {
              Alert.alert('Hata', result.error);
              return;
            }
            await load();
            reloadOffers();
            Alert.alert(
              'Teşekkürler',
              'Vora güvencesindesiniz. Ödemeniz güvende; usta hesabına 7 gün içinde aktarılacak.',
            );
          },
        },
      ],
    );
  };

  const handleStripePay = async () => {
    if (!id || !user?.id || !listing || user.id !== listing.requesterId) return;
    const acceptedOffer = offers.find((o) => o.status === 'accepted');
    if (!acceptedOffer) {
      Alert.alert('Ödeme', 'Kabul edilmiş teklif bulunamadı.');
      return;
    }
    await runStripePayment(acceptedOffer.id);
  };

  const handleCancelListing = () => {
    if (!id || !user?.id || !listing) return;
    Alert.alert(
      'İlanı kaldır',
      'Bu ilanı kaldırırsanız ustalar teklif veremez. Devam edilsin mi?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            setCancelLoading(true);
            const result = await cancelServiceRequest(id, user.id);
            setCancelLoading(false);
            if (result.error) {
              Alert.alert('Hata', result.error);
              return;
            }
            Alert.alert('İlan kaldırıldı', 'Talebiniz yayından çıkarıldı.', [
              { text: 'Tamam', onPress: () => router.back() },
            ]);
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <GradientBackground>
        <ActivityIndicator color={VORA_HIZMETLER_ACCENT} style={styles.loader} />
      </GradientBackground>
    );
  }

  if (!listing) {
    return (
      <GradientBackground>
        <ScreenBackButton />
        <Text variant="body" style={styles.loader}>
          Talep bulunamadı.
        </Text>
      </GradientBackground>
    );
  }

  const isOwner = user?.id === listing.requesterId;
  const canManageListing = isOwner && listing.status === 'pending_offers' && (showDetailEdit || showDetailCancel);
  const canAcceptOffers = isOwner && listing.status === 'pending_offers';
  const hasActiveJob = !['pending_offers', 'cancelled'].includes(listing.status);
  const canChat = hasActiveJob && showDetailChat;
  const needsPayment = isOwner && listing.status === 'offer_accepted' && !hasPayment;
  const showPaySection = isOwner && showDetailPay && (needsPayment || hasPayment);
  const highlightPay = pay === '1' || needsPayment;
  const acceptedOffer = offers.find((o) => o.status === 'accepted');
  const payAmountLabel = acceptedOffer ? formatServicePrice(acceptedOffer.price) : undefined;
  const canReview = isOwner && listing.status === 'completed' && showDetailReview;
  const canCompleteJob =
    showDetailComplete &&
    isOwner &&
    hasPayment &&
    !payment?.job_completed_at &&
    ['en_route', 'in_progress'].includes(listing.status);
  const escrowVariant =
    payment?.payout_completed_at
      ? 'paid_out'
      : payment?.job_completed_at
        ? 'completed'
        : hasPayment
          ? 'active'
          : null;
  const isAssignedProvider =
    !!myProvider?.id &&
    !!acceptedOffer &&
    acceptedOffer.providerId === myProvider.id &&
    acceptedOffer.status === 'accepted';
  const canSubmitCompletionProof =
    showDetailCompletionProof &&
    isAssignedProvider &&
    !!user?.id &&
    !listing.completionProof.submittedAt &&
    ['en_route', 'in_progress'].includes(listing.status);
  const showCompletionProof =
    showDetailCompletionProof &&
    listing.completionProof.submittedAt &&
    (isOwner || isAssignedProvider);
  const showLiveLocationShare =
    showDetailLiveLocation &&
    isAssignedProvider && ['en_route', 'in_progress'].includes(listing.status) && hasPayment;
  const showLiveLocationTrack =
    showDetailLiveLocation &&
    isOwner && ['en_route', 'in_progress'].includes(listing.status) && hasPayment;
  const canOpenDispute =
    showDetailDispute &&
    isOwner &&
    hasPayment &&
    !payment?.dispute_opened_at &&
    !payment?.job_completed_at &&
    ['en_route', 'in_progress', 'completed'].includes(listing.status);
  const showEscrowBanner = escrowVariant && (isOwner || isAssignedProvider);
  const categoryColor = serviceCategoryColor(listing.category);

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <ScreenBackButton />

        {highlightPay && needsPayment ? (
          <GlassCard style={[styles.payBanner, { borderColor: `${VORA_HIZMETLER_ACCENT}40` }]}>
            <Ionicons name="wallet-outline" size={22} color={VORA_HIZMETLER_ACCENT} />
            <View style={styles.payBannerText}>
              <Text variant="label">Ödeme bekleniyor</Text>
              <Text secondary variant="caption">
                Teklif kabul edildi — ödemeyi tamamlayın. Paranız iş teslim edilene kadar Vora güvencesinde kalır.
              </Text>
            </View>
          </GlassCard>
        ) : null}

        {showEscrowBanner ? (
          <HizmetEscrowBanner
            variant={escrowVariant}
            audience={isOwner ? 'customer' : 'provider'}
            payoutDueAt={payment?.payout_due_at}
            providerName={acceptedOffer?.providerName}
          />
        ) : null}

        <GlassCard style={styles.heroCard} padded={false}>
          <View style={[styles.heroStripe, { backgroundColor: categoryColor }]} />
          <View style={styles.heroInner}>
            <View style={styles.heroTop}>
              <View style={[styles.categoryPill, { backgroundColor: `${categoryColor}18`, borderColor: `${categoryColor}35` }]}>
                <Ionicons
                  name={serviceCategoryIcon(listing.category) as keyof typeof Ionicons.glyphMap}
                  size={12}
                  color={categoryColor}
                />
                <Text variant="caption" style={{ color: categoryColor, fontWeight: '700' }}>
                  {serviceCategoryLabel(listing.category)}
                </Text>
              </View>
              <HizmetStatusChip
                label={SERVICE_STATUS_LABELS[listing.status]}
                tone={listing.status === 'cancelled' ? 'danger' : listing.status === 'completed' || listing.status === 'rated' ? 'success' : 'accent'}
              />
            </View>

            <Text variant="h2" style={styles.title}>
              {listing.title}
            </Text>
            <Text secondary variant="body" style={styles.desc}>
              {listing.description}
            </Text>

            <View style={[styles.metaBar, { backgroundColor: `${colors.textSecondary}08`, borderColor: colors.border }]}>
              <MetaItem icon="time-outline" label={serviceUrgencyLabel(listing.urgency)} />
              {listing.city ? <MetaItem icon="location-outline" label={listing.city} /> : null}
              <MetaItem icon="document-text-outline" label={`${listing.offerCount} teklif`} accent />
            </View>
          </View>
        </GlassCard>

        {canManageListing ? (
          <View style={styles.ownerActions}>
            {showDetailEdit ? (
            <Button
              title="İlanı Düzenle"
              variant="secondary"
              onPress={() => router.push(serviceRequestEditPath(listing.id) as never)}
              style={styles.ownerActionBtn}
            />
            ) : null}
            {showDetailCancel ? (
            <Button
              title="İlanı Kaldır"
              variant="outline"
              onPress={handleCancelListing}
              loading={cancelLoading}
              style={styles.ownerActionBtn}
            />
            ) : null}
          </View>
        ) : null}

        {listing.status !== 'pending_offers' ? (
          <GlassCard style={styles.card}>
            <HizmetSectionHeader title="İş Takibi" subtitle="Anlaşmadan tamamlanmaya" icon="git-network-outline" />
            <JobTrackingTimeline currentStatus={listing.status} />
          </GlassCard>
        ) : null}

        {canChat ? (
          <Button title="Mesajlaş" variant="secondary" onPress={handleOpenChat} loading={chatLoading} style={styles.actionBtn} />
        ) : null}

        {isAssignedProvider && hasActiveJob ? (
          <ProviderJobActions
            requestId={id!}
            listing={listing}
            hasPayment={hasPayment}
            onUpdated={load}
          />
        ) : null}

        {showLiveLocationShare && id ? (
          <HizmetLiveLocationPanel requestId={id} mode="share" />
        ) : null}

        {showLiveLocationTrack && id ? (
          <HizmetLiveLocationPanel
            requestId={id}
            mode="track"
            jobLatitude={listing.latitude}
            jobLongitude={listing.longitude}
            regionId={listing.regionId}
          />
        ) : null}

        {canOpenDispute && id ? (
          <ServiceDisputePanel requestId={id} canOpenDispute onOpened={load} />
        ) : null}

        {canSubmitCompletionProof && id && user?.id ? (
          <JobCompletionProofPanel
            requestId={id}
            userId={user.id}
            proof={listing.completionProof}
            mode="submit"
            onSubmitted={load}
          />
        ) : null}

        {showCompletionProof && id && user?.id ? (
          <JobCompletionProofPanel
            requestId={id}
            userId={user.id}
            proof={listing.completionProof}
            mode="view"
          />
        ) : null}

        {showPaySection ? (
          <>
            <ServicePaymentSection amountLabel={payAmountLabel} />
            {needsPayment ? (
              <HizmetGradientButton
                label={payAmountLabel ? `Ödeme Yap · ${payAmountLabel}` : 'Ödeme Yap'}
                icon="card-outline"
                onPress={handleStripePay}
                loading={payLoading}
              />
            ) : hasPayment ? (
              <GlassCard style={styles.paidCard}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text variant="label" style={{ color: '#10B981' }}>
                  Ödeme Vora güvencesinde
                </Text>
              </GlassCard>
            ) : null}
          </>
        ) : null}

        {canCompleteJob ? (
          <HizmetGradientButton
            label="İş Bitti"
            icon="checkmark-done-outline"
            onPress={handleCompleteJob}
            loading={completeLoading}
          />
        ) : null}

        {canReview ? (
          <Button
            title="Değerlendir"
            onPress={() => router.push(`/vora-hizmetler/review/${id}` as never)}
            style={styles.actionBtn}
          />
        ) : null}

        <HizmetSectionHeader
          title={`Teklifler${offers.length ? ` (${offers.length})` : ''}`}
          subtitle="Push ile bildirim gider · beğenmezseniz reddedin"
          icon="pricetags-outline"
        />

        {offersLoading ? (
          <ActivityIndicator color={VORA_HIZMETLER_ACCENT} />
        ) : offers.length ? (
          offers.map((offer) => (
            <ServiceOfferCard
              key={offer.id}
              offer={offer}
              showAccept={canAcceptOffers && showDetailAcceptOffer && offer.status === 'pending'}
              showReject={canAcceptOffers && showDetailRejectOffer && offer.status === 'pending'}
              onAccept={() => handleAcceptOffer(offer.id, offer.providerId)}
              onReject={() => handleRejectOffer(offer.id, offer.providerName)}
            />
          ))
        ) : (
          <GlassCard>
            <Text secondary variant="body" style={styles.empty}>
              Henüz teklif gelmedi. Ustalar push bildirimi alır.
            </Text>
          </GlassCard>
        )}

        {canAcceptOffers && showDetailCompareOffers && offers.length > 1 ? (
          <Button
            title="Teklifleri Karşılaştır"
            variant="outline"
            onPress={() => router.push(`/vora-hizmetler/offers/${id}` as never)}
            style={styles.actionBtn}
          />
        ) : null}

        {!isOwner && showDetailSubmitOffer && listing.status === 'pending_offers' ? (
          <Button
            title="Teklif Ver"
            onPress={() => router.push(`/vora-hizmetler/submit-offer/${id}` as never)}
            style={styles.actionBtn}
          />
        ) : null}
      </ScrollView>
    </GradientBackground>
  );
}

function MetaItem({
  icon,
  label,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accent?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={14} color={accent ? VORA_HIZMETLER_ACCENT : colors.textMuted} />
      <Text variant="caption" style={{ color: accent ? VORA_HIZMETLER_ACCENT : colors.textSecondary, fontWeight: accent ? '700' : '500' }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.lg,
    paddingBottom: 80,
  },
  loader: {
    marginTop: 100,
    alignSelf: 'center',
  },
  payBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  payBannerText: {
    flex: 1,
    gap: 2,
  },
  heroCard: {
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  heroStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  heroInner: {
    padding: spacing.lg,
    paddingLeft: spacing.lg + 6,
    gap: spacing.sm,
  },
  ownerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  ownerActionBtn: {
    flex: 1,
    marginBottom: 0,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  title: {
    marginTop: spacing.xs,
  },
  desc: {
    lineHeight: 22,
  },
  metaBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  card: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  actionBtn: {
    marginBottom: spacing.md,
  },
  paidCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  empty: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
