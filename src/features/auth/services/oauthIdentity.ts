export type OAuthIdentitySource = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  identities?: Array<{ identity_data?: Record<string, unknown> | null } | null> | null;
};

export type OAuthIdentityFields = {
  email: string | null;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
};

const EMAIL_KEYS = ['email', 'confirmed_email'];
const GIVEN_NAME_KEYS = ['given_name', 'first_name'];
const FAMILY_NAME_KEYS = ['family_name', 'last_name'];
const DISPLAY_NAME_KEYS = ['full_name', 'name', 'display_name'];
const HANDLE_KEYS = ['preferred_username', 'user_name', 'username', 'screen_name', 'login'];
const AVATAR_KEYS = ['avatar_url', 'picture', 'profile_image_url', 'profile_image_url_https'];

function readString(source: Record<string, unknown> | null | undefined, keys: string[]): string | null {
  if (!source) return null;
  for (const key of keys) {
    const value = source[key];
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function firstFromSources(sources: Record<string, unknown>[], keys: string[]): string | null {
  for (const source of sources) {
    const value = readString(source, keys);
    if (value) return value;
  }
  return null;
}

function splitDisplayName(displayName: string): { firstName: string; lastName: string | null } {
  const parts = displayName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: displayName, lastName: null };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: null };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(' ') };
}

function httpsUrl(value: string | null): string | null {
  if (!value) return null;
  if (!/^https:\/\//i.test(value)) return null;
  return value;
}

/** Sağlayıcının döndürdüğü kimlik alanları. Eksik alan uydurulmaz. */
export function extractOAuthIdentity(user: OAuthIdentitySource): OAuthIdentityFields {
  const sources: Record<string, unknown>[] = [];
  if (user.user_metadata) sources.push(user.user_metadata);
  for (const identity of user.identities ?? []) {
    if (identity?.identity_data) sources.push(identity.identity_data);
  }

  const providerEmail = firstFromSources(sources, EMAIL_KEYS);
  const accountEmail = user.email?.trim() || null;
  const givenName = firstFromSources(sources, GIVEN_NAME_KEYS);
  const familyName = firstFromSources(sources, FAMILY_NAME_KEYS);
  const displayName = firstFromSources(sources, DISPLAY_NAME_KEYS);
  const handle = firstFromSources(sources, HANDLE_KEYS);

  let fullName = displayName;
  let firstName = givenName;
  let lastName = familyName;

  if (!fullName && (firstName || lastName)) {
    fullName = [firstName, lastName].filter(Boolean).join(' ') || null;
  }

  if (fullName && !firstName) {
    const split = splitDisplayName(fullName);
    firstName = split.firstName;
    if (!lastName) lastName = split.lastName;
  }

  if (!fullName && handle) {
    fullName = handle;
    firstName = handle;
  }

  return {
    email: providerEmail ?? accountEmail,
    fullName,
    firstName,
    lastName,
    avatarUrl: httpsUrl(firstFromSources(sources, AVATAR_KEYS)),
  };
}
