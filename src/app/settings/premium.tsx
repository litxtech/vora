import { useEffect } from 'react';
import { router } from 'expo-router';
import { subscriptionsCommerceEnabled } from '@/features/profile/services/premiumAccess';
import { PremiumSubscriptionScreen } from '@/features/profile/components/PremiumSubscriptionScreen';

export default function PremiumSettingsRoute() {
  useEffect(() => {
    if (!subscriptionsCommerceEnabled()) {
      router.replace('/settings');
    }
  }, []);

  if (!subscriptionsCommerceEnabled()) return null;

  return <PremiumSubscriptionScreen />;
}
