import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type ReporterApplicationRow = {
  id: string;
  user_id: string;
  username: string;
  full_name: string | null;
  motivation: string;
  experience: string | null;
  region_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export async function fetchReporterApplications(
  status: 'pending' | 'approved' | 'rejected' = 'pending',
): Promise<ReporterApplicationRow[]> {
  const { data, error } = await supabase.rpc('admin_list_reporter_applications', {
    p_status: status,
    p_limit: 50,
  });
  if (error || !data) return [];
  return data as ReporterApplicationRow[];
}

export async function reviewReporterApplication(
  applicationId: string,
  reviewerId: string,
  approve: boolean,
  note?: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('review_reporter_application', {
    p_application_id: applicationId,
    p_reviewer_id: reviewerId,
    p_approve: approve,
    p_note: note ?? null,
  });
  return { error: supabaseErrorMessage(error) };
}

export type NewsVerificationRow = {
  id: string;
  post_id: string | null;
  reel_id: string | null;
  reporter_id: string;
  reporter_username: string;
  author_id: string | null;
  author_username: string | null;
  content_type: 'post' | 'reel' | null;
  content_snippet: string | null;
  result: 'correct' | 'incorrect' | 'unverified';
  note: string | null;
  score_delta: number;
  content_correct_count: number;
  content_incorrect_count: number;
  created_at: string;
};

export async function fetchNewsVerifications(): Promise<NewsVerificationRow[]> {
  const { data, error } = await supabase.rpc('admin_list_news_verifications', { p_limit: 50 });
  if (error || !data) return [];
  return data as NewsVerificationRow[];
}
