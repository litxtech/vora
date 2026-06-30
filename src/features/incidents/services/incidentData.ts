import { getDemoIncidentThread } from '@/features/incidents/constants/demoIncidents';
import { incidentGraphDemoEnabled } from '@/features/incidents/constants';
import type { IncidentThread, IncidentUpdate, IncidentVerification } from '@/features/incidents/types';
import { AUTHOR_PROFILE_FIELDS } from '@/features/platform-charm/constants';
import { isDemoEntityId } from '@/lib/demo/demoData';
import { resolveAuthorGender, resolveHiddenBadges, resolvePlatformCharm } from '@/features/platform-charm/utils';
import { resolvePioneer } from '@/features/pioneer/utils';
import { resolvePlatformSupporter } from '@/features/platform-support/utils/resolvePlatformSupporter';
import type { FeedAuthor } from '@/features/feed/types';
import { supabase } from '@/lib/supabase/client';
import type { GenderId } from '@/constants/registration';
import type { UserRole } from '@/types/database';
import { supabaseErrorMessage } from '@/lib/errors';
import {
  isHiddenPublicAccount,
  sanitizeAvatarUrl,
  sanitizeDisplayName,
} from '@/features/account-deletion/utils';

type ProfileRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_verified: boolean;
  is_platform_charm?: boolean;
  is_pioneer?: boolean;
  is_platform_supporter?: boolean;
  gender?: GenderId | null;
  account_status?: FeedAuthor['accountStatus'];
  hidden_badges?: string[] | null;
};

function toAuthor(profile: ProfileRow | null, fallbackId: string): FeedAuthor {
  const accountStatus = profile?.account_status ?? 'active';
  return {
    id: profile?.id ?? fallbackId,
    username: profile?.username ?? 'kullanici',
    fullName: sanitizeDisplayName(profile?.full_name ?? null, profile?.username ?? null, accountStatus),
    avatarUrl: sanitizeAvatarUrl(profile?.avatar_url ?? null, accountStatus),
    role: profile?.role ?? 'user',
    isVerified: isHiddenPublicAccount(accountStatus) ? false : (profile?.is_verified ?? false),
    isPlatformCharm: resolvePlatformCharm(profile?.is_platform_charm, accountStatus),
    isPioneer: resolvePioneer(profile?.is_pioneer, accountStatus),
    isPlatformSupporter: resolvePlatformSupporter(profile?.is_platform_supporter, accountStatus),
    hiddenBadges: resolveHiddenBadges(profile?.hidden_badges, accountStatus),
    gender: resolveAuthorGender(profile?.gender, accountStatus),
    accountStatus,
  };
}

export async function fetchIncidentThread(id: string): Promise<IncidentThread | null> {
  if (isDemoEntityId(id)) {
    return incidentGraphDemoEnabled() ? getDemoIncidentThread(id) : null;
  }

  const { data: incident } = await supabase
    .from('incident_reports')
    .select(
      `id, title, description, severity, status, region_id, media_urls, latitude, longitude, created_at, reporter_id,
       profiles!incident_reports_reporter_id_fkey (${AUTHOR_PROFILE_FIELDS})`,
    )
    .eq('id', id)
    .maybeSingle();

  if (!incident) return null;

  type IncidentRow = {
    id: string;
    title: string;
    description: string;
    severity: string;
    status: string;
    region_id: string;
    media_urls: string[];
    latitude: number | null;
    longitude: number | null;
    created_at: string;
    reporter_id: string;
    profiles: ProfileRow | ProfileRow[] | null;
  };

  const inc = incident as unknown as IncidentRow;

  const [updatesRes, verificationsRes] = await Promise.all([
    supabase
      .from('incident_updates')
      .select(
        `id, incident_id, author_id, update_type, content, media_urls, created_at,
         profiles!incident_updates_author_id_fkey (${AUTHOR_PROFILE_FIELDS})`,
      )
      .eq('incident_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('incident_verifications')
      .select(
        `id, note, created_at,
         profiles!incident_verifications_verifier_id_fkey (${AUTHOR_PROFILE_FIELDS})`,
      )
      .eq('incident_id', id)
      .order('created_at', { ascending: false }),
  ]);

  const profile = inc.profiles;
  const reporterProfile = Array.isArray(profile) ? profile[0] : profile;

  type UpdateRow = {
    id: string;
    incident_id: string;
    author_id: string;
    update_type: IncidentUpdate['updateType'];
    content: string;
    media_urls: string[];
    created_at: string;
    profiles: ProfileRow | ProfileRow[] | null;
  };

  const updates: IncidentUpdate[] = ((updatesRes.data ?? []) as unknown as UpdateRow[]).map((row) => {
    const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      incidentId: row.incident_id,
      author: toAuthor(p, row.author_id),
      updateType: row.update_type,
      content: row.content,
      mediaUrls: row.media_urls ?? [],
      createdAt: row.created_at,
    };
  });

  if (updates.length === 0) {
    updates.push({
      id: 'initial',
      incidentId: id,
      author: toAuthor(reporterProfile, inc.reporter_id),
      updateType: 'initial',
      content: inc.description,
      mediaUrls: inc.media_urls ?? [],
      createdAt: inc.created_at,
    });
  }

  type VerificationRow = {
    id: string;
    note: string | null;
    created_at: string;
    profiles: ProfileRow | ProfileRow[] | null;
  };

  const verifications: IncidentVerification[] = (
    (verificationsRes.data ?? []) as unknown as VerificationRow[]
  ).map((row) => {
    const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      verifier: toAuthor(p, 'unknown'),
      note: row.note,
      createdAt: row.created_at,
    };
  });

  return {
    id: inc.id,
    title: inc.title,
    description: inc.description,
    severity: inc.severity,
    status: inc.status,
    regionId: inc.region_id,
    latitude: inc.latitude,
    longitude: inc.longitude,
    mediaUrls: inc.media_urls ?? [],
    reporter: toAuthor(reporterProfile, inc.reporter_id),
    createdAt: inc.created_at,
    updates,
    verifications,
    verificationCount: verifications.length,
  };
}

export type CreateIncidentInput = {
  title: string;
  description: string;
  regionId: string;
  severity: string;
  latitude?: number | null;
  longitude?: number | null;
  mediaUrls?: string[];
};

export async function createIncidentReport(
  input: CreateIncidentInput,
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('create_incident_report', {
    p_title: input.title.trim(),
    p_description: input.description.trim(),
    p_region_id: input.regionId,
    p_severity: input.severity,
    p_latitude: input.latitude ?? null,
    p_longitude: input.longitude ?? null,
    p_media_urls: input.mediaUrls ?? [],
  });
  return { id: (data as string | null) ?? null, error: supabaseErrorMessage(error) };
}

export async function deleteIncidentReport(
  incidentId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('delete_incident_report', {
    p_incident_id: incidentId,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function addIncidentUpdate(
  incidentId: string,
  authorId: string,
  content: string,
  updateType: IncidentUpdate['updateType'] = 'update',
  mediaUrls: string[] = [],
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('incident_updates').insert({
    incident_id: incidentId,
    author_id: authorId,
    content: content.trim(),
    update_type: updateType,
    media_urls: mediaUrls,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function verifyIncident(
  incidentId: string,
  verifierId: string,
  note?: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('incident_verifications').insert({
    incident_id: incidentId,
    verifier_id: verifierId,
    note: note ?? null,
  });
  return { error: supabaseErrorMessage(error) };
}
