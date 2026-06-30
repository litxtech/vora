import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import { enterGuestMode, resolveIsGuestUser } from '@/features/auth/services/guestAccount';
import { resolvePostLoginAccess } from '@/features/auth/services/accountAccessReview';
import { presentAccountAccessReview } from '@/features/auth/services/postLoginNavigation';
import { isAccountAccessReviewActive } from '@/features/auth/services/accountAccessReviewStore';
import {
  consumeSignOutReason,
  markSignOutReason,
  markSkipAutoGuest,
  resolveForcedSignOutReason,
  type SessionEndReason,
} from '@/features/auth/services/sessionPolicy';
import {
  cancelAccountDeletionRpc,
  requestAccountDeletionRpc,
  requestAccountFreezeRpc,
} from '@/features/account-deletion/services/accountDeletion';
import { invalidateAllSessionCaches } from '@/lib/cache/invalidateSessionCaches';
import { invalidateProfileSessionCache } from '@/features/profile/services/profileSessionCache';
import { hydrateOwnProfileDiskCache } from '@/features/profile/services/profileDiskCache';
import { prefetchOwnProfileScreen } from '@/features/profile/services/profileSessionLoad';
import { AUTH_SESSION_PROFILE_COLUMNS } from '@/features/profile/services/profileData';
import { ensureCurrentUserProfile } from '@/features/profile/services/ensureProfile';
import { registerCurrentSession } from '@/features/moderation/services/sessions';
import { useUserPresence } from '@/features/messaging/hooks/useUserPresence';
import { deactivatePushTokens } from '@/lib/notifications/register';
import { supabase } from '@/lib/supabase/client';
import { deferUntilUiIdle } from '@/lib/ui/deferUntilUiIdle';
import { isAndroid } from '@/lib/device/androidPerfProfile';
import { resolveAuthBootstrapTimeoutMs } from '@/lib/boot/authBootstrap';
import { getHeavyFeatureBootDelayMs } from '@/lib/boot/heavyFeatureDelay';
import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';
import { ReferralActiveTracker } from '@/features/referral-earnings/hooks/useReferralActiveHeartbeat';
import { AppActiveTracker } from '@/features/leaderboard/hooks/useAppActiveHeartbeat';
import { resolveInitialAuthSessionTimeoutMs } from '@/lib/boot/resolveInitialAuthSessionTimeoutMs';
import {
  forgetLoginAccount as forgetLoginAccountStorage,
  loadSavedLoginAccounts,
  rememberLoginAccount as rememberLoginAccountStorage,
  rememberLoginAccountAfterSuccess as rememberLoginAccountAfterSuccessStorage,
  syncSavedLoginAccountFromProfile,
} from '@/features/auth/services/savedLoginAccounts';
import type { Database } from '@/types/database';
import type { SavedLoginAccount, SavedLoginAccountInput } from '@/features/auth/types/savedLoginAccounts';
import { supabaseErrorMessage } from '@/lib/errors';
import { AuthContext, type AuthContextValue } from '@/providers/authContext';

type Profile = Database['public']['Tables']['profiles']['Row'];

function resolveIsGuest(user: User | null, profile: Profile | null): boolean {
  return resolveIsGuestUser(user, profile);
}

const LEGACY_GUEST_KEY = 'auth:guest_mode';
const ROUTING_PROFILE_CACHE_KEY = 'auth:routing_profile_v1';

const ROUTING_PROFILE_COLUMNS =
  'id, onboarding_completed, is_guest, account_status, role, avatar_url, username';

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function deferAfterInteractions(task: () => void) {
  deferUntilUiIdle(task);
}

/** supabase-js auth kilidi içinde async auth çağrısı deadlock yapar — callback dışına ertele. */
function deferAuthStateSideEffect(task: () => void) {
  setTimeout(task, 0);
}

type RoutingProfileSnapshot = Pick<
  Profile,
  'id' | 'onboarding_completed' | 'is_guest' | 'account_status' | 'role' | 'avatar_url' | 'username'
>;

function mergeRoutingProfile(
  prev: Profile | null,
  routing: RoutingProfileSnapshot,
): Profile {
  return { ...(prev ?? {}), ...routing } as Profile;
}

async function readRoutingProfileCache(userId: string): Promise<RoutingProfileSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(ROUTING_PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoutingProfileSnapshot;
    return parsed.id === userId ? parsed : null;
  } catch {
    return null;
  }
}

async function writeRoutingProfileCache(profile: RoutingProfileSnapshot) {
  await AsyncStorage.setItem(ROUTING_PROFILE_CACHE_KEY, JSON.stringify(profile));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [savedLoginAccounts, setSavedLoginAccounts] = useState<SavedLoginAccount[]>([]);
  const forcedSignOutRef = useRef(false);
  const recoveringRef = useRef(false);
  const bootstrappedUserRef = useRef<string | null>(null);

  const user = session?.user ?? null;
  const isGuest = resolveIsGuest(user, profile);

  useUserPresence(isGuest ? null : user?.id);

  const performSignOut = async (reason: SessionEndReason) => {
    forcedSignOutRef.current = true;
    const userId = session?.user?.id;
    const snapshotProfile = profile;
    const snapshotUser = session?.user ?? null;

    if (
      userId &&
      snapshotProfile &&
      snapshotUser &&
      !resolveIsGuestUser(snapshotUser, snapshotProfile)
    ) {
      const loginIds = [snapshotUser.email, snapshotProfile.username]
        .filter((value): value is string => Boolean(value?.trim()))
        .map((value) => value.trim());

      const accounts = await syncSavedLoginAccountFromProfile({
        userId,
        username: snapshotProfile.username,
        avatarUrl: snapshotProfile.avatar_url,
        loginIds,
      });
      setSavedLoginAccounts(accounts);
    }

    if (userId) {
      await deactivatePushTokens(userId).catch(() => undefined);
    }
    await markSignOutReason(reason);
    await markSkipAutoGuest();
    await supabase.auth.signOut();
    invalidateAllSessionCaches(userId);
    await AsyncStorage.removeItem(ROUTING_PROFILE_CACHE_KEY);
    await AsyncStorage.removeItem(LEGACY_GUEST_KEY);
  };

  const enforceAccessPolicy = async (
    userId: string,
    nextProfile: Profile | null,
  ): Promise<boolean> => {
    if (forcedSignOutRef.current || isAccountAccessReviewActive()) return true;

    const reason = await resolveForcedSignOutReason(userId, nextProfile);
    if (!reason) return false;

    const access = await resolvePostLoginAccess(userId);
    if (access.action === 'review') {
      forcedSignOutRef.current = true;
      setProfile(null);
      setIsProfileLoading(false);
      await presentAccountAccessReview(access);
      return true;
    }

    forcedSignOutRef.current = true;
    await performSignOut(reason);
    setProfile(null);
    setIsProfileLoading(false);
    return true;
  };

  const recoverPersistedSession = async (): Promise<Session | null> => {
    if (recoveringRef.current) return null;
    recoveringRef.current = true;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) return null;
      return data.session ?? null;
    } finally {
      recoveringRef.current = false;
    }
  };

  const loadFullProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select(AUTH_SESSION_PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle();
    if (data) {
      const nextProfile = data as Profile;
      setProfile(nextProfile);
      await enforceAccessPolicy(userId, nextProfile);
    }
  };

  const loadRoutingProfile = async (userId: string): Promise<Profile | null> => {
    let { data } = await supabase
      .from('profiles')
      .select(ROUTING_PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle();

    if (!data) {
      await ensureCurrentUserProfile();
      const retry = await supabase
        .from('profiles')
        .select(ROUTING_PROFILE_COLUMNS)
        .eq('id', userId)
        .maybeSingle();
      data = retry.data;
    }

    return data as Profile | null;
  };

  const loadProfile = async (userId: string) => {
    let { data } = await supabase
      .from('profiles')
      .select(AUTH_SESSION_PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle();

    if (!data) {
      await ensureCurrentUserProfile();
      const retry = await supabase
        .from('profiles')
        .select(AUTH_SESSION_PROFILE_COLUMNS)
        .eq('id', userId)
        .maybeSingle();
      data = retry.data;
    }

    const nextProfile = data as Profile | null;
    setProfile(nextProfile);
    if (nextProfile) {
      await enforceAccessPolicy(userId, nextProfile);
    }
  };

  const runSessionBootstrap = (nextSession: Session, mounted: () => boolean, force = false) => {
    const userId = nextSession.user.id;
    if (!force && bootstrappedUserRef.current === userId) return;
    bootstrappedUserRef.current = userId;
    void bootstrapUserSession(nextSession, mounted);
  };

  const bootstrapUserSession = async (nextSession: Session, mounted: () => boolean) => {
    const userId = nextSession.user.id;
    const guestFromMeta = nextSession.user.user_metadata?.is_guest === true;

    if (guestFromMeta) {
      void ensureCurrentUserProfile()
        .catch(() => undefined)
        .then(() => loadFullProfile(userId));
      return;
    }

    const cached = await readRoutingProfileCache(userId);
    if (cached && mounted()) {
      setProfile((prev) => mergeRoutingProfile(prev, cached));
      const blocked = await enforceAccessPolicy(userId, cached as Profile);
      if (blocked) return;
    } else if (mounted()) {
      setIsProfileLoading(true);
    }

    try {
      const routingProfile = await withTimeout(
        loadRoutingProfile(userId),
        resolveAuthBootstrapTimeoutMs(),
      );
      if (!mounted()) return;

      if (routingProfile) {
        const blocked = await enforceAccessPolicy(userId, routingProfile);
        if (blocked) return;
        setProfile((prev) => mergeRoutingProfile(prev, routingProfile));
        void writeRoutingProfileCache(routingProfile);
      }
    } finally {
      if (mounted()) setIsProfileLoading(false);
    }

    if (isAndroid()) {
      deferAfterInteractions(() => {
        void loadFullProfile(userId);
        void hydrateOwnProfileDiskCache(userId, userId);
      });
    } else {
      void loadFullProfile(userId);
      void hydrateOwnProfileDiskCache(userId, userId);
    }
    deferAfterInteractions(() => {
      registerCurrentSession();
      prefetchOwnProfileScreen(userId);
      if (isAndroid()) {
        void import('@/features/profile/components/ProfileContent');
      }
    });
  };

  const refreshProfile = async () => {
    const userId = session?.user.id;
    if (!userId) return;

    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshed.session) {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userError && userData.user) {
        setSession({ ...refreshed.session, user: userData.user });
      } else {
        setSession(refreshed.session);
      }
    }

    invalidateProfileSessionCache(userId);
    await loadProfile(userId);
  };

  useEffect(() => {
    let mounted = true;
    const isMounted = () => mounted;
    let resolveInitialSession: ((session: Session | null) => void) | null = null;
    let initialSessionTimer: ReturnType<typeof setTimeout> | undefined;

    const initialSessionPromise = new Promise<Session | null>((resolve) => {
      resolveInitialSession = resolve;
    });

    const finishInitialSessionWait = (session: Session | null) => {
      if (!resolveInitialSession) return;
      resolveInitialSession(session);
      resolveInitialSession = null;
      if (initialSessionTimer) clearTimeout(initialSessionTimer);
    };

    initialSessionTimer = setTimeout(() => finishInitialSessionWait(null), resolveInitialAuthSessionTimeoutMs());

    const processAuthStateChange = async (
      event: string,
      nextSession: Session | null,
    ) => {
      if (!isMounted()) return;

      if (!nextSession && (event === 'SIGNED_OUT' || event === 'USER_DELETED')) {
        if (forcedSignOutRef.current) {
          bootstrappedUserRef.current = null;
          setSession(null);
          setProfile(null);
          setIsProfileLoading(false);
          return;
        }

        const allowedReason = await consumeSignOutReason();
        if (!allowedReason) {
          const recovered = await recoverPersistedSession();
          if (!isMounted()) return;
          if (recovered?.user?.id) {
            setSession(recovered);
            if (event === 'SIGNED_OUT') {
              void bootstrapUserSession(recovered, isMounted);
            }
            return;
          }
        }
        bootstrappedUserRef.current = null;
        setSession(null);
        setProfile(null);
        setIsProfileLoading(false);
        return;
      }

      setSession(nextSession);
      if (nextSession?.user.id) {
        forcedSignOutRef.current = false;
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          runSessionBootstrap(nextSession, isMounted, event === 'SIGNED_IN');
        } else if (event === 'TOKEN_REFRESHED') {
          void loadFullProfile(nextSession.user.id);
        } else if (event !== 'PASSWORD_RECOVERY') {
          void loadFullProfile(nextSession.user.id);
        }
      } else {
        setProfile(null);
        setIsProfileLoading(false);
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'INITIAL_SESSION') {
        finishInitialSessionWait(nextSession);
      }
      deferAuthStateSideEffect(() => {
        void processAuthStateChange(event, nextSession);
      });
    });

    void (async () => {
      try {
        let nextSession: Session | null = null;
        const sessionResult = await withTimeout(
          supabase.auth.getSession(),
          resolveAuthBootstrapTimeoutMs(),
        );

        if (sessionResult?.data.session) {
          nextSession = sessionResult.data.session;
        } else if (sessionResult === null) {
          // SecureStore parça okuması yavaşsa kısa timeout yetmez — tam okumayı bekle.
          const { data, error } = await supabase.auth.getSession();
          if (!error) nextSession = data.session ?? null;
        } else {
          nextSession = sessionResult.data.session ?? null;
        }

        if (!nextSession) {
          const fromInitial = await initialSessionPromise;
          if (fromInitial?.user?.id) nextSession = fromInitial;
        } else {
          finishInitialSessionWait(null);
        }

        if (!mounted) return;

        setSession(nextSession);
        setIsLoading(false);

        if (nextSession?.user.id) {
          runSessionBootstrap(nextSession, isMounted);
        }

        AsyncStorage.removeItem(LEGACY_GUEST_KEY);
      } catch {
        finishInitialSessionWait(null);
        if (mounted) {
          setIsLoading(false);
          setIsProfileLoading(false);
        }
      }
    })();

    loadSavedLoginAccounts()
      .then((accounts) => {
        if (mounted) setSavedLoginAccounts(accounts);
      })
      .catch(() => {
        if (mounted) setSavedLoginAccounts([]);
      });

    return () => {
      mounted = false;
      finishInitialSessionWait(null);
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let deferTask: { cancel: () => void } | null = null;

    const disconnect = () => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };

    const subscribe = () => {
      if (cancelled || AppState.currentState !== 'active') return;
      disconnect();
      channel = supabase
        .channel(`profile-access-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            const nextProfile = payload.new as Profile;
            setProfile((prev) => (prev ? { ...prev, ...nextProfile } : nextProfile));
            void enforceAccessPolicy(userId, nextProfile);
          },
        )
        .subscribe();
    };

    const scheduleSubscribe = (delayMs: number) => {
      if (cancelled || AppState.currentState !== 'active') return;
      if (timer) clearTimeout(timer);
      deferTask?.cancel();
      if (delayMs > 0) {
        timer = setTimeout(subscribe, delayMs);
      } else {
        deferTask = deferBackgroundWork(subscribe);
      }
    };

    scheduleSubscribe(getHeavyFeatureBootDelayMs('auth-profile'));

    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        scheduleSubscribe(0);
        return;
      }
      if (timer) clearTimeout(timer);
      deferTask?.cancel();
      disconnect();
    });

    return () => {
      cancelled = true;
      appSub.remove();
      if (timer) clearTimeout(timer);
      deferTask?.cancel();
      disconnect();
    };
  }, [user?.id]);

  const updateAccountStatus = async (status: Profile['account_status']) => {
    if (!session?.user.id || !status) return { error: 'Oturum bulunamadı.' };

    const { error } = await supabase
      .from('profiles')
      .update({ account_status: status })
      .eq('id', session.user.id);

    if (error) return { error: supabaseErrorMessage(error)! };
    await loadProfile(session.user.id);
    return { error: null };
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      isLoading,
      isProfileLoading,
      isGuest,
      savedLoginAccounts,
      signOut: async (reason = 'manual') => {
        await performSignOut(reason);
      },
      enterGuestMode: async () => {
        const result = await enterGuestMode();
        if (!result.error) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          const { data: userData } = await supabase.auth.getUser();
          if (refreshed.session && userData.user) {
            setSession({ ...refreshed.session, user: userData.user });
          } else if (refreshed.session) {
            setSession(refreshed.session);
          }
        }
        return { error: result.error };
      },
      refreshProfile,
      rememberLoginAccount: async (input) => {
        const accounts = await rememberLoginAccountStorage(input);
        setSavedLoginAccounts(accounts);
      },
      rememberLoginAccountAfterSuccess: async (loginId, userId) => {
        const accounts = await rememberLoginAccountAfterSuccessStorage(loginId, userId);
        setSavedLoginAccounts(accounts);
      },
      forgetLoginAccount: async (loginId) => {
        const accounts = await forgetLoginAccountStorage(loginId);
        setSavedLoginAccounts(accounts);
      },
      completeOnboarding: async (data) => {
        if (!session?.user.id) return { error: 'Oturum bulunamadı.' };

        const { error } = await supabase
          .from('profiles')
          .update({
            avatar_url: data.avatarUrl ?? null,
            region_id: data.regionId,
            district: data.district,
            bio: data.bio ?? null,
            occupation: data.occupation ?? null,
            interests: data.interests,
            notification_prefs: data.notificationPrefs,
            onboarding_completed: true,
          })
          .eq('id', session.user.id);

        if (error) return { error: supabaseErrorMessage(error)! };
        await loadProfile(session.user.id);
        return { error: null };
      },
      updateAccountStatus,
      changePassword: async (newPassword) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        return { error: supabaseErrorMessage(error) };
      },
      requestAccountDeletion: async () => {
        if (!session?.user.id) return { error: 'Oturum bulunamadı.' };
        const result = await requestAccountDeletionRpc();
        if (!result.error) await loadProfile(session.user.id);
        return result;
      },
      requestAccountFreeze: async () => {
        if (!session?.user.id) return { error: 'Oturum bulunamadı.' };
        return requestAccountFreezeRpc();
      },
      cancelAccountDeletion: async () => {
        if (!session?.user.id) return { error: 'Oturum bulunamadı.' };
        const result = await cancelAccountDeletionRpc();
        if (!result.error) await loadProfile(session.user.id);
        return result;
      },
    }),
    [session, user, profile, isLoading, isProfileLoading, isGuest, savedLoginAccounts],
  );

  return (
    <AuthContext.Provider value={value}>
      <ReferralActiveTracker />
      <AppActiveTracker />
      {children}
    </AuthContext.Provider>
  );
}

export { useAuth, useOptionalAuth } from '@/providers/authContext';
export type { AuthContextValue } from '@/providers/authContext';
