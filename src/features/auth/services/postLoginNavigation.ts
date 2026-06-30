import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolvePostLoginAccess } from '@/features/auth/services/accountAccessReview';
import {
  endAccountAccessPresentation,
  markAccountAccessReviewActive,
  setAccountAccessReview,
  tryBeginAccountAccessPresentation,
} from '@/features/auth/services/accountAccessReviewStore';
import type { PostLoginAccessResult } from '@/features/auth/types/accountAccessReview';

const ROUTING_PROFILE_CACHE_KEY = 'auth:routing_profile_v1';

export async function navigateAfterSuccessfulLogin(userId: string): Promise<void> {
  const access = await resolvePostLoginAccess(userId);

  if (access.action === 'continue') {
    router.replace(access.destination);
    return;
  }

  await presentAccountAccessReview(access);
}

export async function presentAccountAccessReview(
  access: Extract<PostLoginAccessResult, { action: 'review' }>,
): Promise<boolean> {
  if (!tryBeginAccountAccessPresentation()) {
    return false;
  }

  try {
    setAccountAccessReview(access.payload);
    markAccountAccessReviewActive();
    router.replace('/(auth)/account-access');
    return true;
  } finally {
    endAccountAccessPresentation();
  }
}

/** Lobiye dönüşte oturumu kapatırken profil önbelleğini temizler */
export async function clearAuthRoutingCache(): Promise<void> {
  await AsyncStorage.removeItem(ROUTING_PROFILE_CACHE_KEY);
}
