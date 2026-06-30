import { useEffect } from 'react';
import { router } from 'expo-router';
import { canAdmin, canModerate } from '@/constants/roles';
import { useAuth } from '@/providers/AuthProvider';

type GuardResult =
  | { status: 'loading' }
  | { status: 'unauthorized' }
  | { status: 'allowed'; isAdmin: boolean };

export function isAdminGuard(guard: GuardResult): guard is { status: 'allowed'; isAdmin: true } {
  return guard.status === 'allowed' && guard.isAdmin;
}

export function useModeratorGuard(): GuardResult {
  const { isLoading, isProfileLoading, user, profile } = useAuth();

  if (isLoading || isProfileLoading) return { status: 'loading' };
  if (!user || !profile?.role || !canModerate(profile.role)) {
    return { status: 'unauthorized' };
  }

  return { status: 'allowed', isAdmin: canAdmin(profile.role) };
}

export function useAdminGuard(): GuardResult {
  const guard = useModeratorGuard();
  if (guard.status !== 'allowed' || !guard.isAdmin) {
    return guard.status === 'allowed' ? { status: 'unauthorized' } : guard;
  }
  return guard;
}

export function useModeratorRedirect() {
  const guard = useModeratorGuard();

  useEffect(() => {
    if (guard.status === 'unauthorized') {
      router.replace('/(tabs)');
    }
  }, [guard.status]);

  return guard;
}
