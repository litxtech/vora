import { scanContent } from '@/features/moderation/services/contentFilter';
import { supabase } from '@/lib/supabase/client';

export type AiModerationResult = {
  allowed: boolean;
  requiresReview: boolean;
  flags: string[];
  score: number;
  reason: string | null;
  provider: string;
};

export async function moderateContentRemote(
  text: string,
  options?: { targetType?: string; targetId?: string },
): Promise<AiModerationResult> {
  const local = scanContent(text);

  try {
    const { data, error } = await supabase.functions.invoke('moderate-content', {
      body: {
        text,
        target_type: options?.targetType,
        target_id: options?.targetId,
      },
    });

    if (error || !data) {
      return {
        allowed: local.allowed,
        requiresReview: local.flags.includes('suspicious'),
        flags: local.flags,
        score: local.flags.length ? 0.5 : 0,
        reason: local.reason,
        provider: 'local',
      };
    }

    const remote = data as {
      allowed: boolean;
      requires_review: boolean;
      flags: string[];
      score: number;
      reason: string | null;
      provider: string;
    };

    return {
      allowed: remote.allowed,
      requiresReview: remote.requires_review,
      flags: remote.flags ?? [],
      score: remote.score ?? 0,
      reason: remote.reason,
      provider: remote.provider ?? 'edge',
    };
  } catch {
    return {
      allowed: local.allowed,
      requiresReview: local.flags.includes('suspicious'),
      flags: local.flags,
      score: 0,
      reason: local.reason,
      provider: 'local',
    };
  }
}
