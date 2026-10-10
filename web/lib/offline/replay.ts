import type { SupabaseClient } from '@supabase/supabase-js';
import { conflictCopy, stripSecrets } from '@/lib/offline/policy';

export const REPLAY_TYPES = ['like', 'unlike', 'save', 'unsave', 'comment', 'post'] as const;
export type ReplayType = (typeof REPLAY_TYPES)[number];

const ID_OK = /^[a-z0-9:_-]{8,120}$/i;
const UUID_OK = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ReplayOutcome = {
  status: 'confirmed' | 'retry' | 'failed';
  message?: string;
  permanent?: boolean;
  http: number;
};

function fail(message: string, http = 409): ReplayOutcome {
  return { status: 'failed', message, permanent: true, http };
}

function retry(message: string): ReplayOutcome {
  return { status: 'retry', message, http: 503 };
}

function ok(): ReplayOutcome {
  return { status: 'confirmed', http: 200 };
}

function missingTable(error: { code?: string; message?: string } | null): boolean {
  return error?.code === '42P01' || /offline_action_receipts/i.test(error?.message ?? '');
}

function gone(error: { code?: string } | null): boolean {
  return error?.code === '23503';
}

export function parseReplay(body: unknown): { id: string; type: ReplayType; payload: Record<string, unknown> } | ReplayOutcome {
  if (!body || typeof body !== 'object') return fail('İşlem okunamadı.', 400);
  const record = body as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : '';
  const type = typeof record.type === 'string' ? record.type : '';
  if (!ID_OK.test(id) || !REPLAY_TYPES.includes(type as ReplayType)) return fail('İşlem türü desteklenmiyor.', 400);
  const payload = stripSecrets((record.payload ?? {}) as Record<string, unknown>);
  if (JSON.stringify(payload).length > 8000) return fail('İşlem çok büyük.', 400);
  return { id, type: type as ReplayType, payload };
}

async function claim(
  supabase: SupabaseClient,
  id: string,
  userId: string,
  actionType: string,
): Promise<'go' | 'done' | ReplayOutcome> {
  const existing = await supabase
    .from('offline_action_receipts')
    .select('status, message, created_at')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (missingTable(existing.error)) return 'go';
  if (existing.error) return retry('Kayıt defteri okunamadı.');
  const row = existing.data as { status?: string; message?: string | null; created_at?: string } | null;
  if (row?.status === 'done') return 'done';
  if (row?.status === 'failed') return fail(row.message || conflictCopy());
  if (row?.status === 'pending') {
    const age = Date.now() - new Date(row.created_at ?? 0).getTime();
    if (age < 120_000) return retry('Bu işlem zaten gönderiliyor.');
    return 'go';
  }
  const inserted = await supabase.from('offline_action_receipts').insert({
    id,
    user_id: userId,
    action_type: actionType,
    status: 'pending',
  });
  if (missingTable(inserted.error)) return 'go';
  if (inserted.error?.code === '23505') return retry('Bu işlem zaten gönderiliyor.');
  if (inserted.error) return retry('Kayıt defteri yazılamadı.');
  return 'go';
}

async function finish(supabase: SupabaseClient, id: string, userId: string, status: 'done' | 'failed', message?: string) {
  await supabase.from('offline_action_receipts').update({ status, message: message ?? null }).eq('id', id).eq('user_id', userId);
}

async function release(supabase: SupabaseClient, id: string, userId: string) {
  await supabase.from('offline_action_receipts').delete().eq('id', id).eq('user_id', userId);
}

export async function applyReplay(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  type: ReplayType,
  payload: Record<string, unknown>,
): Promise<ReplayOutcome> {
  const gate = await claim(supabase, id, userId, type);
  if (gate === 'done') return ok();
  if (gate !== 'go') return gate;

  const postId = typeof payload.postId === 'string' ? payload.postId : '';
  if ((type === 'like' || type === 'unlike' || type === 'save' || type === 'unsave' || type === 'comment') && !UUID_OK.test(postId)) {
    await finish(supabase, id, userId, 'failed', 'Paylaşım kimliği geçersiz.');
    return fail('Paylaşım kimliği geçersiz.', 400);
  }

  let error: { code?: string; message?: string } | null = null;
  if (type === 'like' || type === 'unlike') {
    const query = supabase.from('post_likes');
    const result = type === 'like'
      ? await query.insert({ post_id: postId, user_id: userId })
      : await query.delete().eq('post_id', postId).eq('user_id', userId);
    error = result.error;
    if (error?.code === '23505') error = null;
  } else if (type === 'save' || type === 'unsave') {
    const query = supabase.from('post_saves');
    const result = type === 'save'
      ? await query.insert({ post_id: postId, user_id: userId })
      : await query.delete().eq('post_id', postId).eq('user_id', userId);
    error = result.error;
    if (error?.code === '23505') error = null;
  } else if (type === 'comment') {
    const content = typeof payload.content === 'string' ? payload.content.trim() : '';
    if (!content || content.length > 1000) {
      await finish(supabase, id, userId, 'failed', 'Yorum boş veya çok uzun.');
      return fail('Yorum boş veya çok uzun.', 400);
    }
    const result = await supabase.from('post_comments').insert({
      post_id: postId,
      author_id: userId,
      content,
      parent_id: null,
      media_urls: [],
    });
    error = result.error;
  } else {
    const content = typeof payload.content === 'string' ? payload.content.trim() : '';
    const regionId = typeof payload.regionId === 'string' ? payload.regionId.trim() : '';
    const audience = payload.audience === 'friends' ? 'friends' : 'public';
    if (!content || content.length > 4000 || !regionId) {
      await finish(supabase, id, userId, 'failed', 'Paylaşım metni ve şehir gerekli.');
      return fail('Paylaşım metni ve şehir gerekli.', 400);
    }
    const result = await supabase.from('posts').insert({
      author_id: userId,
      region_id: regionId,
      content,
      category: 'general',
      audience,
      status: 'published',
      requires_moderation: false,
    });
    error = result.error;
  }

  if (!error) {
    await finish(supabase, id, userId, 'done');
    return ok();
  }
  if (gone(error)) {
    await finish(supabase, id, userId, 'failed', conflictCopy());
    return fail(conflictCopy());
  }
  await release(supabase, id, userId);
  return retry('Sunucu işlemi tamamlayamadı. Tekrar denenecek.');
}
