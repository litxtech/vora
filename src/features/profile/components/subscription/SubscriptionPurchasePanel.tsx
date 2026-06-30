import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { PremiumSupportQuickLink } from '@/features/premium-support/components/PremiumSupportQuickLink';
import { StorePremiumPurchaseButton } from '@/features/profile/components/StorePremiumPurchaseButton';
import { PremiumPurchaseConsent } from '@/features/profile/components/PremiumPurchaseConsent';
import { PremiumSubscriptionLegalNotice } from '@/features/profile/components/PremiumSubscriptionLegalNotice';
import { PREMIUM_GOLD, PREMIUM_GOLD_DARK } from '@/features/profile/constants/premiumUi';
import { PREMIUM_PLANS, type PremiumPlan } from '@/features/profile/services/premiumService';
import type { PurchasePhase } from '@/features/profile/hooks/usePremiumSubscriptionScreen';
import type { StorePurchaseSuccess } from '@/features/profile/hooks/useStorePremiumPurchase';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type SubscriptionPurchasePanelProps = {
  selectedPlan: PremiumPlan;
  onSelectPlan: (plan: PremiumPlan) => void;
  storeBilling: boolean;
  storeIapAvailable: boolean;
  payDisabled: boolean;
  isPayBusy: boolean;
  purchasePhase: PurchasePhase;
  consentHydrated: boolean;
  premiumTermsAccepted: boolean;
  purchaseConsentChecked: boolean;
  purchaseConsentSaving: boolean;
  purchaseConsentError: boolean;
  showActivateAfterPayment: boolean;
  onConsentToggle: () => void;
  onPurchaseStart: () => void;
  onRestorePressStart: () => void;
  onPurchaseSuccess: (result?: StorePurchaseSuccess) => void | Promise<void>;
  onPurchaseError: (message: string) => void;
  onNothingToRestore: () => void;
  onStripeSubscribe: () => void;
  onManualVerify: () => void;
};

export function SubscriptionMarketingHero() {
  const { isDark } = useTheme();

  return (
    <View style={styles.heroWrap}>
      <LinearGradient
        colors={
          isDark
            ? (['#2A2010', '#1A1508', '#121820'] as const)
            : (['#FFF8E1', '#FFE082', '#FFECB3'] as const)
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroGradient}
      >
        <View style={[styles.heroIconRing, { borderColor: `${PREMIUM_GOLD}66` }]}>
          <Ionicons name="diamond" size={36} color={PREMIUM_GOLD} />
        </View>
        <Text variant="h2" style={[styles.heroTitle, { color: isDark ? '#FFF8E1' : '#5D4037' }]}>
          Vora Premium
        </Text>
        <Text variant="caption" style={[styles.heroDesc, { color: isDark ? '#E0C080' : '#6D4C41' }]}>
          Arama, altın rozet, istatistikler, profil öne çıkarma ve ziyaretçi listesi — tek pakette.
        </Text>
      </LinearGradient>
    </View>
  );
}

export function SubscriptionPurchasePanel({
  selectedPlan,
  onSelectPlan,
  storeBilling,
  storeIapAvailable,
  payDisabled,
  isPayBusy,
  purchasePhase,
  consentHydrated,
  premiumTermsAccepted,
  purchaseConsentChecked,
  purchaseConsentSaving,
  purchaseConsentError,
  showActivateAfterPayment,
  onConsentToggle,
  onPurchaseStart,
  onRestorePressStart,
  onPurchaseSuccess,
  onPurchaseError,
  onNothingToRestore,
  onStripeSubscribe,
  onManualVerify,
}: SubscriptionPurchasePanelProps) {
  const { colors, isDark } = useTheme();

  return (
    <GlassCard style={styles.card}>
      <Text variant="label">Plan seçin</Text>
      <Text secondary variant="caption">
        Aylık veya yıllık — her iki planda da aynı Premium özellikler açılır.
      </Text>

      <View style={styles.plans}>
        {PREMIUM_PLANS.map((plan) => {
          const selected = selectedPlan === plan.id;
          return (
            <Pressable
              key={plan.id}
              onPress={() => onSelectPlan(plan.id)}
              disabled={isPayBusy}
              style={[
                styles.plan,
                {
                  borderColor: selected ? PREMIUM_GOLD : colors.border,
                  backgroundColor: selected
                    ? `${PREMIUM_GOLD}${isDark ? '18' : '22'}`
                    : colors.surfaceElevated,
                  opacity: isPayBusy ? 0.6 : 1,
                },
              ]}
            >
              <View style={styles.planHeader}>
                <Text variant="label">{plan.label}</Text>
                {plan.badge ? (
                  <View style={[styles.planBadge, { backgroundColor: `${PREMIUM_GOLD}33` }]}>
                    <Text variant="caption" style={{ color: PREMIUM_GOLD_DARK, fontSize: 10 }}>
                      {plan.badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text variant="h3" style={{ color: PREMIUM_GOLD_DARK }}>
                {plan.price}
              </Text>
              <Text secondary variant="caption">
                {plan.description}
              </Text>
              {selected ? (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={PREMIUM_GOLD}
                  style={styles.planCheck}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {consentHydrated && !premiumTermsAccepted ? (
        <PremiumPurchaseConsent
          selectedPlan={selectedPlan}
          storeBilling={storeBilling}
          checked={purchaseConsentChecked}
          onToggle={onConsentToggle}
          saving={purchaseConsentSaving}
          showError={purchaseConsentError}
        />
      ) : null}

      <View style={styles.paySection}>
        {storeBilling ? (
          storeIapAvailable ? (
            <StorePremiumPurchaseButton
              selectedPlan={selectedPlan}
              disabled={payDisabled}
              onPressStart={onPurchaseStart}
              onRestorePressStart={onRestorePressStart}
              onSuccess={onPurchaseSuccess}
              onError={onPurchaseError}
              onNothingToRestore={onNothingToRestore}
            />
          ) : (
            <View style={[styles.infoBox, { backgroundColor: `${colors.warning}18` }]}>
              <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
              <Text secondary variant="caption" style={styles.infoText}>
                {Platform.OS === 'ios'
                  ? 'Apple satın alması bu sürümde kullanılamıyor. Lütfen App Store sürümünü yükleyin.'
                  : 'Google Play satın alması bu sürümde kullanılamıyor. Lütfen Play Store sürümünü yükleyin.'}
              </Text>
            </View>
          )
        ) : (
          <Button
            title={
              purchasePhase === 'redirecting' ? "Stripe'a yönlendiriliyor…" : 'Stripe ile Öde'
            }
            onPress={onStripeSubscribe}
            disabled={payDisabled}
            style={{ backgroundColor: PREMIUM_GOLD_DARK, borderColor: PREMIUM_GOLD_DARK }}
          />
        )}

        {premiumTermsAccepted ? (
          <PremiumSubscriptionLegalNotice selectedPlan={selectedPlan} storeBilling={storeBilling} />
        ) : null}

        <PremiumSupportQuickLink />

        {showActivateAfterPayment && !storeBilling ? (
          <View style={styles.postPayment}>
            <Text secondary variant="caption" style={styles.postPaymentNote}>
              Ödemeniz tamamlandıysa ancak Premium henüz açılmadıysa aboneliğinizi doğrulamak için
              aşağıdaki butona basın.
            </Text>
            <Button
              title={purchasePhase === 'verifying' ? 'Doğrulanıyor…' : "Premium'u Aktifleştir"}
              variant="outline"
              onPress={onManualVerify}
              disabled={isPayBusy}
            />
          </View>
        ) : null}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  heroWrap: { borderRadius: radius.xl, overflow: 'hidden' },
  heroGradient: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  heroIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 179, 0, 0.12)',
  },
  heroTitle: { letterSpacing: 0.5, textAlign: 'center' },
  heroDesc: { textAlign: 'center', lineHeight: 18 },
  card: { gap: spacing.md },
  plans: { flexDirection: 'row', gap: spacing.sm },
  plan: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    minHeight: 120,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  planBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  planCheck: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  paySection: { gap: spacing.md, marginTop: spacing.sm },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  infoText: { flex: 1, lineHeight: 18 },
  postPayment: {
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128, 128, 128, 0.25)',
    gap: spacing.sm,
  },
  postPaymentNote: { lineHeight: 18, textAlign: 'center' },
});
