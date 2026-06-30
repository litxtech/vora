import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type EventUpdate = {
  id: string;
  eventId: string;
  authorId: string;
  authorName: string | null;
  content: string;
  mediaUrls: string[];
  createdAt: string;
};

export async function fetchEventUpdates(eventId: string): Promise<EventUpdate[]> {
  const { data } = await supabase
    .from('event_updates')
    .select(
      `id, event_id, author_id, content, media_urls, created_at,
       profiles!event_updates_author_id_fkey (username, full_name)`,
    )
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(30);

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      eventId: row.event_id,
      authorId: row.author_id,
      authorName: profile?.full_name ?? profile?.username ?? null,
      content: row.content,
      mediaUrls: row.media_urls ?? [],
      createdAt: row.created_at,
    };
  });
}

export async function createEventUpdate(
  eventId: string,
  authorId: string,
  content: string,
  mediaUrls: string[] = [],
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('event_updates').insert({
    event_id: eventId,
    author_id: authorId,
    content: content.trim(),
    media_urls: mediaUrls,
  });
  return { error: supabaseErrorMessage(error) };
}
