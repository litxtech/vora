import { useCallback } from 'react';
import { Redirect, useFocusEffect } from 'expo-router';
import { exitAdminPanel } from '@/features/admin/services/adminNavigation';
import { canModerate } from '@/constants/roles';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Tab href /admin'e gider. Geri kaydırınca bu boş rota görünürse ana sekmelere dön.
 */
export default function AdminTabScreen() {
  const { profile } = useAuth();
  const allowed = Boolean(profile?.role && canModerate(profile.role));

  useFocusEffect(
    useCallback(() => {
      if (allowed) {
        exitAdminPanel();
      }
    }, [allowed]),
  );

  if (!allowed) {
    return <Redirect href="/(tabs)" />;
  }

  return null;
}
