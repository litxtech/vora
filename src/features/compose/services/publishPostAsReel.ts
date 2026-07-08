import { supabase } from '@/lib/supabase/client';
import type { MusicSelection } from '@/features/music/types';
import type { PublishedEditManifest } from '@/features/vora-studio/types';
import { editManifestToDbField } from '@/features/music/services/recordUsage';
import { audioSelectionToDbFields } from '@/features/sounds/services/recordSoundUsage';
import { supabaseErrorMessage } from '@/lib/errors';

export async function publishPostAsReel(input: {
  authorId: string;
  regionId: string;
  videoId: string;
  caption: string;
  postId?: string | null;
  music?: MusicSelection | null;
  editManifest?: PublishedEditManifest | null;
}): Promise<{ reelId: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('reels')
    .insert({
      author_id: input.authorId,
      region_id: input.regionId,
      video_id: input.videoId,
      source_post_id: input.postId ?? null,
      caption: input.caption.trim() || null,
      status: 'published',
      ...audioSelectionToDbFields(input.music ?? null),
      ...editManifestToDbField(input.editManifest ?? null),
    })
    .select('id')
    .single();

  if (error) return { reelId: null, error: supabaseErrorMessage(error)! };
  return { reelId: data.id, error: null };
}
