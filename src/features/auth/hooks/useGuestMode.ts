import { useAuth } from '@/providers/AuthProvider';

export function useGuestMode() {
  const { isGuest, user } = useAuth();
  return {
    isGuest: isGuest && !user,
    isAuthenticated: !!user,
    canInteract: !!user && !isGuest,
  };
}
