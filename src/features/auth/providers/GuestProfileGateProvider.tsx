import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { GuestProfileGateSheet } from '@/features/auth/components/GuestProfileGateSheet';
import { useAuth } from '@/providers/AuthProvider';

type GuestProfileGateContextValue = {
  requestGuestProfile: (actionLabel: string) => Promise<boolean>;
};

const GuestProfileGateContext = createContext<GuestProfileGateContextValue | null>(null);

export function GuestProfileGateProvider({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const [visible, setVisible] = useState(false);
  const [actionLabel, setActionLabel] = useState('Bu işlem');
  const resolverRef = useRef<((granted: boolean) => void) | null>(null);

  const settle = useCallback((granted: boolean) => {
    setVisible(false);
    resolverRef.current?.(granted);
    resolverRef.current = null;
  }, []);

  const requestGuestProfile = useCallback((label: string) => {
    if (!user) return Promise.resolve(false);
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
  }, [user]);

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
      {user ? (
        <GuestProfileGateSheet
          visible={visible}
          actionLabel={actionLabel}
          userId={user.id}
          initialUsername={profile?.username ?? undefined}
          onClose={() => settle(false)}
          onCompleted={() => void handleCompleted()}
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
