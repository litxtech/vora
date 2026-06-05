import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useGuestMode } from '@/features/auth/hooks/useGuestMode';

export function useRequireAuth() {
  const { canInteract } = useGuestMode();

  const requireAuth = (actionLabel = 'Bu işlem') => {
    if (canInteract) return true;

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
  };

  return { requireAuth, canInteract };
}
