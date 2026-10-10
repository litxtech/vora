export const AI_MUSIC_PACKAGES = {
  m15: { id: 'm15', minutes: 15, seconds: 900, amountMinor: 15900, label: '15 dakika' },
  m30: { id: 'm30', minutes: 30, seconds: 1800, amountMinor: 34900, label: '30 dakika' },
  m60: { id: 'm60', minutes: 60, seconds: 3600, amountMinor: 99900, label: '60 dakika' },
} as const;

export type AiMusicPackageId = keyof typeof AI_MUSIC_PACKAGES;

export function aiMusicPackage(id: string | null | undefined) {
  if (!id || !(id in AI_MUSIC_PACKAGES)) return null;
  return AI_MUSIC_PACKAGES[id as AiMusicPackageId];
}
