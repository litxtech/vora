import type { ServiceReviewInput, ServiceReviewListing } from '@/features/vora-hizmetler/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import { updateServiceRequestStatus } from '@/features/vora-hizmetler/services/requestData';

function averageReviewScore(row: {
  quality: number;
  punctuality: number;
  cleanliness: number;
  value_for_money: number;
  communication: number;
}): number {
  return (
    (row.quality + row.punctuality + row.cleanliness + row.value_for_money + row.communication) / 5
  );
}

export async function fetchProviderReviews(
  providerId: string,
  limit = 30,
): Promise<{ reviews: ServiceReviewListing[]; error?: string }> {
  const { data, error } = await supabase
    .from('vora_service_reviews')
    .select(
      `
      id, quality, punctuality, cleanliness, value_for_money, communication,
      would_recommend, comment, created_at,
      profiles!vora_service_reviews_reviewer_id_fkey (full_name, avatar_url)
    `,
    )
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { reviews: [], error: supabaseErrorMessage(error) };

  return {
    reviews: (data ?? []).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.id,
        reviewerName: profile?.full_name?.trim() || 'Kullanıcı',
        reviewerAvatarUrl: profile?.avatar_url ?? null,
        overallRating: averageReviewScore(row),
        quality: row.quality,
        punctuality: row.punctuality,
        cleanliness: row.cleanliness,
        valueForMoney: row.value_for_money,
        communication: row.communication,
        wouldRecommend: row.would_recommend,
        comment: row.comment,
        createdAt: row.created_at,
      };
    }),
  };
}

export async function submitServiceReview(
  input: ServiceReviewInput,
): Promise<{ error?: string }> {
  const { data: requestRow, error: requestError } = await supabase
    .from('vora_service_requests')
    .select('accepted_provider_id')
    .eq('id', input.jobId)
    .single();

  if (requestError || !requestRow?.accepted_provider_id) {
    return { error: 'Değerlendirilecek iş bulunamadı.' };
  }

  const { error } = await supabase.from('vora_service_reviews').insert({
    request_id: input.jobId,
    reviewer_id: input.reviewerId,
    provider_id: requestRow.accepted_provider_id,
    quality: input.quality,
    punctuality: input.punctuality,
    cleanliness: input.cleanliness,
    value_for_money: input.valueForMoney,
    communication: input.communication,
    would_recommend: input.wouldRecommend,
    comment: input.comment?.trim() || null,
  });

  if (error) return { error: supabaseErrorMessage(error) };

  await updateServiceRequestStatus(input.jobId, 'rated');
  return {};
}

export async function fetchStatusLog(
  requestId: string,
): Promise<{ statuses: { status: string; createdAt: string }[]; error?: string }> {
  const { data, error } = await supabase
    .from('vora_service_status_log')
    .select('status, created_at')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (error) return { statuses: [], error: supabaseErrorMessage(error) };
  return {
    statuses: (data ?? []).map((row) => ({ status: row.status, createdAt: row.created_at })),
  };
}
