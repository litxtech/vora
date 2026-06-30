import { Redirect } from 'expo-router';
import { subscriptionsCommerceEnabled } from '@/features/profile/services/premiumAccess';
import { AdminPremiumSupportChatScreen } from '@/features/premium-support/components/AdminPremiumSupportChatScreen';

export default function AdminPremiumSupportChatRoute() {
  if (!subscriptionsCommerceEnabled()) {
    return <Redirect href="/admin" />;
  }

  return <AdminPremiumSupportChatScreen />;
}
