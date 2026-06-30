import { useEffect } from 'react';
import { router } from 'expo-router';
import { subscriptionsCommerceEnabled } from '@/features/profile/services/premiumAccess';
import { AdminPremiumScreen } from '@/features/admin/components/AdminPremiumScreen';

export default function AdminPremiumRoute() {
  useEffect(() => {
    if (!subscriptionsCommerceEnabled()) {
      router.replace('/admin');
    }
  }, []);

  if (!subscriptionsCommerceEnabled()) return null;

  return <AdminPremiumScreen />;
}
