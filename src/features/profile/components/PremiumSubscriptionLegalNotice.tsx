import { Platform, StyleSheet, View } from 'react-native';
import { LegalTextLink } from '@/components/legal/LegalTextLink';
import { Text } from '@/components/ui/Text';
import {
  PREMIUM_PLANS,
  premiumPlanLabel,
  type PremiumPlan,
} from '@/features/profile/services/premiumService';
import { spacing } from '@/constants/theme';

type PremiumSubscriptionLegalNoticeProps = {
  selectedPlan: PremiumPlan;
  storeBilling: boolean;
};

function storeBillingNotice(): string {
  if (Platform.OS === 'ios') {
    return 'Satın alma App Store uygulama içi abonelik olarak işlenir. İptal için iPhone Ayarlar → Apple ID → Abonelikler bölümünü kullanın. Ücret Apple hesabınıza yansır.';
  }
  return 'Satın alma Google Play uygulama içi abonelik olarak işlenir. İptal için Play Store → Profil → Ödemeler ve abonelikler → Abonelikler bölümünü kullanın.';
}

export function PremiumSubscriptionLegalNotice({
  selectedPlan,
  storeBilling,
}: PremiumSubscriptionLegalNoticeProps) {
  const plan = PREMIUM_PLANS.find((item) => item.id === selectedPlan) ?? PREMIUM_PLANS[0];
  const billingPeriod = selectedPlan === 'monthly' ? 'aylık' : 'yıllık';

  return (
    <View style={styles.wrap}>
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
        Abonelik koşulları, iptal ve iade süreçlerinin ayrıntıları{' '}
        <LegalTextLink slug="terms" label="Kullanım Şartları (EULA)" inline />
        {' ile '}
        <LegalTextLink slug="privacy" label="Gizlilik Politikası" inline />
        {' '}metinlerinde yer alır.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  paragraph: {
    lineHeight: 20,
  },
});
