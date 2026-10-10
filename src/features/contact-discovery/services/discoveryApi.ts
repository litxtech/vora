import type { Json } from '@/types/database';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import { assertAuthenticatedMatch, chunkList, mergeMatches } from '@/features/contact-discovery/services/policy';
import type { ContactBookUpload, NamedContactUpload } from '@/features/contact-discovery/services/normalizePhone';
import type { ContactMatch } from '@/features/contact-discovery/types';

const MATCH_FALLBACK = 'Eşleştirme tamamlanamadı. Bağlantını kontrol edip tekrar deneyebilirsin.';

type MatchRow = {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  viewer_follows: boolean;
  follows_viewer: boolean;
  is_friend: boolean;
  matched_e164?: string | null;
};

export type AdminContactCountry = {
  countryIso2: string | null;
  entryCount: number;
};

export type AdminContactEntry = {
  id: string;
  rawPhone: string;
  e164: string | null;
  countryIso2: string | null;
  ownerId: string;
  ownerUsername: string;
  updatedAt: string;
};

export type AdminContactOwner = {
  ownerId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  entryCount: number;
  updatedAt: string;
};

export type AdminOwnerContact = {
  id: string;
  displayName: string | null;
  rawPhone: string;
  e164: string | null;
  countryIso2: string | null;
  updatedAt: string;
};

function mapMatch(row: MatchRow): ContactMatch {
  return {
    userId: row.user_id,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    isVerified: row.is_verified,
    viewerFollows: row.viewer_follows,
    followsViewer: row.follows_viewer,
    isFriend: row.is_friend,
    matchedE164: row.matched_e164 ?? null,
  };
}

export async function matchDiscoveryPhones(input: {
  userId: string | null;
  isGuest: boolean;
  entries: ContactBookUpload[];
}): Promise<{ matches: ContactMatch[]; byPhone: Map<string, ContactMatch>; error: string | null }> {
  const authError = assertAuthenticatedMatch(input);
  if (authError) return { matches: [], byPhone: new Map(), error: authError };
  if (input.entries.length === 0) return { matches: [], byPhone: new Map(), error: null };

  const groups: ContactMatch[][] = [];
  for (const batch of chunkList(input.entries)) {
    const { data, error } = await supabase.rpc('match_contact_discovery', {
      p_entries: batch as unknown as Json,
    });
    if (error) {
      return {
        matches: mergeMatches(groups),
        byPhone: indexMatchesByPhone(groups),
        error: supabaseErrorMessage(error, MATCH_FALLBACK),
      };
    }
    groups.push((data ?? []).map(mapMatch));
  }

  return { matches: mergeMatches(groups), byPhone: indexMatchesByPhone(groups), error: null };
}

function indexMatchesByPhone(groups: readonly ContactMatch[][]): Map<string, ContactMatch> {
  const byPhone = new Map<string, ContactMatch>();
  for (const group of groups) {
    for (const match of group) {
      if (match.matchedE164 && !byPhone.has(match.matchedE164)) byPhone.set(match.matchedE164, match);
    }
  }
  return byPhone;
}

export async function syncContactBook(input: {
  userId: string | null;
  isGuest: boolean;
  entries: NamedContactUpload[];
}): Promise<{ saved: number; error: string | null }> {
  const authError = assertAuthenticatedMatch(input);
  if (authError) return { saved: 0, error: authError };
  if (input.entries.length === 0) return { saved: 0, error: null };

  let saved = 0;
  for (const batch of chunkList(input.entries)) {
    const { data, error } = await supabase.rpc('sync_contact_book', {
      p_entries: batch as unknown as Json,
    });
    if (error) {
      return { saved, error: supabaseErrorMessage(error, 'Rehber kaydedilemedi.') };
    }
    saved += typeof data === 'number' ? data : 0;
  }

  return { saved, error: null };
}

export async function fetchAdminContactCountries(): Promise<{
  countries: AdminContactCountry[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('admin_contact_book_countries');
  if (error) {
    return { countries: [], error: supabaseErrorMessage(error, 'Rehber ülkeleri alınamadı.') };
  }
  return {
    countries: (data ?? []).map((row) => ({
      countryIso2: row.country_iso2,
      entryCount: row.entry_count,
    })),
    error: null,
  };
}

export async function fetchAdminContactOwners(): Promise<{
  owners: AdminContactOwner[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('admin_contact_book_owners');
  if (error) {
    return { owners: [], error: supabaseErrorMessage(error, 'Rehber sahipleri alınamadı.') };
  }
  return {
    owners: (data ?? []).map((row) => ({
      ownerId: row.owner_id,
      username: row.owner_username,
      fullName: row.owner_full_name,
      avatarUrl: row.owner_avatar_url,
      entryCount: row.entry_count,
      updatedAt: row.updated_at,
    })),
    error: null,
  };
}

export async function fetchAdminOwnerContactBook(
  ownerId: string,
  offset = 0,
): Promise<{ entries: AdminOwnerContact[]; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_list_owner_contact_book', {
    p_owner_id: ownerId,
    p_limit: 400,
    p_offset: offset,
  });
  if (error) {
    return { entries: [], error: supabaseErrorMessage(error, 'Bu kullanıcının rehberi alınamadı.') };
  }
  return {
    entries: (data ?? []).map((row) => ({
      id: row.id,
      displayName: row.display_name,
      rawPhone: row.raw_phone,
      e164: row.e164,
      countryIso2: row.country_iso2,
      updatedAt: row.updated_at,
    })),
    error: null,
  };
}

export async function fetchAdminContactBook(countryIso2: string | null): Promise<{
  entries: AdminContactEntry[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('admin_list_contact_book', {
    p_country: countryIso2 ?? 'UNKNOWN',
    p_limit: 300,
    p_offset: 0,
  });
  if (error) {
    return { entries: [], error: supabaseErrorMessage(error, 'Rehber listesi alınamadı.') };
  }
  return {
    entries: (data ?? []).map((row) => ({
      id: row.id,
      rawPhone: row.raw_phone,
      e164: row.e164,
      countryIso2: row.country_iso2,
      ownerId: row.owner_id,
      ownerUsername: row.owner_username,
      updatedAt: row.updated_at,
    })),
    error: null,
  };
}
