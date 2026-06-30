/** Placeholder media URL while Mux transcodes the upload. */
export const PROCESSING_VIDEO_PREFIX = 'vora://video-processing/';

export function buildProcessingVideoUrl(videoId: string): string {
  return `${PROCESSING_VIDEO_PREFIX}${videoId}`;
}

export function isProcessingVideoUrl(url: string): boolean {
  return url.startsWith(PROCESSING_VIDEO_PREFIX);
}

export function parseProcessingVideoId(url: string): string | null {
  if (!isProcessingVideoUrl(url)) return null;
  const id = url.slice(PROCESSING_VIDEO_PREFIX.length).trim();
  return id.length > 0 ? id : null;
}
