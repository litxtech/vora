import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase/client';
import { invalidateAllSessionCaches } from '@/lib/cache/invalidateSessionCaches';
import { fetchProfileByUsername } from '@/features/profile/services/profileData';
import { fetchBusinessAccountByOwner } from '@/features/business-center/services/businessShopData';
import { fetchLinkedSiblingProfile } from '@/features/account-switch/services/linkedAccounts';
import { requestAccountLink } from '@/features/account-switch/services/accountLinkRequests';
import {
  clearActingMode,
  readLastActiveAccount,
  readSiblingSession,
  removeSiblingSession,
  storeSiblingSession,
  writeActingMode,
  writeLastActiveAccount,
} from '@/features/account-switch/services/accountSwitchStorage';
import {
  cancelOutgoingAccountLinkRequest,
  unlinkAccountLink,
} from '@/features/account-switch/services/accountLinkRequests';
import type {
  AccountSwitchPreview,
  AccountSwitchTarget,
  ActingMode,
  LinkedSiblingProfile,
} from '@/features/account-switch/types';

function siblingLabel(sibling: LinkedSiblingProfile): string {
  return linkedSiblingDisplayName(sibling);
}

export async function hasStoredSiblingSession(siblingProfileId: string): Promise<boolean> {
  const session = await readSiblingSession(siblingProfileId);
  return session != null;
}

export function resolveAccountSwitchTargets(input: {
  userId: string;
  accountType: 'personal' | 'business';
  actingAs: ActingMode;
  linkedSibling: LinkedSiblingProfile | null;
  hasOwnedBusiness: boolean;
  ownedBusinessName?: string | null;
}): AccountSwitchTarget | null {
  const { userId, accountType, actingAs, linkedSibling, hasOwnedBusiness, ownedBusinessName } = input;

  if (linkedSibling) {
    return {
      mode: linkedSibling.accountType,
      kind: 'session',
      label: siblingLabel(linkedSibling),
      username: linkedSibling.username,
      avatarUrl: linkedSibling.avatarUrl,
      profileId: linkedSibling.siblingId,
    };
  }

  if (accountType === 'personal' && hasOwnedBusiness) {
    const targetMode: ActingMode = actingAs === 'personal' ? 'business' : 'personal';
    if (targetMode === actingAs) return null;
    return {
      mode: targetMode,
      kind: 'context',
      label: targetMode === 'business' ? (ownedBusinessName ?? 'İşletme profili') : 'Bireysel profil',
      username: '',
      avatarUrl: null,
      profileId: userId,
    };
  }

  if (accountType === 'business') {
    const targetMode: ActingMode = actingAs === 'personal' ? 'business' : 'personal';
    if (targetMode === actingAs) return null;
    return {
      mode: targetMode,
      kind: 'context',
      label: targetMode === 'business' ? (ownedBusinessName ?? 'İşletme profili') : 'Bireysel profil',
      username: '',
      avatarUrl: null,
      profileId: userId,
    };
  }

  return null;
}

export function buildAccountSwitchPreview(
  target: AccountSwitchTarget,
  linkedSibling: LinkedSiblingProfile | null,
): AccountSwitchPreview {
  if (target.kind === 'session' && linkedSibling) {
    const isBusiness = target.mode === 'business';
    return {
      title: isBusiness ? 'İşletme hesabına geç' : 'Bireysel hesaba geç',
      subtitle: linkedSiblingDisplayName(linkedSibling),
      target,
    };
  }

  const isBusinessView = target.mode === 'business';
  return {
    title: isBusinessView ? 'İşletme görünümüne geç' : 'Bireysel görünümüne geç',
    subtitle: 'Aynı oturum · yalnızca profil görünümü değişir',
    target,
  };
}

async function swapToSiblingSession(
  currentUserId: string,
  siblingProfileId: string,
): Promise<{ error: string | null; needsReauth?: boolean }> {
  const siblingSession = await readSiblingSession(siblingProfileId);
  if (!siblingSession) {
    return {
      error: 'Bağlı hesap oturumu kayıtlı değil. Kardeş hesabın şifresini bir kez girmeniz gerekiyor.',
      needsReauth: true,
    };
  }

  const { data: currentSessionData } = await supabase.auth.getSession();
  const currentSession = currentSessionData.session;
  if (currentSession?.refresh_token && currentSession.access_token) {
    await storeSiblingSession(currentUserId, {
      refreshToken: currentSession.refresh_token,
      accessToken: currentSession.access_token,
    });
  }

  const { error } = await supabase.auth.setSession({
    refresh_token: siblingSession.refreshToken,
    access_token: siblingSession.accessToken,
  });

  if (error) {
    await removeSiblingSession(siblingProfileId);
    return {
      error: 'Oturum süresi dolmuş. Kardeş hesabın şifresini tekrar girin.',
      needsReauth: true,
    };
  }

  invalidateAllSessionCaches(currentUserId);
  invalidateAllSessionCaches(siblingProfileId);
  return { error: null };
}

export async function performAccountSwitch(input: {
  userId: string;
  accountType: 'personal' | 'business';
  actingAs: ActingMode;
  linkedSibling: LinkedSiblingProfile | null;
  hasOwnedBusiness: boolean;
}): Promise<{ error: string | null; nextActingAs?: ActingMode; needsReauth?: boolean }> {
  const target = resolveAccountSwitchTargets(input);
  if (!target) {
    return { error: 'Zaten bu hesap görünümündesiniz.' };
  }

  if (target.kind === 'session') {
    const result = await swapToSiblingSession(input.userId, target.profileId);
    if (result.error) return result;
    await Promise.all([
      writeActingMode(target.profileId, target.mode),
      writeLastActiveAccount(target.profileId, target.mode),
    ]);
    return { error: null, nextActingAs: target.mode };
  }

  await Promise.all([
    writeActingMode(input.userId, target.mode),
    writeLastActiveAccount(input.userId, target.mode),
  ]);
  return { error: null, nextActingAs: target.mode };
}

/** Bildirim / deep link için bağlı kardeş hesaba oturum değiştirir. */
export async function switchToLinkedSiblingAccount(
  currentUserId: string,
  siblingProfileId: string,
  siblingAccountType: 'personal' | 'business',
): Promise<{ error: string | null; needsReauth?: boolean }> {
  const result = await swapToSiblingSession(currentUserId, siblingProfileId);
  if (result.error) return result;

  const mode: ActingMode = siblingAccountType === 'business' ? 'business' : 'personal';
  await Promise.all([
    writeActingMode(siblingProfileId, mode),
    writeLastActiveAccount(siblingProfileId, mode),
  ]);
  return { error: null };
}

/** Uygulama açılışında bağlı hesap çiftinde son aktif oturumu geri yükler. */
let bootRestoredFromUserId: string | null = null;

/** Boot sırasında kardeş oturumu geri yüklendiyse AccountSwitchProvider tekrar denemesin. */
export function wasBootLinkedSessionRestored(currentUserId: string): boolean {
  return bootRestoredFromUserId === currentUserId;
}

/** Açılışta bağlı hesap oturumunu feed mount olmadan önce geri yükler. */
export async function resolveBootLinkedSession(
  currentUserId: string,
): Promise<{ userId: string; restored: boolean }> {
  const result = await restorePersistedLinkedAccount(currentUserId);
  if (!result.restored) {
    return { userId: currentUserId, restored: false };
  }

  bootRestoredFromUserId = currentUserId;
  const { data } = await supabase.auth.getSession();
  return { userId: data.session?.user?.id ?? currentUserId, restored: true };
}

export async function restorePersistedLinkedAccount(
  currentUserId: string,
): Promise<{ restored: boolean; needsReauth?: boolean }> {
  // Önce yerel kayıt (AsyncStorage) — hiç hesap geçişi yapılmamışsa ya da
  // zaten aktif hesaptaysak ağ çağrısına gerek yok; boot feed'e hemen geçsin.
  const last = await readLastActiveAccount();
  if (!last || last.activeUserId === currentUserId) return { restored: false };

  const sibling = await fetchLinkedSiblingProfile();
  if (!sibling) return { restored: false };
  if (last.activeUserId !== sibling.siblingId) return { restored: false };

  const result = await swapToSiblingSession(currentUserId, sibling.siblingId);
  if (result.error) {
    return { restored: false, needsReauth: result.needsReauth };
  }

  await Promise.all([
    writeActingMode(last.activeUserId, last.mode),
    writeLastActiveAccount(last.activeUserId, last.mode),
  ]);
  return { restored: true };
}

/** Bağlı hesap oturumunu şifre ile yeniden kaydeder (onay sonrası veya token süresi dolunca). */
export async function storeSiblingSessionFromCredentials(input: {
  siblingUsername: string;
  email: string;
  password: string;
}): Promise<{ error: string | null }> {
  const trimmedUsername = input.siblingUsername.trim().toLowerCase();
  const trimmedEmail = input.email.trim();

  const siblingProfile = await fetchProfileByUsername(trimmedUsername);
  if (!siblingProfile) return { error: 'Kullanıcı adı bulunamadı.' };

  const { data: currentSessionData } = await supabase.auth.getSession();
  const currentSession = currentSessionData.session;
  if (!currentSession) return { error: 'Oturum bulunamadı.' };

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password: input.password,
  });

  if (signInError || !signInData.session || !signInData.user) {
    return { error: 'E-posta veya şifre hatalı.' };
  }

  if (signInData.user.id !== siblingProfile.id) {
    await supabase.auth.setSession({
      refresh_token: currentSession.refresh_token,
      access_token: currentSession.access_token,
    });
    return { error: 'Girilen bilgiler bu kullanıcı adıyla eşleşmiyor.' };
  }

  const siblingSession = {
    refreshToken: signInData.session.refresh_token,
    accessToken: signInData.session.access_token,
  };

  const restore = await supabase.auth.setSession({
    refresh_token: currentSession.refresh_token,
    access_token: currentSession.access_token,
  });

  if (restore.error) {
    return { error: 'Oturum geri yüklenemedi. Tekrar giriş yapın.' };
  }

  await storeSiblingSession(siblingProfile.id, siblingSession);
  return { error: null };
}

export async function linkSiblingAccountWithCredentials(input: {
  currentUserId: string;
  currentAccountType: 'personal' | 'business';
  username: string;
  email: string;
  password: string;
}): Promise<{ error: string | null; pendingApproval?: boolean }> {
  const trimmedUsername = input.username.trim().toLowerCase();
  const trimmedEmail = input.email.trim();
  const expectedSiblingType = input.currentAccountType === 'personal' ? 'business' : 'personal';

  const siblingProfile = await fetchProfileByUsername(trimmedUsername);
  if (!siblingProfile) return { error: 'Kullanıcı adı bulunamadı.' };
  if (siblingProfile.id === input.currentUserId) {
    return { error: 'Kendi hesabınızı bağlayamazsınız.' };
  }
  if (siblingProfile.accountType !== expectedSiblingType) {
    return {
      error:
        expectedSiblingType === 'business'
          ? 'Bu kullanıcı adı işletme hesabına ait değil.'
          : 'Bu kullanıcı adı bireysel hesaba ait değil.',
    };
  }

  const storeResult = await storeSiblingSessionFromCredentials({
    siblingUsername: trimmedUsername,
    email: trimmedEmail,
    password: input.password,
  });
  if (storeResult.error) return storeResult;

  const { error: requestError } = await requestAccountLink(siblingProfile.id);
  if (requestError) return { error: requestError };

  return { error: null, pendingApproval: true };
}

export function linkedSiblingDisplayName(sibling: LinkedSiblingProfile): string {
  return sibling.fullName?.trim() || sibling.username;
}

export async function loadOwnedBusinessMeta(
  userId: string,
): Promise<{ hasBusiness: boolean; businessName: string | null }> {
  const business = await fetchBusinessAccountByOwner(userId);
  return {
    hasBusiness: business != null,
    businessName: business?.name?.trim() || null,
  };
}

export async function loadOwnedBusinessFlag(userId: string): Promise<boolean> {
  const { hasBusiness } = await loadOwnedBusinessMeta(userId);
  return hasBusiness;
}

export async function loadOwnedBusinessName(userId: string): Promise<string | null> {
  const { businessName } = await loadOwnedBusinessMeta(userId);
  return businessName;
}

export async function clearLinkedAccountLocalState(
  currentUserId: string,
  siblingId: string | null,
): Promise<void> {
  const removals = [removeSiblingSession(currentUserId)];
  if (siblingId) removals.push(removeSiblingSession(siblingId));
  await Promise.all([...removals, clearActingMode()]);
}

/** Bağlı hesap çiftini kaldırır ve cihazdaki kardeş oturum kayıtlarını temizler. */
export async function disconnectLinkedAccount(input: {
  currentUserId: string;
  siblingId: string | null;
}): Promise<{ error: string | null }> {
  const { error } = await unlinkAccountLink();
  if (error) return { error };
  await clearLinkedAccountLocalState(input.currentUserId, input.siblingId);
  return { error: null };
}

/** Gönderilmiş bekleyen bağlama isteğini iptal eder. */
export async function cancelPendingAccountLink(
  requestId: string,
  currentUserId: string,
  targetUserId: string | null,
): Promise<{ error: string | null }> {
  const { error } = await cancelOutgoingAccountLinkRequest(requestId);
  if (error) return { error };
  if (targetUserId) {
    await removeSiblingSession(targetUserId);
  }
  await removeSiblingSession(currentUserId);
  return { error: null };
}

export async function refreshLinkedSibling(): Promise<LinkedSiblingProfile | null> {
  return fetchLinkedSiblingProfile();
}

export function notifyAccountSwitchSuccess(label: string) {
  if (Platform.OS !== 'android') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
  Alert.alert('Hesap değiştirildi', label);
}

export function notifyAccountSwitchUnavailable(accountType: 'personal' | 'business' = 'personal') {
  const hint =
    accountType === 'business'
      ? 'İşletme Paneli veya Ayarlar → Hesap bağlantısı bölümünden bireysel hesabınızı bağlayın.'
      : 'Ayarlar → İşletme Hesabını Bağla bölümünden işletme hesabınızı bağlayın.';
  Alert.alert('Hesap değişimi', `Bağlı hesap yok. ${hint}`);
}
