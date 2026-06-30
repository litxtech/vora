import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LegalTextLink } from '@/components/legal/LegalTextLink';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { PremiumSupportQuickLink } from '@/features/premium-support/components/PremiumSupportQuickLink';
import { StorePremiumRestoreButton } from '@/features/profile/components/StorePremiumRestoreButton';
import type { StorePurchaseSuccess } from '@/features/profile/hooks/useStorePremiumPurchase';
import { PREMIUM_GOLD, PREMIUM_GOLD_DARK } from '@/features/profile/constants/premiumUi';
import {
  premiumPlanBillingLabel,
  type PremiumSubscription,
  type PremiumUpgradePreview,
} from '@/features/profile/services/premiumService';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type SubscriptionManagePanelProps = {
  subscription: PremiumSubscription | null;
  cancelLoading: boolean;
  isPayBusy: boolean;
  storeBilling: boolean;
  storeIapAvailable: boolean;
  onCancel: () => void;
  onRestorePressStart: () => void;
  onRestoreSuccess: (result?: StorePurchaseSuccess) => void | Promise<void>;
  onRestoreError: (message: string) => void;
  onNothingToRestore: () => void;
};

export function SubscriptionManagePanel({
  subscription,
  cancelLoading,
  isPayBusy,
  storeBilling,
  storeIapAvailable,
  onCancel,
  onRestorePressStart,
  onRestoreSuccess,
  onRestoreError,
  onNothingToRestore,
}: SubscriptionManagePanelProps) {
  const { colors } = useTheme();

  return (
    <GlassCard style={styles.card}>
      <Text variant="label">Aboneliği yönet</Text>
      <Text secondary variant="caption">
        İptal, geri yükleme ve ödeme ayarları buradan yönetilir.
      </Text>

      {subscription?.paymentProvider === 'apple' ? (
        <InfoRow
          icon="logo-apple"
          text="Aboneliği iptal etmek veya ödeme yöntemini değiştirmek için iPhone Ayarlar → Apple ID → Abonelikler bölümünü açın."
          colors={colors}
        />
      ) : subscription?.paymentProvider === 'google' ? (
        <InfoRow
          icon="logo-google-playstore"
          text="Aboneliği iptal etmek için Play Store → Profil → Ödemeler ve abonelikler → Abonelikler bölümünü kullanın."
          colors={colors}
        />
      ) : subscription?.paymentProvider === 'stripe' && !subscription.cancelAtPeriodEnd ? (
        <Button
          title={cancelLoading ? 'İptal ediliyor…' : 'Aboneliği İptal Et'}
          variant="outline"
          loading={cancelLoading}
          disabled={cancelLoading || isPayBusy}
          onPress={onCancel}
        />
      ) : null}

      {storeBilling && storeIapAvailable ? (
        <StorePremiumRestoreButton
          disabled={isPayBusy}
          onPressStart={onRestorePressStart}
          onSuccess={onRestoreSuccess}
          onError={onRestoreError}
          onNothingToRestore={onNothingToRestore}
        />
      ) : null}

      <PremiumSupportQuickLink />

      {subscription?.cancelAtPeriodEnd ? (
        <View style={[styles.warningBox, { backgroundColor: `${colors.warning}14` }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
          <Text secondary variant="caption" style={styles.infoText}>
            Aboneliğiniz dönem sonunda sona erecek. Bu tarihe kadar tüm Premium özellikleriniz açık
            kalır.
          </Text>
        </View>
      ) : null}

      <Text secondary variant="caption" style={{ lineHeight: 20 }}>
        Abonelik koşulları{' '}
        <LegalTextLink slug="terms" label="Kullanım Şartları (EULA)" inline />
        {' ile '}
        <LegalTextLink slug="privacy" label="Gizlilik Politikası" inline /> metinlerinde yer alır.
      </Text>
    </GlassCard>
  );
}

type SubscriptionUpgradePanelProps = {
  subscription: PremiumSubscription;
  canUpgradeToYearly: boolean;
  upgradePreview: PremiumUpgradePreview | null;
  upgradePreviewLoading: boolean;
  upgradeLoading: boolean;
  isPayBusy: boolean;
  onUpgrade: () => void;
};

export function SubscriptionUpgradePanel({
  subscription,
  canUpgradeToYearly,
  upgradePreview,
  upgradePreviewLoading,
  upgradeLoading,
  isPayBusy,
  onUpgrade,
}: SubscriptionUpgradePanelProps) {
  const { colors } = useTheme();

  if (
    subscription.plan === 'monthly' &&
    (subscription.paymentProvider === 'apple' || subscription.paymentProvider === 'google')
  ) {
    return (
      <GlassCard style={styles.card}>
        <Text variant="label">Yıllık pakete geç</Text>
        <InfoRow
          icon="arrow-up-circle-outline"
          text={
            subscription.paymentProvider === 'apple'
              ? 'Yıllık pakete geçmek için iPhone Ayarlar → Apple ID → Abonelikler bölümünü kullanın. Kullanılmayan aylık süre otomatik düşülür.'
              : 'Yıllık pakete geçmek için Play Store → Profil → Ödemeler ve abonelikler → Abonelikler bölümünü kullanın.'
          }
          colors={colors}
          accent={PREMIUM_GOLD_DARK}
        />
      </GlassCard>
    );
  }

  if (!canUpgradeToYearly) return null;

  return (
    <GlassCard style={[styles.card, styles.upgradeCard]}>
      <View style={styles.rowHeader}>
        <Ionicons name="arrow-up-circle" size={20} color={PREMIUM_GOLD_DARK} />
        <Text variant="label">Yıllık pakete geç</Text>
      </View>
      <Text secondary variant="caption">
        Kullanılmayan aylık süre düşülür; yalnızca kalan tutar tahsil edilir.
      </Text>
      {upgradePreviewLoading ? (
        <ActivityIndicator color={PREMIUM_GOLD} />
      ) : upgradePreview ? (
        <View style={styles.quote}>
          <Text variant="body">
            Tahsil edilecek:{' '}
            <Text style={{ color: PREMIUM_GOLD_DARK, fontWeight: '700' }}>
              {upgradePreview.amountDueFormatted}
            </Text>
          </Text>
          {upgradePreview.creditFormatted ? (
            <Text secondary variant="caption">
              Aylık paketten düşülecek: {upgradePreview.creditFormatted}
            </Text>
          ) : null}
          <Text secondary variant="caption">
            Yıllık paket: {premiumPlanBillingLabel('yearly')}
          </Text>
        </View>
      ) : null}
      <Button
        title={upgradeLoading ? 'Yükseltiliyor…' : 'Yıllık Pakete Geç'}
        onPress={onUpgrade}
        disabled={isPayBusy || upgradePreviewLoading}
        style={{ backgroundColor: PREMIUM_GOLD_DARK, borderColor: PREMIUM_GOLD_DARK }}
      />
    </GlassCard>
  );
}

function InfoRow({
  icon,
  text,
  colors,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  colors: { textSecondary: string };
  accent?: string;
}) {
  return (
    <View style={styles.infoBox}>
      <Ionicons name={icon} size={18} color={accent ?? colors.textSecondary} />
      <Text secondary variant="caption" style={styles.infoText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  upgradeCard: {
    borderWidth: 1,
    borderColor: `${PREMIUM_GOLD}55`,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quote: { gap: spacing.xs },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,128,0.08)',
  },
  infoText: { flex: 1, lineHeight: 18 },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
  },
});
