import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import { mapAnnouncementRow } from '@/features/announcements/services/announcementsData';
import type { Announcement, AnnouncementDraft } from '@/features/announcements/types';

type SaveResult = { announcement: Announcement | null; error: string | null };

function draftToParams(draft: AnnouncementDraft) {
  const media = draft.mediaItems
    .filter((item) => Boolean(item.url))
    .map((item) => ({
      type: item.type,
      url: item.url,
      thumbnail_url: item.thumbnailUrl,
    }));

  const first = media[0];

  return {
    p_title: draft.title.trim(),
    p_body: draft.body.trim(),
    p_media_type: first?.type ?? draft.mediaType,
    p_media_url: first?.url ?? draft.mediaUrl,
    p_thumbnail_url: first?.thumbnail_url ?? draft.thumbnailUrl,
    p_media: media,
    p_link_url: draft.linkUrl.trim() || null,
    p_link_label: draft.linkLabel.trim() || null,
    p_accent: draft.accent,
    p_region_id: draft.regionId,
    p_starts_at: draft.startsAt,
    p_ends_at: draft.endsAt,
    p_is_pinned: draft.isPinned,
    p_priority: draft.priority,
  };
}

export async function createAnnouncement(draft: AnnouncementDraft): Promise<SaveResult> {
  const { data, error } = await supabase.rpc('create_announcement', draftToParams(draft));
  if (error) return { announcement: null, error: supabaseErrorMessage(error) };
  return { announcement: data ? mapAnnouncementRow(data as never) : null, error: null };
}

export async function updateAnnouncement(
  id: string,
  draft: AnnouncementDraft,
): Promise<SaveResult> {
  const { data, error } = await supabase.rpc('update_announcement', {
    p_id: id,
    ...draftToParams(draft),
    p_is_active: draft.isActive,
  });
  if (error) return { announcement: null, error: supabaseErrorMessage(error) };
  return { announcement: data ? mapAnnouncementRow(data as never) : null, error: null };
}

export async function deleteAnnouncement(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('delete_announcement', { p_id: id });
  return { error: supabaseErrorMessage(error) };
}
