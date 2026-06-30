import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { AccountAccessReviewScreen } from '@/features/auth/components/AccountAccessReviewScreen';
import { consumeAccountAccessReview } from '@/features/auth/services/accountAccessReviewStore';
import type { AccountAccessReviewPayload } from '@/features/auth/types/accountAccessReview';
import { GradientBackground } from '@/components/ui/GradientBackground';

export default function AccountAccessRoute() {
  const [payload, setPayload] = useState<AccountAccessReviewPayload | null>(null);

  useEffect(() => {
    const review = consumeAccountAccessReview();
    if (!review) {
      router.replace('/(welcome)/lobby');
      return;
    }
    setPayload(review);
  }, []);

  if (!payload) {
    return (
      <GradientBackground>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#E85D5D" />
        </View>
      </GradientBackground>
    );
  }

  return <AccountAccessReviewScreen payload={payload} />;
}
