import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { buildPolicyConsents } from '@/constants/legal';
import { clearSkipAutoGuest } from '@/features/auth/services/sessionPolicy';
import { resolvePostLoginAccess } from '@/features/auth/services/accountAccessReview';
import { presentAccountAccessReview } from '@/features/auth/services/postLoginNavigation';
import { supabase } from '@/lib/supabase/client';
import { toUserFacingError } from '@/lib/errors';
import type { Database } from '@/types/database';

export type AppleSignInResult =
  | { ok: true; destination: '/(tabs)' | '/(onboarding)/profile-setup' }
  | { ok: false; error: string | null; cancelled?: boolean; review?: boolean };

function isEmptyPolicyConsents(value: unknown): boolean {
  if (!value || typeof value !== 'object') return true;
  return !('terms_accepted_at' in value);
}

async function applyAppleProfileUpdates(
  userId: string,
  fullName: AppleAuthentication.AppleAuthenticationFullName | null,
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, first_name, last_name, policy_consents')
    .eq('id', userId)
    .maybeSingle();

  const profilePatch: Database['public']['Tables']['profiles']['Update'] = {};

  if (fullName) {
    const firstName = fullName.givenName?.trim() ?? '';
    const lastName = fullName.familyName?.trim() ?? '';
    const composedName = [fullName.givenName, fullName.middleName, fullName.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (!profile?.full_name && composedName) profilePatch.full_name = composedName;
    if (!profile?.first_name && firstName) profilePatch.first_name = firstName;
    if (!profile?.last_name && lastName) profilePatch.last_name = lastName;
  }

  if (isEmptyPolicyConsents(profile?.policy_consents)) {
    profilePatch.policy_consents = buildPolicyConsents();
  }

  if (Object.keys(profilePatch).length === 0) return;

  await supabase.from('profiles').update(profilePatch).eq('id', userId);
}

async function syncAppleUserMetadata(
  fullName: AppleAuthentication.AppleAuthenticationFullName | null,
): Promise<void> {
  const metadataPatch: Record<string, unknown> = {
    account_type: 'personal',
  };

  if (fullName) {
    const composedName = [fullName.givenName, fullName.middleName, fullName.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (composedName) metadataPatch.full_name = composedName;
    if (fullName.givenName) {
      metadataPatch.given_name = fullName.givenName;
      metadataPatch.first_name = fullName.givenName;
    }
    if (fullName.familyName) {
      metadataPatch.family_name = fullName.familyName;
      metadataPatch.last_name = fullName.familyName;
    }
  }

  metadataPatch.policy_consents = buildPolicyConsents();
  await supabase.auth.updateUser({ data: metadataPatch });
}

async function finalizeAuthSession(userId: string): Promise<AppleSignInResult> {
  const access = await resolvePostLoginAccess(userId);

  if (access.action === 'continue') {
    return { ok: true, destination: access.destination };
  }

  await presentAccountAccessReview(access);
  return { ok: false, error: null, review: true };
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

export async function signInWithApple(): Promise<AppleSignInResult> {
  if (Platform.OS !== 'ios') {
    return { ok: false, error: 'Apple ile giriş yalnızca iOS cihazlarda kullanılabilir.' };
  }

  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    return { ok: false, error: 'Bu cihazda Apple ile giriş kullanılamıyor.' };
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { ok: false, error: 'Apple kimlik doğrulaması tamamlanamadı.' };
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (authError) {
      return { ok: false, error: authError.message };
    }

    const userId = authData.user?.id;
    if (!userId) {
      return { ok: false, error: 'Oturum oluşturulamadı.' };
    }

    if (credential.fullName) {
      await syncAppleUserMetadata(credential.fullName);
    }

    await applyAppleProfileUpdates(userId, credential.fullName);
    await clearSkipAutoGuest();

    return finalizeAuthSession(userId);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ERR_REQUEST_CANCELED'
    ) {
      return { ok: false, error: null, cancelled: true };
    }

    const message = toUserFacingError(error instanceof Error ? error.message : null, {
      fallback: 'Apple ile giriş sırasında bir hata oluştu.',
    });
    return { ok: false, error: message };
  }
}
