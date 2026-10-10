import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Provider, User } from '@supabase/supabase-js';
import { APP_SCHEME } from '@/constants/app';
import { buildPolicyConsents } from '@/constants/legal';
import { extractOAuthIdentity } from '@/features/auth/services/oauthIdentity';
import { resolvePostLoginAccess } from '@/features/auth/services/accountAccessReview';
import { presentAccountAccessReview } from '@/features/auth/services/postLoginNavigation';
import { clearSkipAutoGuest } from '@/features/auth/services/sessionPolicy';
import { normalizeEmailInput, validateEmail } from '@/features/auth/services/validation';
import { ensureCurrentUserProfile } from '@/features/profile/services/ensureProfile';
import { toUserFacingError } from '@/lib/errors';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

WebBrowser.maybeCompleteAuthSession();

export type SocialAuthProvider = 'google' | 'x' | 'twitch';

export type OAuthSignInResult =
  | {
      ok: true;
      pending: true;
    }
  | {
      ok: true;
      pending?: false;
      destination: '/(tabs)' | '/(onboarding)/profile-setup';
      userId: string;
      email: string | null;
    }
  | { ok: false; error: string | null; cancelled?: boolean; review?: boolean };

const PROVIDER_LABEL: Record<SocialAuthProvider, string> = {
  google: 'Google',
  x: 'X',
  twitch: 'Twitch',
};

const PROVIDER_SCOPES: Record<SocialAuthProvider, string> = {
  google: 'openid email profile',
  x: 'users.email tweet.read users.read offline.access',
  twitch: 'user:read:email',
};

function isEmptyPolicyConsents(value: unknown): boolean {
  if (!value || typeof value !== 'object') return true;
  return !('terms_accepted_at' in value);
}

export function oauthRedirectUri(mode?: 'link'): string {
  const base =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : Linking.createURL('auth/callback', { scheme: APP_SCHEME });
  if (!mode) return base;
  return `${base}${base.includes('?') ? '&' : '?'}mode=${mode}`;
}

function parseAuthCallbackParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const read = (segment: string) => {
    const search = new URLSearchParams(segment);
    search.forEach((value, key) => {
      if (value) params[key] = value;
    });
  };

  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  if (queryIndex >= 0) {
    const end = hashIndex > queryIndex ? hashIndex : url.length;
    read(url.slice(queryIndex + 1, end));
  }
  if (hashIndex >= 0) read(url.slice(hashIndex + 1));
  return params;
}

export function hasOAuthCallbackParams(url: string): boolean {
  const params = parseAuthCallbackParams(url);
  return Boolean(params.code || params.access_token || params.error || params.error_description);
}

export function isLinkOAuthCallback(url: string): boolean {
  return parseAuthCallbackParams(url).mode === 'link';
}

function mapOAuthError(message: string, provider?: SocialAuthProvider): string {
  const lower = message.toLowerCase();
  const label = provider ? PROVIDER_LABEL[provider] : 'Sosyal hesap';
  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider')) {
    return `${label} ile giriş şu anda kullanılamıyor.`;
  }
  if (lower.includes('redirect') && (lower.includes('not allowed') || lower.includes('invalid'))) {
    return 'Giriş yönlendirmesi tamamlanamadı. Lütfen tekrar deneyin.';
  }
  return toUserFacingError(message, {
    fallback: `${label} ile giriş sırasında bir hata oluştu.`,
  });
}

function usableEmail(value: string | null): string | null {
  if (!value) return null;
  const normalized = normalizeEmailInput(value);
  if (validateEmail(normalized)) return null;
  return normalized;
}

export async function syncProviderProfile(user: User): Promise<string | null> {
  const identity = extractOAuthIdentity(user);
  const email = usableEmail(identity.email);
  const metadata: Record<string, unknown> = {
    account_type: 'personal',
    policy_consents: buildPolicyConsents(),
  };

  if (identity.fullName) {
    metadata.full_name = identity.fullName;
    metadata.name = identity.fullName;
  }
  if (identity.firstName) metadata.first_name = identity.firstName;
  if (identity.lastName) metadata.last_name = identity.lastName;

  const currentEmail = usableEmail(user.email ?? null);
  const authPatch: { email?: string; data: Record<string, unknown> } = { data: metadata };
  if (!currentEmail && email) authPatch.email = email;
  const { error: authUpdateError } = await supabase.auth.updateUser(authPatch);
  if (authUpdateError && authPatch.email) {
    await supabase.auth.updateUser({ data: metadata });
  }

  await ensureCurrentUserProfile();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, first_name, last_name, avatar_url, policy_consents')
    .eq('id', user.id)
    .maybeSingle();

  const profilePatch: Database['public']['Tables']['profiles']['Update'] = {};
  if (!profile?.full_name && identity.fullName) profilePatch.full_name = identity.fullName;
  if (!profile?.first_name && identity.firstName) profilePatch.first_name = identity.firstName;
  if (!profile?.last_name && identity.lastName) profilePatch.last_name = identity.lastName;
  if (!profile?.avatar_url && identity.avatarUrl) profilePatch.avatar_url = identity.avatarUrl;
  if (isEmptyPolicyConsents(profile?.policy_consents)) {
    profilePatch.policy_consents = buildPolicyConsents();
  }

  if (Object.keys(profilePatch).length > 0) {
    await supabase.from('profiles').update(profilePatch).eq('id', user.id);
  }

  await supabase.auth.updateUser({ data: metadata });
  return currentEmail ?? email;
}

async function createSessionFromCallback(url: string): Promise<{ user: User } | { error: string }> {
  const params = parseAuthCallbackParams(url);
  if (params.error || params.error_description) {
    return { error: params.error_description || params.error || 'Giriş tamamlanamadı.' };
  }

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error || !data.user) return { error: error?.message ?? 'Oturum oluşturulamadı.' };
    return { user: data.user };
  }

  if (params.access_token && params.refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error || !data.user) return { error: error?.message ?? 'Oturum oluşturulamadı.' };
    return { user: data.user };
  }

  return { error: 'Giriş tamamlanamadı.' };
}

async function finalizeAuthSession(
  userId: string,
  email: string | null,
): Promise<OAuthSignInResult> {
  const access = await resolvePostLoginAccess(userId);
  if (access.action === 'continue') {
    return { ok: true, destination: access.destination, userId, email };
  }
  await presentAccountAccessReview(access);
  return { ok: false, error: null, review: true };
}

const completedCallbacks = new Set<string>();

export async function establishOAuthSessionFromUrl(
  url: string,
  provider?: SocialAuthProvider,
): Promise<{ ok: true; user: User; email: string | null } | { ok: false; error: string }> {
  if (completedCallbacks.has(url)) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { ok: false, error: 'Oturum oluşturulamadı.' };
    return { ok: true, user: data.user, email: usableEmail(data.user.email ?? null) };
  }

  const sessionResult = await createSessionFromCallback(url);
  if ('error' in sessionResult) {
    return { ok: false, error: mapOAuthError(sessionResult.error, provider) };
  }

  completedCallbacks.add(url);
  const { data: fresh } = await supabase.auth.getUser();
  const user = fresh.user ?? sessionResult.user;
  const email = await syncProviderProfile(user);
  return { ok: true, user, email };
}

export async function completeOAuthRedirect(
  url: string,
  provider?: SocialAuthProvider,
): Promise<OAuthSignInResult> {
  const session = await establishOAuthSessionFromUrl(url, provider);
  if (!session.ok) return { ok: false, error: session.error };
  await clearSkipAutoGuest();
  return finalizeAuthSession(session.user.id, session.email);
}

export function socialOAuthOptions(provider: SocialAuthProvider, redirectTo: string) {
  return {
    redirectTo,
    skipBrowserRedirect: true as const,
    scopes: PROVIDER_SCOPES[provider],
    queryParams: provider === 'google' ? { prompt: 'select_account' as const } : undefined,
  };
}

export async function signInWithSocialProvider(provider: SocialAuthProvider): Promise<OAuthSignInResult> {
  const redirectTo = oauthRedirectUri();
  const supabaseProvider = provider as Provider;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: supabaseProvider,
    options: socialOAuthOptions(provider, redirectTo),
  });

  if (error || !data.url) {
    return {
      ok: false,
      error: mapOAuthError(error?.message ?? 'Giriş başlatılamadı.', provider),
    };
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
    return {
      ok: false,
      error: `${PROVIDER_LABEL[provider]} ile giriş tamamlanamadı.`,
    };
  }

  return completeOAuthRedirect(result.url, provider);
}
