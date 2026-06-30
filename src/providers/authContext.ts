import { createContext, useContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { NotificationPrefId } from '@/constants/auth';
import type { SessionEndReason } from '@/features/auth/services/sessionPolicy';
import type { SavedLoginAccount, SavedLoginAccountInput } from '@/features/auth/types/savedLoginAccounts';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  isGuest: boolean;
  savedLoginAccounts: SavedLoginAccount[];
  signOut: (reason?: SessionEndReason) => Promise<void>;
  enterGuestMode: () => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  rememberLoginAccount: (input: SavedLoginAccountInput) => Promise<void>;
  rememberLoginAccountAfterSuccess: (loginId: string, userId: string) => Promise<void>;
  forgetLoginAccount: (loginId: string) => Promise<void>;
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
  requestAccountFreeze: () => Promise<{ error: string | null }>;
  cancelAccountDeletion: () => Promise<{ error: string | null }>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth AuthProvider içinde kullanılmalı.');
  }
  return context;
}
