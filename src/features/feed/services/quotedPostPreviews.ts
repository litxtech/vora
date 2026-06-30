import {
  isHiddenPublicAccount,
  sanitizeAvatarUrl,
  sanitizeDisplayName,
} from '@/features/account-deletion/utils';
import { enrichQuotedPostPreviews } from '@/features/profile/services/businessIdentity';
import type { QuotedPostPreview } from '@/features/feed/types';
import { supabase } from '@/lib/supabase/client';

type QuotedPostRow = {
  id: string;
  title: string | null;
  content: string;
  media_urls: string[];
  created_at: string;
  author_id: string;
  profiles:
    | {
        id: string;
        username: string;
        full_name: string | null;
        avatar_url: string | null;
        is_verified: boolean;
        account_status?: string;
      }
    | {
        id: string;
        username: string;
        full_name: string | null;
        avatar_url: string | null;
        is_verified: boolean;
        account_status?: string;
      }[]
    | null;
};

function unwrapProfile<T>(profiles: T | T[] | null): T | null {
  if (!profiles) return null;
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles;
}

/** Alıntı gönderilerinde orijinal gönderi önizlemesini yükler. */
export async function fetchQuotedPreviews(
  quotedIds: string[],
): Promise<Map<string, QuotedPostPreview>> {
  const quoted = new Map<string, QuotedPostPreview>();
  const uniqueIds = [...new Set(quotedIds.filter(Boolean))];
  if (uniqueIds.length === 0) return quoted;

  const { data } = await supabase
    .from('posts')
    .select(
      `id, title, content, media_urls, created_at, author_id,
       profiles!posts_author_id_fkey (id, username, full_name, avatar_url, is_verified, account_status)`,
    )
    .in('id', uniqueIds);

  for (const row of (data ?? []) as unknown as QuotedPostRow[]) {
    const profile = unwrapProfile(row.profiles);
    const accountStatus = profile?.account_status ?? 'active';
    quoted.set(row.id, {
      id: row.id,
      authorId: profile?.id ?? row.author_id,
      authorUsername: profile?.username ?? 'kullanici',
      authorFullName: sanitizeDisplayName(
        profile?.full_name ?? null,
        profile?.username ?? null,
        accountStatus,
      ),
      authorAvatarUrl: sanitizeAvatarUrl(profile?.avatar_url ?? null, accountStatus),
      authorIsVerified: isHiddenPublicAccount(accountStatus) ? false : (profile?.is_verified ?? false),
      title: row.title,
      content: row.content,
      mediaUrls: row.media_urls ?? [],
      createdAt: row.created_at,
    });
  }

  return enrichQuotedPostPreviews(quoted);
}

export function resolveQuotedPost(
  quotedPostId: string | null | undefined,
  previews: Map<string, QuotedPostPreview>,
): QuotedPostPreview | null {
  if (!quotedPostId) return null;
  return previews.get(quotedPostId) ?? null;
}
