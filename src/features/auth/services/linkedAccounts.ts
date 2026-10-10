import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import type { UserIdentity } from '@supabase/supabase-js';
import {
  buildLinkedProviderRows,
  canUnlinkIdentity,
  verifiedLoginLabels,
  type LinkableProviderId,
  type LinkedProviderRow,
  type LoginIdentity,
  type VerifiedLoginContext,
} from '@/features/auth/services/linkedLoginMethods';
import {
  establishOAuthSessionFromUrl,
  oauthRedirectUri,
  socialOAuthOptions,
  syncProviderProfile,
  type SocialAuthProvider,
} from '@/features/auth/services/oauthSignIn';
import { toUserFacingError } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';

export type LinkedLoginState = {
  identities: UserIdentity[];
  rows: LinkedProviderRow[];
  verifiedLabels: string[];
  context: VerifiedLoginContext;
};

export type LinkAccountResult =
  | { ok: true; pending?: boolean }
  | { ok: false; error: string | null; cancelled?: boolean };

const LAST_METHOD_MESSAGE =
  'Hesabınızda en az bir doğrulanmış giriş yöntemi kalmalıdır. Önce başka bir uygulama bağlayın veya e-postanızı doğrulayın.';

function mapLinkError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('manual linking')) {
    return 'Hesap bağlama kapalı. Supabase Authentication ayarlarında Manual Linking açılmalıdır.';
  }
  if (
    lower.includes('already') &&
    (lower.includes('link') || lower.includes('registered') || lower.includes('exist'))
  ) {
    return 'Bu hesap başka bir kullanıcıya bağlı veya zaten ekli.';
  }
  if (lower.includes('at least') || lower.includes('single identity') || lower.includes('last identity')) {
    return LAST_METHOD_MESSAGE;
  }
  return toUserFacingError(message, { fallback: 'Hesap bağlantısı tamamlanamadı.' });
}

function toLoginIdentity(identity: UserIdentity): LoginIdentity {
  const data = identity.identity_data;
  const email = typeof data?.email === 'string' ? data.email : null;
  return {
    identityId: identity.identity_id,
    provider: identity.provider,
    email,
    identityData: data ?? null,
  };
}

export async function fetchLinkedLoginState(
  providers: LinkableProviderId[],
): Promise<{ state: LinkedLoginState | null; error: string | null }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { state: null, error: mapLinkError(error?.message ?? 'Oturum bulunamadı.') };
  }

  const identities = data.user.identities ?? [];
  const context: VerifiedLoginContext = {
    emailConfirmedAt: data.user.email_confirmed_at,
    phoneConfirmedAt: data.user.phone_confirmed_at,
  };
  const loginIdentities = identities.map(toLoginIdentity);

  return {
    state: {
      identities,
      rows: buildLinkedProviderRows(providers, loginIdentities, context),
      verifiedLabels: verifiedLoginLabels(loginIdentities, context),
      context,
    },
    error: null,
  };
}

export async function linkSocialAccount(provider: SocialAuthProvider): Promise<LinkAccountResult> {
  const redirectTo = oauthRedirectUri('link');
  const { data, error } = await supabase.auth.linkIdentity({
    provider,
    options: socialOAuthOptions(provider, redirectTo),
  });

  if (error || !data.url) {
    return { ok: false, error: mapLinkError(error?.message ?? 'Bağlantı başlatılamadı.') };
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(data.url);
    return { ok: true, pending: true };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { ok: false, error: null, cancelled: true };
  }
  if (result.type !== 'success') {
    return { ok: false, error: 'Hesap bağlantısı tamamlanamadı.' };
  }

  const session = await establishOAuthSessionFromUrl(result.url, provider);
  if (!session.ok) return { ok: false, error: session.error };
  return { ok: true };
}

export async function linkAppleAccount(): Promise<LinkAccountResult> {
  if (Platform.OS !== 'ios') {
    return { ok: false, error: 'Apple hesabı yalnızca iOS cihazlarda bağlanabilir.' };
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

    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) return { ok: false, error: mapLinkError(error.message) };
    if (data.user) await syncProviderProfile(data.user);
    return { ok: true };
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
      fallback: 'Apple hesabı bağlanamadı.',
    });
    return { ok: false, error: message };
  }
}

export async function unlinkSocialAccount(
  identity: UserIdentity,
  identities: UserIdentity[],
  context: VerifiedLoginContext,
): Promise<LinkAccountResult> {
  const loginIdentities = identities.map(toLoginIdentity);
  if (!canUnlinkIdentity(identity.identity_id, loginIdentities, context)) {
    return { ok: false, error: LAST_METHOD_MESSAGE };
  }

  const { error } = await supabase.auth.unlinkIdentity(identity);
  if (error) return { ok: false, error: mapLinkError(error.message) };
  return { ok: true };
}
