export type LoginIdentity = {
  identityId: string;
  provider: string;
  email?: string | null;
  identityData?: Record<string, unknown> | null;
};

export type VerifiedLoginContext = {
  emailConfirmedAt?: string | null;
  phoneConfirmedAt?: string | null;
};

export type LinkableProviderId = 'google' | 'x' | 'twitch' | 'apple';

export type LinkedProviderRow = {
  provider: LinkableProviderId;
  linked: boolean;
  identityId: string | null;
  detail: string | null;
  canUnlink: boolean;
};

const PROVIDER_LABELS: Record<string, string> = {
  email: 'E-posta',
  phone: 'Telefon',
  google: 'Google',
  x: 'X',
  twitter: 'X',
  twitch: 'Twitch',
  apple: 'Apple',
};

export function loginProviderLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

export function isVerifiedLoginIdentity(
  identity: LoginIdentity,
  context: VerifiedLoginContext,
): boolean {
  if (identity.provider === 'email') return Boolean(context.emailConfirmedAt);
  if (identity.provider === 'phone') return Boolean(context.phoneConfirmedAt);
  return true;
}

export function verifiedLoginIdentities(
  identities: LoginIdentity[],
  context: VerifiedLoginContext,
): LoginIdentity[] {
  return identities.filter((identity) => isVerifiedLoginIdentity(identity, context));
}

export function verifiedLoginLabels(identities: LoginIdentity[], context: VerifiedLoginContext): string[] {
  const labels: string[] = [];
  for (const identity of verifiedLoginIdentities(identities, context)) {
    const label = loginProviderLabel(identity.provider);
    if (!labels.includes(label)) labels.push(label);
  }
  return labels;
}

export function canUnlinkIdentity(
  identityId: string,
  identities: LoginIdentity[],
  context: VerifiedLoginContext,
): boolean {
  const remaining = identities.filter((identity) => identity.identityId !== identityId);
  return verifiedLoginIdentities(remaining, context).length >= 1;
}

function readString(data: Record<string, unknown> | null | undefined, keys: string[]): string | null {
  if (!data) return null;
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

export function describeLoginIdentity(identity: LoginIdentity): string | null {
  const email = identity.email?.trim() || readString(identity.identityData, ['email', 'confirmed_email']);
  if (email) return email;
  const handle = readString(identity.identityData, [
    'preferred_username',
    'user_name',
    'username',
    'screen_name',
    'login',
  ]);
  if (!handle) return null;
  return handle.startsWith('@') ? handle : `@${handle}`;
}

function providerAliases(provider: LinkableProviderId): string[] {
  if (provider === 'x') return ['x', 'twitter'];
  return [provider];
}

export function buildLinkedProviderRows(
  providers: LinkableProviderId[],
  identities: LoginIdentity[],
  context: VerifiedLoginContext,
): LinkedProviderRow[] {
  return providers.map((provider) => {
    const match = identities.find((identity) => providerAliases(provider).includes(identity.provider));
    return {
      provider,
      linked: Boolean(match),
      identityId: match?.identityId ?? null,
      detail: match ? describeLoginIdentity(match) : null,
      canUnlink: match ? canUnlinkIdentity(match.identityId, identities, context) : false,
    };
  });
}
