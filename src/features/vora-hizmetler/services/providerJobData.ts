import type { ServiceRequestListing } from '@/features/vora-hizmetler/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

const ACTIVE_STATUSES = ['offer_accepted', 'en_route', 'in_progress'] as const;
const HISTORY_STATUSES = ['completed', 'rated', 'cancelled'] as const;

type RequestRow = {
  id: string;
  requester_id: string;
  region_id: string | null;
  city: string | null;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  budget_min: number | null;
  budget_max: number | null;
  image_urls: string[];
  completion_proof_image_url: string | null;
  completion_proof_video_url: string | null;
  completion_proof_submitted_at: string | null;
  latitude: number | null;
  longitude: number | null;
  offer_count: number;
  is_emergency: boolean;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
};

const PROVIDER_JOB_SELECT = `
  id, requester_id, region_id, city, title, description, category, urgency, status,
  budget_min, budget_max, image_urls,
  completion_proof_image_url, completion_proof_video_url, completion_proof_submitted_at,
  latitude, longitude, offer_count, is_emergency,
  created_at, updated_at,
  profiles!vora_service_requests_requester_id_fkey (full_name, avatar_url)
`;

function mapRow(row: RequestRow): ServiceRequestListing {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    requesterId: row.requester_id,
    requesterName: profile?.full_name ?? null,
    requesterAvatar: profile?.avatar_url ?? null,
    regionId: row.region_id,
    city: row.city,
    title: row.title,
    description: row.description,
    category: row.category as ServiceRequestListing['category'],
    urgency: row.urgency as ServiceRequestListing['urgency'],
    status: row.status as ServiceRequestListing['status'],
    budgetMin: row.budget_min,
    budgetMax: row.budget_max,
    imageUrls: row.image_urls ?? [],
    completionProof: {
      imageUrl: row.completion_proof_image_url ?? null,
      videoUrl: row.completion_proof_video_url ?? null,
      submittedAt: row.completion_proof_submitted_at ?? null,
    },
    latitude: row.latitude,
    longitude: row.longitude,
    offerCount: row.offer_count,
    isEmergency: row.is_emergency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchProviderActiveJobs(
  providerId: string,
): Promise<{ listings: ServiceRequestListing[]; error?: string }> {
  const { data, error } = await supabase
    .from('vora_service_requests')
    .select(PROVIDER_JOB_SELECT)
    .eq('accepted_provider_id', providerId)
    .in('status', [...ACTIVE_STATUSES])
    .order('updated_at', { ascending: false })
    .limit(30);

  if (error) return { listings: [], error: supabaseErrorMessage(error) };
  return { listings: (data as RequestRow[]).map(mapRow) };
}

export async function fetchProviderJobHistory(
  providerId: string,
): Promise<{ listings: ServiceRequestListing[]; error?: string }> {
  const { data, error } = await supabase
    .from('vora_service_requests')
    .select(PROVIDER_JOB_SELECT)
    .eq('accepted_provider_id', providerId)
    .in('status', [...HISTORY_STATUSES])
    .order('updated_at', { ascending: false })
    .limit(30);

  if (error) return { listings: [], error: supabaseErrorMessage(error) };
  return { listings: (data as RequestRow[]).map(mapRow) };
}

export async function advanceProviderJobStatus(
  requestId: string,
  nextStatus: 'in_progress',
): Promise<{ error?: string }> {
  const { data, error } = await supabase.rpc('advance_vora_service_job_status', {
    p_request_id: requestId,
    p_next_status: nextStatus,
  });

  if (error) return { error: supabaseErrorMessage(error) };
  const result = data as { ok?: boolean; error?: string } | null;
  if (result?.error) return { error: result.error };
  if (!result?.ok) return { error: 'Durum güncellenemedi.' };
  return {};
}
