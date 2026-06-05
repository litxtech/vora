import { useAuth } from '@/providers/AuthProvider';

type GuardResult =
  | { status: 'loading' }
  | { status: 'redirect'; href: '/(welcome)/lobby' | '/(onboarding)/profile-setup' | '/(tabs)' }
  | { status: 'allowed' };

export function useTabsGuard(): GuardResult {
  const { isLoading, user, isGuest } = useAuth();

  if (isLoading) return { status: 'loading' };
  if (!user && !isGuest) return { status: 'redirect', href: '/(welcome)/lobby' };
  return { status: 'allowed' };
}

export function useOnboardingGuard(): GuardResult {
  const { isLoading, user, profile } = useAuth();

  if (isLoading) return { status: 'loading' };
  if (!user) return { status: 'redirect', href: '/(welcome)/lobby' };
  if (profile?.onboarding_completed) return { status: 'redirect', href: '/(tabs)' };
  return { status: 'allowed' };
}
