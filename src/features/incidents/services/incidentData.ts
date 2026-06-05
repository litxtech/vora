import type { IncidentThread, IncidentUpdate, IncidentVerification } from '@/features/incidents/types';
import type { FeedAuthor } from '@/features/feed/types';
import { findDemoMarker } from '@/features/map/constants';
import { supabase } from '@/lib/supabase/client';
import type { UserRole } from '@/types/database';

type ProfileRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_verified: boolean;
};

function toAuthor(profile: ProfileRow | null, fallbackId: string): FeedAuthor {
  return {
    id: profile?.id ?? fallbackId,
    username: profile?.username ?? 'kullanici',
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    role: profile?.role ?? 'user',
    isVerified: profile?.is_verified ?? false,
  };
}

function demoThread(id: string): IncidentThread | null {
  const demo = findDemoMarker(id);
  if (!demo) return null;

  const reporter: FeedAuthor = {
    id: 'demo-reporter',
    username: 'trabzonhaber',
    fullName: 'Trabzon Haber',
    avatarUrl: null,
    role: 'verified_reporter',
    isVerified: true,
  };

  return {
    id,
    title: demo.title,
    description: demo.description ?? '',
    severity: String(demo.meta?.severity ?? 'medium'),
    status: 'open',
    regionId: 'trabzon',
    latitude: demo.latitude,
    longitude: demo.longitude,
    mediaUrls: [],
    reporter,
    createdAt: demo.createdAt ?? new Date().toISOString(),
    isDemo: true,
    verificationCount: 2,
    updates: [
      {
        id: 'demo-update-1',
        incidentId: id,
        author: reporter,
        updateType: 'initial',
        content: demo.description ?? demo.title,
        mediaUrls: [],
        createdAt: demo.createdAt ?? new Date().toISOString(),
      },
      {
        id: 'demo-update-2',
        incidentId: id,
        author: {
          id: 'demo-user-1',
          username: 'ahmet_k',
          fullName: 'Ahmet K.',
          avatarUrl: null,
          role: 'user',
          isVerified: false,
        },
        updateType: 'update',
        content: 'Olay yerinden: ekipler trafiği yönlendiriyor, ambulans geldi.',
        mediaUrls: [],
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      },
    ],
    verifications: [
      {
        id: 'demo-v1',
        verifier: reporter,
        note: 'Olay yeri doğrulandı.',
        createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      },
    ],
  };
}

export async function fetchIncidentThread(id: string, isDemo = false): Promise<IncidentThread | null> {
  if (isDemo || id.startsWith('demo-')) return demoThread(id);

  const { data: incident } = await supabase
    .from('incident_reports')
    .select(
      `id, title, description, severity, status, region_id, media_urls, latitude, longitude, created_at, reporter_id,
       profiles!incident_reports_reporter_id_fkey (id, username, full_name, avatar_url, role, is_verified)`,
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
         profiles!incident_updates_author_id_fkey (id, username, full_name, avatar_url, role, is_verified)`,
      )
      .eq('incident_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('incident_verifications')
      .select(
        `id, note, created_at,
         profiles!incident_verifications_verifier_id_fkey (id, username, full_name, avatar_url, role, is_verified)`,
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
  return { error: error?.message ?? null };
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
  return { error: error?.message ?? null };
}
