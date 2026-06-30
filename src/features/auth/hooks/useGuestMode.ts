import { useMemo } from 'react';
import { isGuestProfileComplete } from '@/features/auth/services/guestProfileCompletion';
import { useAuth } from '@/providers/AuthProvider';

export function useGuestMode() {
  const { user, isGuest, profile } = useAuth();

  const guestProfileComplete = useMemo(
    () => isGuestProfileComplete(profile, isGuest),
    [profile, isGuest],
  );

  return {
    isGuest,
    isAuthenticated: !!user,
    guestProfileComplete,
    canInteract: !!user && (!isGuest || guestProfileComplete),
  };
}
