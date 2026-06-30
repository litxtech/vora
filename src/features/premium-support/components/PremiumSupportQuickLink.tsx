import { router } from 'expo-router';
import { ProfileQuickLink } from '@/features/profile/components/shared/ProfileQuickLink';
import { PREMIUM_GOLD } from '@/features/profile/constants/premiumUi';
import { subscriptionsCommerceEnabled } from '@/features/profile/services/premiumAccess';
import { PREMIUM_SUPPORT_ENTRY_SUBTITLE } from '@/features/premium-support/constants';

export function PremiumSupportQuickLink() {
  if (!subscriptionsCommerceEnabled()) return null;

  return (
    <ProfileQuickLink
      icon="headset"
      title="Premium Abonelik Desteği"
      subtitle={PREMIUM_SUPPORT_ENTRY_SUBTITLE}
      accent={PREMIUM_GOLD}
      onPress={() => router.push('/premium-support' as never)}
    />
  );
}
