import { PixelRatio } from 'react-native';
import { getImageTargetWidth, isAndroid, type ImageSizeTier } from '@/lib/device/androidPerfProfile';

const SUPABASE_OBJECT_PUBLIC = /^(https:\/\/[^/]+)\/storage\/v1\/object\/public\/([^?]+)/;
const SUPABASE_RENDER_IMAGE = /\/storage\/v1\/render\/image\//;

/** Android: decode boyutunu düşür; hata olursa OptimizedImage orijinale döner. */
function shouldUseSupabaseRender(): boolean {
  return isAndroid();
}

const MAX_DECODE_WIDTH = 1200;

function physicalWidth(layoutWidth: number): number {
  return Math.min(Math.ceil(layoutWidth * PixelRatio.get()), MAX_DECODE_WIDTH);
}

/** Avatar yüklemeleri zaten kare; sunucuda cover ikinci kez kırpar (Android'de yüz çok yakın görünür). */
function buildRenderQuery(tier: ImageSizeTier, targetW: number): string {
  if (tier === 'avatar') {
    return `width=${targetW}&height=${targetW}&quality=78&resize=contain`;
  }
  return `width=${targetW}&quality=78&resize=cover`;
}

export function optimizedImageUrl(
  url: string | null | undefined,
  tier: ImageSizeTier = 'feed',
  layoutWidth?: number,
): string | null {
  if (!url?.trim()) return null;

  const trimmed = url.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('file:')) return trimmed;

  if (trimmed.includes('image.mux.com') || trimmed.includes('stream.mux.com')) {
    return trimmed;
  }

  const targetW = layoutWidth != null ? physicalWidth(layoutWidth) : getImageTargetWidth(tier);

  if (!shouldUseSupabaseRender()) return trimmed;

  if (SUPABASE_RENDER_IMAGE.test(trimmed)) {
    const sep = trimmed.includes('?') ? '&' : '?';
    if (trimmed.includes('width=')) return trimmed;
    return `${trimmed}${sep}${buildRenderQuery(tier, targetW)}`;
  }

  const match = trimmed.match(SUPABASE_OBJECT_PUBLIC);
  if (!match) return trimmed;

  const [, origin, objectPath] = match;
  return `${origin}/storage/v1/render/image/public/${objectPath}?${buildRenderQuery(tier, targetW)}`;
}
