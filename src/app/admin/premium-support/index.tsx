import { Redirect } from 'expo-router';
import { subscriptionsCommerceEnabled } from '@/features/profile/services/premiumAccess';
import { AdminPremiumSupportScreen } from '@/features/premium-support/components/AdminPremiumSupportScreen';

export default function AdminPremiumSupportIndexRoute() {
  if (!subscriptionsCommerceEnabled()) {
    return <Redirect href="/admin" />;
  }

  return <AdminPremiumSupportScreen />;
}
