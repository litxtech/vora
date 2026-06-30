import { useEffect, useRef, useState, type RefObject } from 'react';
import { router } from 'expo-router';
import type { User } from '@supabase/supabase-js';
import {
  BOOT_FORCE_NAV_MS,
  BOOT_PAINT_TIMEOUT_MS,
  BOOT_SPLASH_MS,
  BOOT_SPLASH_VISIBLE_TIMEOUT_MS,
} from '@/components/splash';
import { waitForBootPaint } from '@/lib/boot/waitForPaint';
import { shouldSkipOnboardingForGuest } from '@/features/auth/services/guestAccount';
import { isAccountAccessReviewActive } from '@/features/auth/services/accountAccessReviewStore';
import { isBlockedBootAccountStatus } from '@/features/account-deletion/utils';
import { markNotificationBootComplete } from '@/lib/notifications/pendingNavigation';
import { releaseNativeSplash } from '@/lib/boot/nativeSplash';
import {
  getAndroidBootForceNavMs,
  getAndroidBootPaintTimeoutMs,
  getAndroidBootSplashMs,
  isAndroid,
  shouldDismissBootOverlayImmediately,
} from '@/lib/device/androidPerfProfile';
import { resolveBootLinkedSession } from '@/features/account-switch/services/accountSwitch';
import { useAuth } from '@/providers/AuthProvider';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

const FEED_ROUTE = '/(tabs)' as const;

type BootPhase = 'idle' | 'done';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function resolveBootTarget(
  user: User,
  profile: Profile | null,
): typeof FEED_ROUTE | '/(onboarding)/profile-setup' {
  if (shouldSkipOnboardingForGuest(user, profile)) {
    return FEED_ROUTE;
  }
  if (profile?.onboarding_completed === false) {
    return '/(onboarding)/profile-setup';
  }
  return FEED_ROUTE;
}

async function resolveColdStartTarget(
  user: User | null,
  profile: Profile | null,
): Promise<typeof FEED_ROUTE | '/(welcome)/lobby' | '/(onboarding)/profile-setup'> {
  if (!user) {
    return '/(welcome)/lobby';
  }
  return resolveBootTarget(user, profile);
}

async function waitForMinSplash(
  splashVisibleAt: RefObject<number | null>,
  bootStartedAt: RefObject<number>,
): Promise<void> {
  const deadline = Date.now() + BOOT_SPLASH_VISIBLE_TIMEOUT_MS;

  while (splashVisibleAt.current == null && Date.now() < deadline) {
    await sleep(8);
  }

  const anchor = splashVisibleAt.current ?? bootStartedAt.current;
  const splashMs = getAndroidBootSplashMs(BOOT_SPLASH_MS);
  const remaining = splashMs - (Date.now() - anchor);
  if (remaining > 0) await sleep(remaining);
}

function dismissBootOverlay(setIsBooting: (value: boolean) => void): void {
  releaseNativeSplash();
  setIsBooting(false);
  markNotificationBootComplete();
}

function resolveBootForceNavMs(): number {
  return getAndroidBootForceNavMs(BOOT_FORCE_NAV_MS);
}

function shouldDeferBootNavigation(profile: Profile | null): boolean {
  return isBlockedBootAccountStatus(profile?.account_status);
}

function resolveBootPaintTimeoutMs(): number {
  return getAndroidBootPaintTimeoutMs(BOOT_PAINT_TIMEOUT_MS);
}

/** Cold-start — feed hemen mount, kısa splash overlay, Modal yok. */
export function useBootNavigation(splashVisibleAt: RefObject<number | null>): boolean {
  const { isLoading, user, profile } = useAuth();
  const phase = useRef<BootPhase>('idle');
  const bootStartedAt = useRef(Date.now());
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    if (isLoading || user || phase.current !== 'done') return;
    if (isAccountAccessReviewActive()) return;

    // Token yenileme sırasında kısa süreli null oturumda hemen lobiye atma.
    const timer = setTimeout(() => {
      if (isAccountAccessReviewActive()) return;
      router.replace('/(welcome)/lobby');
    }, 500);

    return () => clearTimeout(timer);
  }, [isLoading, user]);

  const runColdStart = async (reason: string) => {
    if (phase.current === 'done') return;

    const forced = reason === 'force-timeout';
    if (!forced && isLoading) return;

    if (forced && isLoading) {
      // Oturum SecureStore'dan okunmadan lobiye atma — yalnızca overlay'i kaldır.
      if (shouldDismissBootOverlayImmediately()) {
        dismissBootOverlay(setIsBooting);
      }
      return;
    }

    if (isAccountAccessReviewActive()) {
      phase.current = 'done';
      dismissBootOverlay(setIsBooting);
      return;
    }

    if (phase.current === 'done') return;

    let bootUser = user;
    if (user?.id) {
      const { userId } = await resolveBootLinkedSession(user.id);
      if (userId !== user.id) {
        bootUser = { ...user, id: userId };
      }
    }

    if (shouldDeferBootNavigation(profile)) {
      phase.current = 'done';
      dismissBootOverlay(setIsBooting);
      return;
    }

    const target = await resolveColdStartTarget(bootUser, profile);

    phase.current = 'done';
    router.replace(target as never);

    if (shouldDismissBootOverlayImmediately()) {
      dismissBootOverlay(setIsBooting);
      return;
    }

    await waitForMinSplash(splashVisibleAt, bootStartedAt);
    await waitForBootPaint(resolveBootPaintTimeoutMs());
    dismissBootOverlay(setIsBooting);
  };

  useEffect(() => {
    if (isLoading || phase.current === 'done') return;
    void runColdStart(user ? 'authenticated' : 'signed-out');
  }, [isLoading, user, profile, splashVisibleAt]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (phase.current === 'done') return;
      void runColdStart('force-timeout');
    }, resolveBootForceNavMs());

    return () => clearTimeout(timer);
  }, [isLoading, user, profile, splashVisibleAt]);

  return isBooting;
}
