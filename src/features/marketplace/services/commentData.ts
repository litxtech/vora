import { mpSupabase } from '@/features/marketplace/services/mpSupabase';
import type { MarketplaceComment, MarketplaceCommentKind } from '@/features/marketplace/types';
import { supabaseErrorMessage } from '@/lib/errors';

type CommentRow = {
  id: string;
  listing_id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  media_urls?: string[];
  comment_kind?: string;
  created_at: string;
  profiles?: { full_name: string | null; username: string | null } | { full_name: string | null; username: string | null }[];
};

function mapComment(row: CommentRow, sellerId?: string): MarketplaceComment {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    listingId: row.listing_id,
    authorId: row.author_id,
    parentId: row.parent_id,
    body: row.body,
    mediaUrls: row.media_urls ?? [],
    commentKind: (row.comment_kind as MarketplaceCommentKind) ?? 'general',
    createdAt: row.created_at,
    authorName: profile?.full_name ?? null,
    authorUsername: profile?.username ?? null,
    isSeller: sellerId ? row.author_id === sellerId : false,
    replies: [],
  };
}

export async function fetchMarketplaceComments(
  listingId: string,
  sellerId?: string,
): Promise<MarketplaceComment[]> {
  const { data } = await mpSupabase
    .from('marketplace_comments')
    .select(`
      id, listing_id, author_id, parent_id, body, media_urls, comment_kind, created_at,
      profiles!marketplace_comments_author_id_fkey (full_name, username)
    `)
    .eq('listing_id', listingId)
    .eq('is_removed', false)
    .order('created_at', { ascending: true });

  const rows = (data as CommentRow[] | null) ?? [];
  const mapped = rows.map((row) => mapComment(row, sellerId));
  const topLevel = mapped.filter((c) => !c.parentId);
  const replies = mapped.filter((c) => c.parentId);

  for (const comment of topLevel) {
    comment.replies = replies.filter((r) => r.parentId === comment.id);
  }

  return topLevel;
}

export async function addMarketplaceComment(
  listingId: string,
  authorId: string,
  body: string,
  options?: {
    parentId?: string | null;
    mediaUrls?: string[];
    commentKind?: MarketplaceCommentKind;
  },
): Promise<{ error: string | null }> {
  const trimmed = body.trim();
  const mediaUrls = options?.mediaUrls ?? [];
  if (!trimmed && mediaUrls.length === 0) return { error: 'Yorum boş olamaz.' };

  const { error } = await mpSupabase.from('marketplace_comments').insert({
    listing_id: listingId,
    author_id: authorId,
    parent_id: options?.parentId ?? null,
    body: trimmed.slice(0, 2000) || (mediaUrls.length ? 'Medya paylaşımı' : ''),
    media_urls: mediaUrls,
    comment_kind: options?.commentKind ?? 'general',
  });

  return { error: supabaseErrorMessage(error) };
}
