import type { NewsVerificationResult, ReporterApplication, ReporterLevelProgress } from '@/features/reporter/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function fetchMyReporterApplication(
  userId: string,
): Promise<ReporterApplication | null> {
  const { data } = await supabase
    .from('reporter_applications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    motivation: data.motivation,
    experience: data.experience,
    sampleLinks: data.sample_links ?? [],
    regionId: data.region_id,
    status: data.status,
    reviewNote: data.review_note,
    createdAt: data.created_at,
    reviewedAt: data.reviewed_at,
  };
}

export async function submitReporterApplication(
  userId: string,
  input: { motivation: string; experience: string; regionId: string | null },
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.from('reporter_applications').insert({
    user_id: userId,
    motivation: input.motivation,
    experience: input.experience || null,
    region_id: input.regionId,
  });

  if (error) return { ok: false, error: supabaseErrorMessage(error)! };
  return { ok: true, error: null };
}

export async function fetchReporterLevelProgress(userId: string): Promise<ReporterLevelProgress | null> {
  const { data, error } = await supabase.rpc('get_reporter_level_progress', {
    p_user_id: userId,
  });

  if (error || !data || typeof data !== 'object') {
    return null;
  }

  const row = data as Record<string, unknown>;
  return {
    level: Number(row.level ?? 1),
    correctVerifications: Number(row.correct_verifications ?? 0),
    trustScore: Number(row.trust_score ?? 0),
    isReporter: Boolean(row.is_reporter),
    maxLevel: Boolean(row.max_level),
    nextLevel: row.next_level != null ? Number(row.next_level) : null,
    nextLevelCorrect: row.next_level_correct != null ? Number(row.next_level_correct) : null,
    nextLevelTrust: row.next_level_trust != null ? Number(row.next_level_trust) : null,
  };
}

export async function verifyNewsPost(
  postId: string,
  reporterId: string,
  result: NewsVerificationResult,
  note?: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.rpc('verify_news_post', {
    p_post_id: postId,
    p_reporter_id: reporterId,
    p_result: result,
    p_note: note ?? null,
  });

  if (error) return { ok: false, error: supabaseErrorMessage(error)! };
  return { ok: true, error: null };
}
