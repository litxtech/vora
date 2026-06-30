import type { VctsVerificationResult } from '@/features/vcts/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function verifyContentTrust(trustCode: string): Promise<VctsVerificationResult> {
  const { data, error } = await supabase.rpc('verify_content_trust', {
    p_trust_code: trustCode,
  });

  if (error) {
    return { found: false, status: 'not_found', message: supabaseErrorMessage(error) ?? 'Doğrulama yapılamadı.' };
  }

  const row = data as Record<string, unknown>;

  return {
    found: Boolean(row.found),
    status: (row.status as VctsVerificationResult['status']) ?? 'not_found',
    trustCode: row.trust_code as string | undefined,
    publisherKey: row.publisher_key as string | undefined,
    contentHash: row.content_hash as string | undefined,
    contentType: row.content_type as VctsVerificationResult['contentType'],
    hashMatch: row.hash_match as boolean | undefined,
    authorUsername: row.author_username as string | undefined,
    authorId: row.author_id as string | undefined,
    postId: row.post_id as string | undefined,
    createdAt: row.created_at as string | undefined,
    postCreatedAt: row.post_created_at as string | undefined,
    verified: row.verified as boolean | undefined,
    message: row.message as string | undefined,
  };
}

export async function fetchTrustRecordForPost(
  postId: string,
): Promise<{ trustCode: string; status: string } | null> {
  const { data } = await supabase
    .from('content_trust_records')
    .select('trust_code, status')
    .eq('post_id', postId)
    .maybeSingle();

  if (!data) return null;
  return {
    trustCode: data.trust_code as string,
    status: data.status as string,
  };
}

export async function fetchTrustRecordsForPosts(
  postIds: string[],
): Promise<Map<string, { trustCode: string; status: string }>> {
  const map = new Map<string, { trustCode: string; status: string }>();
  if (postIds.length === 0) return map;

  const { data } = await supabase
    .from('content_trust_records')
    .select('post_id, trust_code, status')
    .in('post_id', postIds);

  for (const row of data ?? []) {
    map.set(row.post_id as string, {
      trustCode: row.trust_code as string,
      status: row.status as string,
    });
  }
  return map;
}
