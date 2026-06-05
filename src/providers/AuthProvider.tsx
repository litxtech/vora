import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database';
import type { NotificationPrefId } from '@/constants/auth';

type Profile = Database['public']['Tables']['profiles']['Row'];

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isGuest: boolean;
  rememberedEmail: string | null;
  signOut: () => Promise<void>;
  enterGuestMode: () => Promise<void>;
  exitGuestMode: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  saveRememberedEmail: (email: string | null) => Promise<void>;
  completeOnboarding: (data: {
    avatarUrl?: string | null;
    regionId: string;
    district: string;
    bio?: string;
    occupation?: string;
    interests: string[];
    notificationPrefs: Partial<Record<NotificationPrefId, boolean>>;
  }) => Promise<{ error: string | null }>;
  updateAccountStatus: (status: Profile['account_status']) => Promise<{ error: string | null }>;
  changePassword: (newPassword: string) => Promise<{ error: string | null }>;
  requestAccountDeletion: () => Promise<{ error: string | null }>;
  cancelAccountDeletion: () => Promise<{ error: string | null }>;
};

const GUEST_KEY = 'auth:guest_mode';
const REMEMBER_EMAIL_KEY = 'auth:remembered_email';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(null);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile(data as Profile | null);
  };

  const refreshProfile = async () => {
    if (!session?.user.id) return;
    await loadProfile(session.user.id);
  };

  useEffect(() => {
    Promise.all([
      supabase.auth.getSession(),
      AsyncStorage.getItem(GUEST_KEY),
      SecureStore.getItemAsync(REMEMBER_EMAIL_KEY),
    ]).then(([sessionResult, guestRaw, remembered]) => {
      setSession(sessionResult.data.session);
      setIsGuest(guestRaw === 'true');
      setRememberedEmail(remembered);

      if (sessionResult.data.session?.user.id) {
        loadProfile(sessionResult.data.session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user.id) {
        setIsGuest(false);
        AsyncStorage.removeItem(GUEST_KEY);
        loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const updateAccountStatus = async (status: Profile['account_status']) => {
    if (!session?.user.id || !status) return { error: 'Oturum bulunamadı.' };

    const { error } = await supabase
      .from('profiles')
      .update({ account_status: status })
      .eq('id', session.user.id);

    if (error) return { error: error.message };
    await loadProfile(session.user.id);
    return { error: null };
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isLoading,
      isGuest,
      rememberedEmail,
      signOut: async () => {
        await supabase.auth.signOut();
        await AsyncStorage.removeItem(GUEST_KEY);
        setIsGuest(false);
      },
      enterGuestMode: async () => {
        await AsyncStorage.setItem(GUEST_KEY, 'true');
        setIsGuest(true);
      },
      exitGuestMode: async () => {
        await AsyncStorage.removeItem(GUEST_KEY);
        setIsGuest(false);
      },
      refreshProfile,
      saveRememberedEmail: async (email) => {
        if (email) {
          await SecureStore.setItemAsync(REMEMBER_EMAIL_KEY, email);
          setRememberedEmail(email);
        } else {
          await SecureStore.deleteItemAsync(REMEMBER_EMAIL_KEY);
          setRememberedEmail(null);
        }
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

        if (error) return { error: error.message };
        await loadProfile(session.user.id);
        return { error: null };
      },
      updateAccountStatus,
      changePassword: async (newPassword) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        return { error: error?.message ?? null };
      },
      requestAccountDeletion: async () => updateAccountStatus('deletion_pending'),
      cancelAccountDeletion: async () => updateAccountStatus('active'),
    }),
    [session, profile, isLoading, isGuest, rememberedEmail],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth AuthProvider içinde kullanılmalı.');
  }
  return context;
}
