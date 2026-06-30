import { useEffect, useState } from 'react';
import { shouldSkipOnboardingForGuest } from '@/features/auth/services/guestAccount';
import { isAndroid } from '@/lib/device/androidPerfProfile';
import { useAuth } from '@/providers/AuthProvider';

function resolveProfileGuardTimeoutMs(): number {
  return isAndroid() ? 150 : 400;
}

type GuardResult =
  | { status: 'loading' }
  | {
      status: 'redirect';
      href: '/(welcome)/lobby' | '/(onboarding)/profile-setup' | '/(tabs)';
    }
  | { status: 'allowed' };

export function useTabsGuard(): GuardResult {
  const { isLoading, user, profile } = useAuth();

  if (isLoading) return { status: 'loading' };
  if (!user) {
    return { status: 'redirect', href: '/(welcome)/lobby' };
  }

  if (user && shouldSkipOnboardingForGuest(user, profile)) {
    return { status: 'allowed' };
  }

  if (profile?.onboarding_completed === false) {
    return { status: 'redirect', href: '/(onboarding)/profile-setup' };
  }

  // Profil henüz gelmemiş olsa bile sekmeleri aç — feed arka planda yüklenir.
  return { status: 'allowed' };
}

export function useOnboardingGuard(): GuardResult {
  const { isLoading, isProfileLoading, user, profile } = useAuth();
  const [profileWaitExpired, setProfileWaitExpired] = useState(false);

  useEffect(() => {
    if (!user || !isProfileLoading) {
      setProfileWaitExpired(false);
      return;
    }

    const timer = setTimeout(() => setProfileWaitExpired(true), resolveProfileGuardTimeoutMs());
    return () => clearTimeout(timer);
  }, [user, isProfileLoading]);

  if (isLoading) return { status: 'loading' };
  if (user && isProfileLoading && !profileWaitExpired) return { status: 'loading' };
  if (!user) return { status: 'redirect', href: '/(welcome)/lobby' };
  if (user && shouldSkipOnboardingForGuest(user, profile)) {
    return { status: 'redirect', href: '/(tabs)' };
  }
  if (profile?.onboarding_completed) return { status: 'redirect', href: '/(tabs)' };
  return { status: 'allowed' };
}
