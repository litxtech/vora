import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import {
  SubscriptionFeatureList,
  SubscriptionQuickLinks,
} from '@/features/profile/components/subscription/SubscriptionFeatureList';
import {
  SubscriptionManagePanel,
  SubscriptionUpgradePanel,
} from '@/features/profile/components/subscription/SubscriptionManagePanel';
import {
  SubscriptionMarketingHero,
  SubscriptionPurchasePanel,
} from '@/features/profile/components/subscription/SubscriptionPurchasePanel';
import { SubscriptionStatusHero } from '@/features/profile/components/subscription/SubscriptionStatusHero';
import { PREMIUM_GOLD } from '@/features/profile/constants/premiumUi';
import {
  purchasePhaseMessage,
  usePremiumSubscriptionScreen,
} from '@/features/profile/hooks/usePremiumSubscriptionScreen';
import { spacing } from '@/constants/theme';

export function PremiumSubscriptionScreen() {
  const vm = usePremiumSubscriptionScreen();

  const pageTitle = vm.showSubscriptionManagement ? 'Aboneliğim' : 'Vora Premium';
  const pageSubtitle = vm.showSubscriptionManagement
    ? 'Paketiniz, özellikleriniz ve abonelik ayarları'
    : 'Premium özellikleri keşfedin ve plan seçin';

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AuthHeader title={pageTitle} subtitle={pageSubtitle} showBack />

        {vm.authLoading || vm.pageLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={PREMIUM_GOLD} size="large" />
          </View>
        ) : !vm.user ? (
          <GlassCard style={styles.card}>
            <Text variant="h3">Oturum gerekli</Text>
            <Text secondary>Aboneliğinizi görüntülemek için giriş yapmalısınız.</Text>
            <Button title="Giriş Yap" onPress={() => router.push('/(auth)/login')} />
          </GlassCard>
        ) : (
          <>
            {vm.isPayBusy ? (
              <GlassCard style={styles.progressCard}>
                <ActivityIndicator color={PREMIUM_GOLD} />
                <Text variant="label">{purchasePhaseMessage(vm.purchasePhase)}</Text>
                <Text secondary variant="caption">
                  Bu ekrandan ayrılmayın; işlem tamamlanınca abonelik durumunuz güncellenecek.
                </Text>
              </GlassCard>
            ) : null}

            {vm.showSubscriptionManagement ? (
              <>
                <SubscriptionStatusHero
                  subscription={vm.subscription}
                  isPremium={vm.isPremium}
                />
                <SubscriptionQuickLinks />
                <SubscriptionFeatureList
                  subscribed
                  profileBoostedUntil={vm.profile?.profile_boosted_until}
                />
                {vm.subscription ? (
                  <SubscriptionUpgradePanel
                    subscription={vm.subscription}
                    canUpgradeToYearly={vm.canUpgradeToYearly}
                    upgradePreview={vm.upgradePreview}
                    upgradePreviewLoading={vm.upgradePreviewLoading}
                    upgradeLoading={vm.upgradeLoading}
                    isPayBusy={vm.isPayBusy}
                    onUpgrade={vm.handleUpgradeToYearly}
                  />
                ) : null}
                <SubscriptionManagePanel
                  subscription={vm.subscription}
                  cancelLoading={vm.cancelLoading}
                  isPayBusy={vm.isPayBusy}
                  storeBilling={vm.storeBilling}
                  storeIapAvailable={vm.storeIapAvailable}
                  onCancel={vm.handleCancel}
                  onRestorePressStart={vm.handleRestorePressStart}
                  onRestoreSuccess={vm.handlePurchaseSuccess}
                  onRestoreError={vm.handlePurchaseError}
                  onNothingToRestore={vm.handleNothingToRestore}
                />
              </>
            ) : (
              <>
                <SubscriptionMarketingHero />
                <SubscriptionFeatureList subscribed={false} />
                <SubscriptionPurchasePanel
                  selectedPlan={vm.selectedPlan}
                  onSelectPlan={vm.setSelectedPlan}
                  storeBilling={vm.storeBilling}
                  storeIapAvailable={vm.storeIapAvailable}
                  payDisabled={vm.payDisabled}
                  isPayBusy={vm.isPayBusy}
                  purchasePhase={vm.purchasePhase}
                  consentHydrated={vm.consentHydrated}
                  premiumTermsAccepted={vm.premiumTermsAccepted}
                  purchaseConsentChecked={vm.purchaseConsentChecked}
                  purchaseConsentSaving={vm.purchaseConsentSaving}
                  purchaseConsentError={vm.purchaseConsentError}
                  showActivateAfterPayment={vm.showActivateAfterPayment}
                  onConsentToggle={() => void vm.handlePurchaseConsentToggle()}
                  onPurchaseStart={() => vm.setPurchasePhase('processing_store')}
                  onRestorePressStart={vm.handleRestorePressStart}
                  onPurchaseSuccess={vm.handlePurchaseSuccess}
                  onPurchaseError={vm.handlePurchaseError}
                  onNothingToRestore={vm.handleNothingToRestore}
                  onStripeSubscribe={() => void vm.handleStripeSubscribe()}
                  onManualVerify={() => void vm.handleManualVerify()}
                />
              </>
            )}
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  loadingWrap: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  progressCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  card: { gap: spacing.md },
});
