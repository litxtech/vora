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
import { useAuth } from '@/providers/AuthProvider';
import {
  buildAccountSwitchPreview,
  hasStoredSiblingSession,
  loadOwnedBusinessMeta,
  performAccountSwitch,
  refreshLinkedSibling,
  resolveAccountSwitchTargets,
  restorePersistedLinkedAccount,
  wasBootLinkedSessionRestored,
} from '@/features/account-switch/services/accountSwitch';
import { fetchOutgoingPendingLinkRequest } from '@/features/account-switch/services/accountLinkRequests';
import {
  clearActingMode,
  readActingMode,
  readLastActiveAccount,
} from '@/features/account-switch/services/accountSwitchStorage';
import type { AccountSwitchPreview, ActingMode, LinkedSiblingProfile } from '@/features/account-switch/types';

type AccountSwitchContextValue = {
  actingAs: ActingMode;
  effectiveAccountType: 'personal' | 'business';
  linkedSibling: LinkedSiblingProfile | null;
  outgoingPendingUsername: string | null;
  outgoingPendingRequestId: string | null;
  outgoingPendingTargetUserId: string | null;
  needsSiblingSessionSetup: boolean;
  hasOwnedBusiness: boolean;
  canSwitch: boolean;
  switchPreview: AccountSwitchPreview | null;
  isSwitching: boolean;
  switchAccount: () => Promise<{ error: string | null; needsReauth?: boolean }>;
  refreshSwitchState: () => Promise<void>;
};

const AccountSwitchContext = createContext<AccountSwitchContextValue | null>(null);

function defaultActingMode(accountType: 'personal' | 'business' | undefined): ActingMode {
  return accountType === 'business' ? 'business' : 'personal';
}

export function AccountSwitchProvider({ children }: { children: ReactNode }) {
  const { user, profile, isGuest } = useAuth();
  const [actingAs, setActingAs] = useState<ActingMode>('personal');
  const [linkedSibling, setLinkedSibling] = useState<LinkedSiblingProfile | null>(null);
  const [outgoingPendingUsername, setOutgoingPendingUsername] = useState<string | null>(null);
  const [outgoingPendingRequestId, setOutgoingPendingRequestId] = useState<string | null>(null);
  const [outgoingPendingTargetUserId, setOutgoingPendingTargetUserId] = useState<string | null>(null);
  const [needsSiblingSessionSetup, setNeedsSiblingSessionSetup] = useState(false);
  const [hasOwnedBusiness, setHasOwnedBusiness] = useState(false);
  const [ownedBusinessName, setOwnedBusinessName] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const restoreAttemptKeyRef = useRef<string | null>(null);

  const refreshSwitchState = useCallback(async () => {
    if (!user?.id || isGuest) {
      setLinkedSibling(null);
      setOutgoingPendingUsername(null);
      setOutgoingPendingRequestId(null);
      setOutgoingPendingTargetUserId(null);
      setNeedsSiblingSessionSetup(false);
      setHasOwnedBusiness(false);
      setOwnedBusinessName(null);
      setActingAs('personal');
      return;
    }

    const accountType = profile?.account_type ?? 'personal';
    const ownedMetaPromise =
      accountType === 'business'
        ? Promise.resolve({ hasBusiness: true, businessName: null as string | null })
        : loadOwnedBusinessMeta(user.id);

    const [lastActive, storedMode, sibling, ownedMeta, outgoingPending] = await Promise.all([
      readLastActiveAccount(),
      readActingMode(user.id),
      refreshLinkedSibling(),
      ownedMetaPromise,
      fetchOutgoingPendingLinkRequest(user.id),
    ]);

    if (
      sibling &&
      lastActive &&
      lastActive.activeUserId !== user.id &&
      lastActive.activeUserId === sibling.siblingId &&
      !wasBootLinkedSessionRestored(user.id)
    ) {
      const attemptKey = `${user.id}:${sibling.siblingId}`;
      if (restoreAttemptKeyRef.current !== attemptKey) {
        restoreAttemptKeyRef.current = attemptKey;
        const { restored } = await restorePersistedLinkedAccount(user.id);
        if (restored) return;
      }
    } else {
      restoreAttemptKeyRef.current = null;
    }

    setLinkedSibling(sibling);
    setOutgoingPendingUsername(
      sibling ? null : outgoingPending?.targetUsername?.trim() || null,
    );
    setOutgoingPendingRequestId(sibling ? null : outgoingPending?.requestId ?? null);
    setOutgoingPendingTargetUserId(sibling ? null : outgoingPending?.targetUserId ?? null);
    setHasOwnedBusiness(ownedMeta.hasBusiness);
    setOwnedBusinessName(ownedMeta.businessName);

    if (sibling) {
      const hasSession = await hasStoredSiblingSession(sibling.siblingId);
      setNeedsSiblingSessionSetup(!hasSession);
    } else {
      setNeedsSiblingSessionSetup(false);
    }

    const resolved =
      (lastActive?.activeUserId === user.id ? lastActive.mode : null) ??
      storedMode ??
      defaultActingMode(accountType);
    setActingAs(resolved);
  }, [user?.id, isGuest, profile?.account_type]);

  useEffect(() => {
    void refreshSwitchState();
  }, [refreshSwitchState]);

  useEffect(() => {
    if (!user?.id) {
      restoreAttemptKeyRef.current = null;
      void clearActingMode();
      setActingAs('personal');
      setLinkedSibling(null);
      setOutgoingPendingUsername(null);
      setOutgoingPendingRequestId(null);
      setOutgoingPendingTargetUserId(null);
      setNeedsSiblingSessionSetup(false);
      setHasOwnedBusiness(false);
      setOwnedBusinessName(null);
    }
  }, [user?.id]);

  const accountType = profile?.account_type ?? 'personal';

  const canSwitch = useMemo(() => {
    if (!user?.id || isGuest) return false;
    if (linkedSibling) return true;
    if (accountType === 'personal' && hasOwnedBusiness) return true;
    if (accountType === 'business') return true;
    return false;
  }, [user?.id, isGuest, linkedSibling, accountType, hasOwnedBusiness]);

  const effectiveAccountType: 'personal' | 'business' = linkedSibling ? accountType : actingAs;

  const switchPreview = useMemo(() => {
    if (!user?.id || !canSwitch) return null;
    const target = resolveAccountSwitchTargets({
      userId: user.id,
      accountType,
      actingAs,
      linkedSibling,
      hasOwnedBusiness,
      ownedBusinessName,
    });
    if (!target) return null;
    return buildAccountSwitchPreview(target, linkedSibling);
  }, [user?.id, canSwitch, accountType, actingAs, linkedSibling, hasOwnedBusiness, ownedBusinessName]);

  const switchAccount = useCallback(async () => {
    if (!user?.id || !canSwitch) {
      return { error: 'Hesap değişimi kullanılamıyor.' };
    }

    setIsSwitching(true);
    try {
      const result = await performAccountSwitch({
        userId: user.id,
        accountType,
        actingAs,
        linkedSibling,
        hasOwnedBusiness,
      });

      if (result.error) return { error: result.error, needsReauth: result.needsReauth };

      if (result.nextActingAs && !linkedSibling) {
        setActingAs(result.nextActingAs);
      } else if (linkedSibling) {
        await refreshSwitchState();
      }

      return { error: null };
    } finally {
      setIsSwitching(false);
    }
  }, [
    user?.id,
    canSwitch,
    accountType,
    actingAs,
    linkedSibling,
    hasOwnedBusiness,
    refreshSwitchState,
  ]);

  const value = useMemo<AccountSwitchContextValue>(
    () => ({
      actingAs,
      effectiveAccountType,
      linkedSibling,
      outgoingPendingUsername,
      outgoingPendingRequestId,
      outgoingPendingTargetUserId,
      needsSiblingSessionSetup,
      hasOwnedBusiness,
      canSwitch,
      switchPreview,
      isSwitching,
      switchAccount,
      refreshSwitchState,
    }),
    [
      actingAs,
      effectiveAccountType,
      linkedSibling,
      outgoingPendingUsername,
      outgoingPendingRequestId,
      outgoingPendingTargetUserId,
      needsSiblingSessionSetup,
      hasOwnedBusiness,
      canSwitch,
      switchPreview,
      isSwitching,
      switchAccount,
      refreshSwitchState,
    ],
  );

  return <AccountSwitchContext.Provider value={value}>{children}</AccountSwitchContext.Provider>;
}

export function useAccountSwitch(): AccountSwitchContextValue {
  const ctx = useContext(AccountSwitchContext);
  if (!ctx) {
    throw new Error('useAccountSwitch must be used within AccountSwitchProvider');
  }
  return ctx;
}
