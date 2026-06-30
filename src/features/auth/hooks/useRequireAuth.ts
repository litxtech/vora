import { useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useGuestMode } from '@/features/auth/hooks/useGuestMode';
import { useOptionalGuestProfileGate } from '@/features/auth/providers/GuestProfileGateProvider';
import { useAuth } from '@/providers/AuthProvider';

export function useRequireAuth() {
  const { user } = useAuth();
  const { canInteract, isGuest, guestProfileComplete } = useGuestMode();
  const guestProfileGate = useOptionalGuestProfileGate();

  const requireAuth = useCallback(
    async (actionLabel = 'Bu işlem'): Promise<boolean> => {
      if (!user) {
        Alert.alert(
          'Giriş Gerekli',
          `${actionLabel} için hesap oluşturmanız veya giriş yapmanız gerekiyor.`,
          [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Giriş Yap', onPress: () => router.push('/(auth)/login') },
            { text: 'Kayıt Ol', onPress: () => router.push('/(auth)/register') },
          ],
        );
        return false;
      }

      if (isGuest && !guestProfileComplete) {
        if (!guestProfileGate) return false;
        return guestProfileGate.requestGuestProfile(actionLabel);
      }

      return true;
    },
    [guestProfileComplete, guestProfileGate, isGuest, user],
  );

  return { requireAuth, canInteract };
}
