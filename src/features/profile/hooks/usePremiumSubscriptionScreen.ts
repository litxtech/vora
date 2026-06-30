import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  isExpoIapNativeAvailable,
  usesNativeStoreBilling,
} from '@/features/profile/services/premiumIapAvailability';
import {
  alreadyPremiumAlertMessage,
  cancelPremiumSubscription,
  fetchActiveSubscription,
  formatPremiumDate,
  formatPremiumRenewalDate,
  pollForActiveSubscription,
  previewPremiumUpgrade,
  startStripeCheckout,
  syncStripeSubscriptionFromServer,
  upgradePremiumSubscription,
  type PremiumPlan,
  type PremiumSubscription,
  type PremiumUpgradePreview,
} from '@/features/profile/services/premiumService';
import {
  fetchPremiumTermsAccepted,
  hasPremiumTermsAccepted,
  savePremiumTermsAcceptance,
} from '@/features/profile/services/premiumTermsConsent';
import type { StorePurchaseSuccess } from '@/features/profile/hooks/useStorePremiumPurchase';
import { useAuth } from '@/providers/AuthProvider';

export type PurchasePhase = 'idle' | 'redirecting' | 'verifying' | 'processing_store';

export function purchasePhaseMessage(phase: PurchasePhase): string {
  switch (phase) {
    case 'redirecting':
      return 'Stripe ödeme sayfasına yönlendiriliyorsunuz…';
    case 'verifying':
      return 'Ödemeniz doğrulanıyor, Premium aktifleştiriliyor…';
    case 'processing_store':
      return Platform.OS === 'ios'
        ? 'Apple ile satın alma işleniyor, lütfen bekleyin…'
        : 'Google Play satın alması işleniyor, lütfen bekleyin…';
    default:
      return '';
  }
}

export function usePremiumSubscriptionScreen() {
  const { user, profile, refreshProfile, isLoading: authLoading } = useAuth();
  const { checkout } = useLocalSearchParams<{ checkout?: string }>();
  const [subscription, setSubscription] = useState<PremiumSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlan>('monthly');
  const [purchasePhase, setPurchasePhase] = useState<PurchasePhase>('idle');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [upgradePreview, setUpgradePreview] = useState<PremiumUpgradePreview | null>(null);
  const [upgradePreviewLoading, setUpgradePreviewLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [showActivateAfterPayment, setShowActivateAfterPayment] = useState(false);
  const [purchaseConsentChecked, setPurchaseConsentChecked] = useState(false);
  const [purchaseConsentSaving, setPurchaseConsentSaving] = useState(false);
  const [purchaseConsentError, setPurchaseConsentError] = useState(false);
  const [consentPersisted, setConsentPersisted] = useState(false);
  const [consentHydrated, setConsentHydrated] = useState(false);
  const checkoutHandledRef = useRef(false);

  const profileConsentAccepted = hasPremiumTermsAccepted(profile?.policy_consents);
  const premiumTermsAccepted = profileConsentAccepted || consentPersisted;
  const purchaseConsentReady = premiumTermsAccepted || purchaseConsentChecked;

  const storeBilling = usesNativeStoreBilling();
  const storeIapAvailable = isExpoIapNativeAvailable();
  const isPayBusy = purchasePhase !== 'idle' || upgradeLoading;
  const payDisabled =
    isPayBusy || purchaseConsentSaving || !consentHydrated || !purchaseConsentReady;

  const canUpgradeToYearly =
    subscription?.plan === 'monthly' &&
    subscription.paymentProvider === 'stripe' &&
    !subscription.cancelAtPeriodEnd;

  const load = useCallback(async () => {
    if (!user) {
      setPageLoading(false);
      return;
    }
    setPageLoading(true);
    const sub = await fetchActiveSubscription(user.id);
    setSubscription(sub);
    setPageLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (profileConsentAccepted) {
      setConsentPersisted(true);
      setConsentHydrated(true);
    }
  }, [profileConsentAccepted]);

  useEffect(() => {
    if (!user) {
      setConsentPersisted(false);
      setConsentHydrated(true);
      return;
    }

    if (profileConsentAccepted) return;

    let cancelled = false;
    setConsentHydrated(false);

    void fetchPremiumTermsAccepted(user.id).then((accepted) => {
      if (cancelled) return;
      if (accepted) setConsentPersisted(true);
      setConsentHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, [profileConsentAccepted, user?.id]);

  useEffect(() => {
    if (checkout === 'success') {
      setShowActivateAfterPayment(true);
    }
  }, [checkout]);

  useEffect(() => {
    if (!canUpgradeToYearly) {
      setUpgradePreview(null);
      return;
    }
    setUpgradePreviewLoading(true);
    void previewPremiumUpgrade().then(({ data }) => {
      setUpgradePreview(data);
      setUpgradePreviewLoading(false);
    });
  }, [canUpgradeToYearly, subscription?.id]);

  const refreshSubscriptionSilently = useCallback(async () => {
    if (!user) return null;
    const sub = await fetchActiveSubscription(user.id);
    setSubscription(sub);
    return sub;
  }, [user?.id]);

  const finalizeStorePurchase = useCallback(
    async (options?: { storeVerified?: boolean }) => {
      if (!user) return false;

      const [, sub] = await Promise.all([
        refreshProfile(),
        fetchActiveSubscription(user.id),
      ]);
      if (sub) {
        setSubscription(sub);
        return true;
      }

      const pollOptions = options?.storeVerified
        ? { maxAttempts: 4, intervalMs: 400 }
        : { maxAttempts: 8, intervalMs: 1000 };

      const polled = await pollForActiveSubscription(user.id, pollOptions);
      if (polled) setSubscription(polled);
      return Boolean(polled);
    },
    [refreshProfile, user],
  );

  const finalizeStripePurchase = useCallback(async () => {
    if (!user) return false;
    await syncStripeSubscriptionFromServer();
    return finalizeStorePurchase();
  }, [finalizeStorePurchase, user]);

  const isPremium = profile?.is_premium ?? false;
  const showSubscriptionManagement = isPremium || Boolean(subscription);

  useEffect(() => {
    if (isPremium || subscription) {
      setShowActivateAfterPayment(false);
    }
  }, [isPremium, subscription]);

  const showAlreadyPremiumAlert = useCallback(() => {
    const { title, message } = alreadyPremiumAlertMessage(subscription);
    Alert.alert(title, message);
  }, [subscription]);

  const ensurePurchaseConsent = useCallback(async (): Promise<boolean> => {
    if (premiumTermsAccepted) return true;
    if (!purchaseConsentChecked) {
      setPurchaseConsentError(true);
      return false;
    }
    if (!user) return false;

    setPurchaseConsentSaving(true);
    const { error } = await savePremiumTermsAcceptance(user.id, profile?.policy_consents ?? {});
    setPurchaseConsentSaving(false);

    if (error) {
      Alert.alert('Onay Kaydedilemedi', error);
      return false;
    }

    setConsentPersisted(true);
    setPurchaseConsentChecked(true);
    setPurchaseConsentError(false);
    return true;
  }, [
    premiumTermsAccepted,
    profile?.policy_consents,
    purchaseConsentChecked,
    user,
  ]);

  const handlePurchaseConsentToggle = useCallback(async () => {
    if (premiumTermsAccepted || purchaseConsentSaving) return;

    const nextChecked = !purchaseConsentChecked;
    setPurchaseConsentChecked(nextChecked);
    setPurchaseConsentError(false);

    if (!nextChecked || !user) return;

    setPurchaseConsentSaving(true);
    const { error } = await savePremiumTermsAcceptance(user.id, profile?.policy_consents ?? {});
    setPurchaseConsentSaving(false);

    if (error) {
      setPurchaseConsentChecked(false);
      Alert.alert('Onay Kaydedilemedi', error);
      return;
    }

    setConsentPersisted(true);
  }, [
    premiumTermsAccepted,
    profile?.policy_consents,
    purchaseConsentChecked,
    purchaseConsentSaving,
    user,
  ]);

  useEffect(() => {
    if (storeBilling || checkout !== 'success' || checkoutHandledRef.current || !user) return;
    checkoutHandledRef.current = true;

    void (async () => {
      if (isPremium || subscription) {
        router.setParams({ checkout: undefined } as never);
        showAlreadyPremiumAlert();
        return;
      }
      setPurchasePhase('verifying');
      const activated = await finalizeStripePurchase();
      setPurchasePhase('idle');
      router.setParams({ checkout: undefined } as never);

      if (activated) {
        Alert.alert('Premium Aktif', 'Aboneliğiniz başarıyla aktifleştirildi.');
      } else {
        setShowActivateAfterPayment(true);
        Alert.alert(
          'Ödeme Alındı',
          'Ödemeniz kaydedildi. Premium henüz açılmadıysa aşağıdaki "Premium\'u Aktifleştir" butonuna basın.',
        );
      }
    })();
  }, [
    checkout,
    finalizeStripePurchase,
    isPremium,
    showAlreadyPremiumAlert,
    storeBilling,
    subscription,
    user,
  ]);

  useEffect(() => {
    if (checkout === 'cancelled') {
      checkoutHandledRef.current = false;
      setPurchasePhase('idle');
      router.setParams({ checkout: undefined } as never);
    }
  }, [checkout]);

  const handlePurchaseSuccess = useCallback(
    async (_verified?: StorePurchaseSuccess) => {
      try {
        if (isPremium || subscription) {
          showAlreadyPremiumAlert();
          return;
        }
        const consentOk = await ensurePurchaseConsent();
        if (!consentOk) return;

        setPurchasePhase('verifying');
        const activated = await finalizeStorePurchase({ storeVerified: true });
        if (activated) {
          Alert.alert('Premium Aktif', 'Aboneliğiniz başarıyla aktifleştirildi.');
        } else {
          Alert.alert(
            'Doğrulama Bekleniyor',
            'Satın almanız alındı. Premium birkaç dakika içinde aktifleşecek.',
          );
          setShowActivateAfterPayment(true);
        }
      } finally {
        setPurchasePhase('idle');
      }
    },
    [ensurePurchaseConsent, finalizeStorePurchase, isPremium, showAlreadyPremiumAlert, subscription],
  );

  const handlePurchaseError = useCallback((message: string) => {
    setPurchasePhase('idle');
    if (!message) return;
    Alert.alert('Ödeme Hatası', message);
  }, []);

  const handleRestorePressStart = useCallback(() => {
    setPurchasePhase('processing_store');
  }, []);

  const handleNothingToRestore = useCallback(() => {
    setPurchasePhase('idle');
    Alert.alert(
      'Satın Alma Bulunamadı',
      Platform.OS === 'ios'
        ? 'Bu Apple ID ile daha önce satın alınmış bir Premium aboneliği bulunamadı.'
        : 'Bu Google hesabı ile daha önce satın alınmış bir Premium aboneliği bulunamadı.',
    );
  }, []);

  const handleStripeSubscribe = useCallback(async () => {
    if (!user || isPayBusy || storeBilling) return;
    if (isPremium || subscription) {
      showAlreadyPremiumAlert();
      return;
    }
    const consentOk = await ensurePurchaseConsent();
    if (!consentOk) return;
    setPurchasePhase('redirecting');
    const { error, shouldVerify } = await startStripeCheckout(selectedPlan);
    if (error) {
      setPurchasePhase('idle');
      Alert.alert('Ödeme Hatası', error);
      return;
    }
    if (!shouldVerify) {
      setPurchasePhase('idle');
      return;
    }
    setShowActivateAfterPayment(true);
    setPurchasePhase('verifying');
    const activated = await finalizeStripePurchase();
    setPurchasePhase('idle');
    if (activated) {
      Alert.alert('Premium Aktif', 'Aboneliğiniz başarıyla aktifleştirildi.');
    } else {
      Alert.alert(
        'Ödeme Alındı',
        'Ödemeniz kaydedildi. Premium henüz açılmadıysa aşağıdaki "Premium\'u Aktifleştir" butonuna basın.',
      );
    }
  }, [
    ensurePurchaseConsent,
    finalizeStripePurchase,
    isPayBusy,
    isPremium,
    selectedPlan,
    showAlreadyPremiumAlert,
    storeBilling,
    subscription,
    user,
  ]);

  const handleManualVerify = useCallback(async () => {
    if (!user || isPayBusy) return;
    if (isPremium || subscription) {
      showAlreadyPremiumAlert();
      return;
    }
    setPurchasePhase('verifying');
    const sync = await syncStripeSubscriptionFromServer();
    if (!sync.active) {
      setPurchasePhase('idle');
      Alert.alert(
        'Ödeme Bulunamadı',
        sync.error ??
          'Stripe üzerinde ödenmiş bir abonelik kaydı bulunamadı. Ödeme yapmadan Premium aktifleşmez.',
      );
      return;
    }
    await refreshProfile();
    await refreshSubscriptionSilently();
    setPurchasePhase('idle');
    Alert.alert('Premium Aktif', 'Ödenmiş aboneliğiniz doğrulandı ve aktifleştirildi.');
  }, [
    isPayBusy,
    isPremium,
    refreshProfile,
    refreshSubscriptionSilently,
    showAlreadyPremiumAlert,
    subscription,
    user,
  ]);

  const handleCancel = useCallback(async () => {
    if (!user || !subscription || cancelLoading) return;
    Alert.alert(
      'Aboneliği İptal Et',
      'Aboneliğiniz dönem sonunda iptal edilecek. Bu tarihe kadar Premium özellikleriniz devam eder.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Dönem Sonunda İptal Et',
          style: 'destructive',
          onPress: async () => {
            setCancelLoading(true);
            const { error, expiresAt } = await cancelPremiumSubscription(subscription.id, user.id);
            setCancelLoading(false);
            if (error) {
              Alert.alert('Hata', error);
              return;
            }
            await refreshProfile();
            await refreshSubscriptionSilently();
            if (expiresAt) {
              Alert.alert(
                'İptal Planlandı',
                `Premium erişiminiz ${formatPremiumRenewalDate(subscription.startsAt, expiresAt, subscription.plan)} tarihine kadar devam eder.`,
              );
            }
          },
        },
      ],
    );
  }, [cancelLoading, refreshProfile, refreshSubscriptionSilently, subscription, user]);

  const handleUpgradeToYearly = useCallback(() => {
    if (!canUpgradeToYearly || upgradeLoading) return;

    const amountText = upgradePreview?.amountDueFormatted ?? 'hesaplanan tutar';
    const creditText = upgradePreview?.creditFormatted
      ? `Aylık pakette kullanılmayan süre (${upgradePreview.creditFormatted}) düşülecek.`
      : 'Kullanılmayan aylık süreniz düşülerek yalnızca kalan tutar tahsil edilir.';

    Alert.alert(
      'Yıllık Pakete Geç',
      `Yıllık Vora Premium'a geçmek için şimdi ${amountText} tahsil edilecek.\n\n${creditText}`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Yükselt',
          onPress: async () => {
            setUpgradeLoading(true);
            const { error, expiresAt, amountDueFormatted } = await upgradePremiumSubscription();
            setUpgradeLoading(false);
            if (error) {
              Alert.alert('Yükseltme Hatası', error);
              return;
            }
            await refreshProfile();
            await refreshSubscriptionSilently();
            Alert.alert(
              'Paket Yükseltildi',
              `Yıllık Premium aktif.${amountDueFormatted ? ` Tahsil edilen: ${amountDueFormatted}.` : ''}${expiresAt ? ` Yenileme: ${formatPremiumDate(expiresAt)}.` : ''}`,
            );
          },
        },
      ],
    );
  }, [canUpgradeToYearly, refreshProfile, refreshSubscriptionSilently, upgradeLoading, upgradePreview]);

  return {
    user,
    profile,
    authLoading,
    subscription,
    selectedPlan,
    setSelectedPlan,
    purchasePhase,
    setPurchasePhase,
    cancelLoading,
    upgradePreview,
    upgradePreviewLoading,
    upgradeLoading,
    pageLoading,
    showActivateAfterPayment,
    purchaseConsentChecked,
    purchaseConsentSaving,
    purchaseConsentError,
    consentHydrated,
    premiumTermsAccepted,
    storeBilling,
    storeIapAvailable,
    isPayBusy,
    payDisabled,
    canUpgradeToYearly,
    isPremium,
    showSubscriptionManagement,
    handlePurchaseConsentToggle,
    handlePurchaseSuccess,
    handlePurchaseError,
    handleRestorePressStart,
    handleNothingToRestore,
    handleStripeSubscribe,
    handleManualVerify,
    handleCancel,
    handleUpgradeToYearly,
  };
}
