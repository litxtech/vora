import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { GuestProfileDeadlineSheet } from '@/features/auth/components/GuestProfileDeadlineSheet';
import { GuestProfileGateSheet } from '@/features/auth/components/GuestProfileGateSheet';
import { isGuestEmail } from '@/features/auth/services/guestAccount';
import {
  GUEST_PROFILE_DEADLINE_MS,
  needsMandatoryGuestProfileCard,
} from '@/features/auth/services/guestProfileDeadline';
import { useAuth } from '@/providers/AuthProvider';

type GuestProfileGateContextValue = {
  requestGuestProfile: (actionLabel: string) => Promise<boolean>;
};

const GuestProfileGateContext = createContext<GuestProfileGateContextValue | null>(null);

export function GuestProfileGateProvider({ children }: { children: ReactNode }) {
  const { user, profile, isGuest, refreshProfile } = useAuth();
  const [visible, setVisible] = useState(false);
  const [deadlineVisible, setDeadlineVisible] = useState(false);
  const [actionLabel, setActionLabel] = useState('Bu işlem');
  const resolverRef = useRef<((granted: boolean) => void) | null>(null);

  const syncDeadline = useCallback(() => {
    if (!user) {
      setDeadlineVisible(false);
      return;
    }
    setDeadlineVisible(
      needsMandatoryGuestProfileCard({
        createdAt: user.created_at,
        guestAccount: isGuest || profile?.is_guest === true || isGuestEmail(user.email),
      }),
    );
  }, [isGuest, profile?.is_guest, user]);

  useEffect(() => {
    syncDeadline();
    if (!user) return;

    const created = Date.parse(user.created_at);
    const remaining = Number.isNaN(created) ? 0 : created + GUEST_PROFILE_DEADLINE_MS - Date.now();
    const timer = remaining > 0 ? setTimeout(syncDeadline, remaining) : null;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncDeadline();
    });

    return () => {
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, [syncDeadline, user]);

  const settle = useCallback((granted: boolean) => {
    setVisible(false);
    resolverRef.current?.(granted);
    resolverRef.current = null;
  }, []);

  const requestGuestProfile = useCallback((label: string) => {
    if (!user || deadlineVisible) return Promise.resolve(false);
    if (resolverRef.current) {
      return new Promise<boolean>((resolve) => {
        const previous = resolverRef.current;
        resolverRef.current = (granted) => {
          previous?.(false);
          resolve(granted);
        };
        setActionLabel(label);
        setVisible(true);
      });
    }

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setActionLabel(label);
      setVisible(true);
    });
  }, [deadlineVisible, user]);

  const handleCompleted = useCallback(async () => {
    await refreshProfile();
    settle(true);
  }, [refreshProfile, settle]);

  const value = useMemo(
    () => ({
      requestGuestProfile,
    }),
    [requestGuestProfile],
  );

  return (
    <GuestProfileGateContext.Provider value={value}>
      {children}
      {user && !deadlineVisible ? (
        <GuestProfileGateSheet
          visible={visible}
          actionLabel={actionLabel}
          userId={user.id}
          initialUsername={profile?.username ?? undefined}
          onClose={() => settle(false)}
          onCompleted={() => void handleCompleted()}
        />
      ) : null}
      {user && deadlineVisible ? (
        <GuestProfileDeadlineSheet
          visible
          userId={user.id}
          initialFirstName={profile?.first_name ?? undefined}
          initialLastName={profile?.last_name ?? undefined}
          initialUsername={profile?.username ?? undefined}
          onCompleted={() => void refreshProfile()}
        />
      ) : null}
    </GuestProfileGateContext.Provider>
  );
}

export function useGuestProfileGate(): GuestProfileGateContextValue {
  const context = useContext(GuestProfileGateContext);
  if (!context) {
    throw new Error('useGuestProfileGate GuestProfileGateProvider içinde kullanılmalı.');
  }
  return context;
}

export function useOptionalGuestProfileGate(): GuestProfileGateContextValue | null {
  return useContext(GuestProfileGateContext);
}
