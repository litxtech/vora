import { getMuxPlaybackUrl } from '@/lib/mux/client';
import { publishPostAsReel } from '@/features/compose/services/publishPostAsReel';
import type { MusicSelection } from '@/features/music/types';
import type { PublishedEditManifest } from '@/features/vora-studio/types';
import { supabase } from '@/lib/supabase/client';
import { emitMuxVideoReady } from '@/services/video/muxReadyEvents';
import { pollMuxUntilReady } from '@/services/video/muxPoll';

export type FinalizePublishedVideoInput = {
  postId: string;
  videoId: string;
  mediaIndex: number;
  authorId: string;
  regionId: string;
  caption: string;
  publishReel: boolean;
};

/**
 * Mux transcode bitince gönderi medya URL'sini ve (isteğe bağlı) Reels kaydını arka planda tamamlar.
 * Kullanıcı paylaşım ekranında beklemez.
 */
export async function finalizePublishedVideo(input: FinalizePublishedVideoInput): Promise<void> {
  const synced = await pollMuxUntilReady(input.videoId);

  if (synced.status === 'error') {
    console.warn('[finalizeVideo] Mux error for', input.videoId);
    return;
  }

  if (synced.status === 'ready' && synced.playbackId) {
      const playbackUrl = getMuxPlaybackUrl(synced.playbackId);

      const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select(`
          media_urls,
          music_track_id,
          music_start_sec,
          music_end_sec,
          music_volume,
          original_audio_volume,
          edit_manifest,
          music_tracks (id, display_title, artist, audio_url, duration_seconds)
        `)
        .eq('id', input.postId)
        .maybeSingle();

      if (fetchError || !post) return;

      const urls = [...(post.media_urls ?? [])];
      if (input.mediaIndex >= 0 && input.mediaIndex < urls.length) {
        urls[input.mediaIndex] = playbackUrl;
        await supabase.from('posts').update({ media_urls: urls }).eq('id', input.postId);
      }

      if (input.publishReel) {
        const track = Array.isArray(post.music_tracks) ? post.music_tracks[0] : post.music_tracks;
        const music: MusicSelection | null =
          post.music_track_id && track?.audio_url
            ? {
                trackId: post.music_track_id,
                displayTitle: track.display_title,
                artist: track.artist,
                audioUrl: track.audio_url,
                durationSec: Number(track.duration_seconds ?? 0),
                musicStartSec: Number(post.music_start_sec ?? 0),
                musicEndSec: Number(post.music_end_sec ?? track.duration_seconds ?? 0),
                musicVolume: Number(post.music_volume ?? 0.8),
                originalAudioVolume: Number(post.original_audio_volume ?? 0),
              }
            : null;

        const editManifest = (post.edit_manifest as PublishedEditManifest | null) ?? null;

        const reelResult = await publishPostAsReel({
          authorId: input.authorId,
          regionId: input.regionId,
          videoId: input.videoId,
          postId: input.postId,
          caption: input.caption,
          music,
          editManifest,
        });
        if (reelResult.error) {
          console.warn('[finalizeVideo] Reel publish failed:', reelResult.error);
        }
      }

      emitMuxVideoReady(input.videoId);
      return;
  }

  console.warn('[finalizeVideo] Timed out waiting for', input.videoId);
}
