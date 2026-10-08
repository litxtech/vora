'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSessionClient } from '@/lib/supabase';

async function actorId(): Promise<string | null> {
  const supabase = await createSessionClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function createPost(formData: FormData): Promise<void> {
  const userId = await actorId();
  if (!userId) redirect('/login');
  const content = String(formData.get('content') ?? '').trim();
  const regionId = String(formData.get('region_id') ?? '').trim();
  const audience = String(formData.get('audience') ?? 'public');
  if (!content || !regionId) redirect('/app/compose?error=1');
  const supabase = await createSessionClient();
  if (!supabase) redirect('/app/compose?error=1');
  const { error } = await supabase.from('posts').insert({
    author_id: userId,
    region_id: regionId,
    content,
    category: 'general',
    audience: audience === 'friends' ? 'friends' : 'public',
    status: 'published',
    requires_moderation: false,
  });
  if (error) redirect('/app/compose?error=1');
  revalidatePath('/app');
  redirect('/app');
}

export async function likePost(formData: FormData): Promise<void> {
  const userId = await actorId();
  if (!userId) redirect('/login');
  const postId = String(formData.get('post_id') ?? '');
  if (!postId) return;
  const supabase = await createSessionClient();
  if (!supabase) return;
  const { data: existing } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) {
    await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
  } else {
    await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
  }
  revalidatePath('/app');
  revalidatePath(`/p/${postId}`);
}

export async function addComment(formData: FormData): Promise<void> {
  const userId = await actorId();
  if (!userId) redirect('/login');
  const postId = String(formData.get('post_id') ?? '');
  const content = String(formData.get('content') ?? '').trim();
  if (!postId || !content) return;
  const supabase = await createSessionClient();
  if (!supabase) return;
  await supabase.from('post_comments').insert({
    post_id: postId,
    author_id: userId,
    content,
    parent_id: null,
    media_urls: [],
  });
  revalidatePath(`/p/${postId}`);
  revalidatePath('/app');
}

export async function sendChat(formData: FormData): Promise<void> {
  const userId = await actorId();
  if (!userId) redirect('/login');
  const conversationId = String(formData.get('conversation_id') ?? '');
  const content = String(formData.get('content') ?? '').trim();
  if (!conversationId || !content) return;
  const supabase = await createSessionClient();
  if (!supabase) return;
  await supabase.rpc('send_message', {
    p_conversation_id: conversationId,
    p_content: content,
    p_message_type: 'text',
    p_media_url: null,
    p_reply_to_id: null,
    p_forwarded_from_id: null,
    p_metadata: null,
  });
  revalidatePath(`/app/messages/${conversationId}`);
}

export async function startChat(formData: FormData): Promise<void> {
  const userId = await actorId();
  if (!userId) redirect('/login');
  const otherId = String(formData.get('user_id') ?? '');
  if (!otherId || otherId === userId) return;
  const supabase = await createSessionClient();
  if (!supabase) return;
  const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
    p_other_user_id: otherId,
  });
  if (error || !data) redirect('/app/messages?error=1');
  const row = Array.isArray(data) ? data[0] : data;
  const id = typeof row === 'string' ? row : (row as { id?: string; conversation_id?: string })?.id ?? (row as { conversation_id?: string })?.conversation_id;
  if (!id) redirect('/app/messages?error=1');
  redirect(`/app/messages/${id}`);
}

export async function updateProfile(formData: FormData): Promise<void> {
  const userId = await actorId();
  if (!userId) redirect('/login');
  const fullName = String(formData.get('full_name') ?? '').trim();
  const bio = String(formData.get('bio') ?? '').trim();
  const regionId = String(formData.get('region_id') ?? '').trim();
  const supabase = await createSessionClient();
  if (!supabase) redirect('/app/profile?error=1');
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName || null,
      bio: bio || null,
      ...(regionId ? { region_id: regionId } : {}),
    })
    .eq('id', userId);
  if (error) redirect('/app/profile?error=1');
  revalidatePath('/app/profile');
  redirect('/app/profile?saved=1');
}

export async function markNotificationRead(formData: FormData): Promise<void> {
  const userId = await actorId();
  if (!userId) redirect('/login');
  const id = String(formData.get('id') ?? '');
  const supabase = await createSessionClient();
  if (!supabase || !id) return;
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId);
  revalidatePath('/app/notifications');
}
