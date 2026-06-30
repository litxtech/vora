import type {
  NewsVerificationNote,
  NewsVerificationSummary,
  NewsVerificationTarget,
  NewsVerificationVote,
} from '@/features/news-verification/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

function mapSummary(raw: Record<string, unknown>): NewsVerificationSummary {
  const status = raw.status as NewsVerificationSummary['status'];
  return {
    status: ['verified', 'misinfo', 'reviewing', 'none'].includes(status) ? status : 'none',
    correctCount: Number(raw.correct_count ?? 0),
    incorrectCount: Number(raw.incorrect_count ?? 0),
    unverifiedCount: Number(raw.unverified_count ?? 0),
    verifiedVotes: Number(raw.verified_votes ?? 0),
    misinfoVotes: Number(raw.misinfo_votes ?? 0),
    reviewingVotes: Number(raw.reviewing_votes ?? 0),
    latestNote: (raw.latest_note as string | null) ?? null,
    latestReporter: (raw.latest_reporter as string | null) ?? null,
  };
}

export async function fetchVerificationSummary(
  target: NewsVerificationTarget,
): Promise<NewsVerificationSummary> {
  if (target.id.startsWith('demo-')) {
    return {
      status: 'none',
      correctCount: 0,
      incorrectCount: 0,
      unverifiedCount: 0,
      verifiedVotes: 0,
      misinfoVotes: 0,
      reviewingVotes: 0,
      latestNote: null,
      latestReporter: null,
    };
  }

  const { data, error } = await supabase.rpc('get_content_verification_summary', {
    p_post_id: target.type === 'post' ? target.id : null,
    p_reel_id: target.type === 'reel' ? target.id : null,
  });

  if (error || !data) {
    return {
      status: 'none',
      correctCount: 0,
      incorrectCount: 0,
      unverifiedCount: 0,
      verifiedVotes: 0,
      misinfoVotes: 0,
      reviewingVotes: 0,
      latestNote: null,
      latestReporter: null,
    };
  }

  return mapSummary(data as Record<string, unknown>);
}

function mapVerificationNote(raw: Record<string, unknown>): NewsVerificationNote | null {
  const note = String(raw.note ?? '').trim();
  if (!note) return null;

  const result = raw.result as NewsVerificationVote;
  if (!['correct', 'incorrect', 'unverified'].includes(result)) return null;

  return {
    id: String(raw.id),
    reporterId: String(raw.reporter_id),
    result,
    note,
    createdAt: String(raw.created_at),
    username: String(raw.username ?? 'kullanici'),
    displayName: (raw.display_name as string | null) ?? null,
    avatarUrl: (raw.avatar_url as string | null) ?? null,
    role: String(raw.role ?? 'user'),
  };
}

export async function fetchVerificationNotes(
  target: NewsVerificationTarget,
): Promise<NewsVerificationNote[]> {
  if (target.id.startsWith('demo-')) return [];

  const { data, error } = await supabase.rpc('list_content_verification_notes', {
    p_post_id: target.type === 'post' ? target.id : null,
    p_reel_id: target.type === 'reel' ? target.id : null,
    p_limit: 30,
  });

  if (error || !Array.isArray(data)) return [];

  return data
    .map((row) => mapVerificationNote(row as Record<string, unknown>))
    .filter((row): row is NewsVerificationNote => row !== null);
}

export async function canUserVoteVerification(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabase.rpc('can_vote_verification', { p_user_id: userId });
  return Boolean(data);
}

function voteToCommunity(vote: NewsVerificationVote): 'verified' | 'misinfo' | 'reviewing' {
  if (vote === 'correct') return 'verified';
  if (vote === 'incorrect') return 'misinfo';
  return 'reviewing';
}

export async function submitVerification(
  target: NewsVerificationTarget,
  userId: string,
  vote: NewsVerificationVote,
  note: string | undefined,
  isReporter: boolean,
): Promise<{ ok: boolean; error: string | null }> {
  if (isReporter) {
    const { error } = await supabase.rpc('verify_content', {
      p_reporter_id: userId,
      p_result: vote,
      p_note: note?.trim() || null,
      p_post_id: target.type === 'post' ? target.id : null,
      p_reel_id: target.type === 'reel' ? target.id : null,
    });
    if (error) return { ok: false, error: supabaseErrorMessage(error)! };
    return { ok: true, error: null };
  }

  if (target.type !== 'post') {
    return { ok: false, error: 'Reel doğrulaması yalnızca muhabirler tarafından yapılabilir.' };
  }

  const { error } = await supabase.rpc('cast_verification_vote', {
    p_voter_id: userId,
    p_vote: voteToCommunity(vote),
    p_region_id: target.regionId,
    p_post_id: target.id,
  });

  if (error) return { ok: false, error: supabaseErrorMessage(error)! };
  return { ok: true, error: null };
}
