import { useEffect } from 'react';
import { router } from 'expo-router';
import { subscriptionsCommerceEnabled } from '@/features/profile/services/premiumAccess';
import { PremiumSupportScreen } from '@/features/premium-support/components/PremiumSupportScreen';

export default function PremiumSupportRoute() {
  useEffect(() => {
    if (!subscriptionsCommerceEnabled()) {
      router.replace('/settings');
    }
  }, []);

  if (!subscriptionsCommerceEnabled()) return null;

  return <PremiumSupportScreen />;
}
