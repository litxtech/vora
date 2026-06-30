import { Platform } from 'react-native';
import { VCTS_WATERMARK_VERSION } from '@/features/vcts/constants';
import type { VctsContentType } from '@/features/vcts/constants';
import { computeContentHash } from '@/features/vcts/services/contentHash';
import { getPublisherKey } from '@/features/vcts/services/publisherKey';
import type { ContentAssetRecord } from '@/features/vcts/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type MediaHashResult = {
  url: string;
  storagePath: string;
  sha256: string;
  assetIndex: number;
};

function resolveContentType(mediaCount: number, hasVideo: boolean): VctsContentType {
  if (mediaCount === 0) return 'text';
  if (hasVideo && mediaCount > 1) return 'mixed';
  if (hasVideo) return 'video';
  if (mediaCount > 1) return 'mixed';
  return 'image';
}

export async function attestPostContent(
  postId: string,
  authorId: string,
  textContent: string,
  mediaAssets: MediaHashResult[],
  hasVideo = false,
): Promise<{ trustCode: string | null; error: string | null }> {
  const publisherKey = await getPublisherKey(authorId);
  if (!publisherKey) {
    return { trustCode: null, error: 'Yayıncı anahtarı bulunamadı.' };
  }

  const timestamp = new Date().toISOString();
  const contentType = resolveContentType(mediaAssets.length, hasVideo);

  const contentHash = await computeContentHash({
    postId,
    userId: authorId,
    publisherKey,
    timestamp,
    textContent,
    mediaHashes: mediaAssets.map((a) => a.sha256),
  });

  const assets: ContentAssetRecord[] = mediaAssets.map((a) => ({
    storagePath: a.storagePath,
    mediaUrl: a.url,
    sha256: a.sha256,
    assetIndex: a.assetIndex,
    watermarkVersion: VCTS_WATERMARK_VERSION,
  }));

  const { data, error } = await supabase.rpc('create_content_trust_record', {
    p_post_id: postId,
    p_content_hash: contentHash,
    p_content_type: contentType,
    p_device_platform: Platform.OS,
    p_ip_hash: null,
    p_location_hash: null,
    p_assets: assets.map((a) => ({
      storage_path: a.storagePath,
      media_url: a.mediaUrl,
      sha256: a.sha256,
      asset_index: a.assetIndex,
      watermark_version: a.watermarkVersion,
    })),
  });

  if (error) return { trustCode: null, error: supabaseErrorMessage(error)! };

  const result = data as { trust_code?: string } | null;
  return { trustCode: result?.trust_code ?? null, error: null };
}
