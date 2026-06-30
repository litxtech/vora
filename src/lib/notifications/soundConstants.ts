/** Push bildirim sesleri — desteklenen formatlar (WAV önerilir) */
export const ALLOWED_SOUND_EXTENSIONS = ['wav', 'mp3', 'm4a', 'aac', 'caf'] as const;

export type AllowedSoundExtension = (typeof ALLOWED_SOUND_EXTENSIONS)[number];

export const SOUND_MIME_TYPES: Record<AllowedSoundExtension, string> = {
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  caf: 'audio/x-caf',
};

export const SOUND_PICKER_TYPES = [
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/x-caf',
  'audio/*',
] as const;

export function parseSoundExtension(filename: string): AllowedSoundExtension | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  return ALLOWED_SOUND_EXTENSIONS.includes(ext as AllowedSoundExtension)
    ? (ext as AllowedSoundExtension)
    : null;
}

/** iOS APNs uzak push — sistem varsayılan bildirim sesi */
export const APNS_DEFAULT_NOTIFICATION_SOUND = 'default';

/** Push payload'da kullanılan ses kimliği — uzantısız, özellik adıyla aynı */
export function soundSlugForEvent(eventType: string): string {
  return eventType;
}

/** iOS APNs için tam dosya adı */
export function apnsSoundFilename(slug: string, ext: AllowedSoundExtension): string {
  return `${slug}.${ext}`;
}
