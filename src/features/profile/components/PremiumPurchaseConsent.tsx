import { Platform } from 'react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { LegalTextLink } from '@/components/legal/LegalTextLink';
import { Checkbox } from '@/components/ui/Checkbox';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import {
  PREMIUM_PLANS,
  premiumPlanLabel,
  type PremiumPlan,
} from '@/features/profile/services/premiumService';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type PremiumPurchaseConsentProps = {
  selectedPlan: PremiumPlan;
  storeBilling: boolean;
  checked: boolean;
  onToggle: () => void;
  saving?: boolean;
  showError?: boolean;
};

function storeBillingNotice(): string {
  if (Platform.OS === 'ios') {
    return 'Satın alma App Store uygulama içi abonelik olarak işlenir. İptal için iPhone Ayarlar → Apple ID → Abonelikler bölümünü kullanın.';
  }
  return 'Satın alma Google Play uygulama içi abonelik olarak işlenir. İptal için Play Store → Profil → Ödemeler ve abonelikler → Abonelikler bölümünü kullanın.';
}

export function PremiumPurchaseConsent({
  selectedPlan,
  storeBilling,
  checked,
  onToggle,
  saving = false,
  showError = false,
}: PremiumPurchaseConsentProps) {
  const { colors, isDark } = useTheme();
  const plan = PREMIUM_PLANS.find((item) => item.id === selectedPlan) ?? PREMIUM_PLANS[0];
  const billingPeriod = selectedPlan === 'monthly' ? 'aylık' : 'yıllık';

  return (
    <GlassCard
      style={[
        styles.card,
        {
          borderColor: showError ? colors.danger : colors.border,
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.72)',
        },
      ]}
    >
      <View style={styles.header}>
        <Text variant="label">Abonelik bilgisi ve onay</Text>
        {saving ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      </View>

      <Text secondary variant="caption" style={styles.paragraph}>
        Seçilen paket: Vora Premium · {premiumPlanLabel(selectedPlan)} — {plan.price}
        {selectedPlan === 'monthly' ? '/ay' : '/yıl'}. Abonelik {billingPeriod} olarak otomatik
        yenilenir; mevcut dönem bitiminden en az 24 saat önce iptal etmediğiniz sürece ücret
        tahsil edilmeye devam eder.
      </Text>

      {storeBilling ? (
        <Text secondary variant="caption" style={styles.paragraph}>
          {storeBillingNotice()}
        </Text>
      ) : (
        <Text secondary variant="caption" style={styles.paragraph}>
          Ödemeler Stripe üzerinden işlenir.
        </Text>
      )}

      <Text secondary variant="caption" style={styles.paragraph}>
        Ayrıntılar{' '}
        <LegalTextLink slug="terms" label="Kullanım Şartları (EULA)" inline />
        {' ile '}
        <LegalTextLink slug="privacy" label="Gizlilik Politikası" inline />
        {' '}metinlerinde yer alır. Bu onay hesabınıza bir kez kaydedilir.
      </Text>

      <Checkbox
        checked={checked}
        onToggle={onToggle}
        error={showError}
        label="Yukarıdaki abonelik koşullarını okudum ve kabul ediyorum."
      />

      {showError ? (
        <Text variant="caption" style={{ color: colors.danger }}>
          Devam etmek için abonelik koşullarını onaylamanız gerekir.
        </Text>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paragraph: {
    lineHeight: 20,
  },
});
