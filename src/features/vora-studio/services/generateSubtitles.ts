import type { StudioSubtitleCue } from '@/features/vora-studio/types';
import { generateId } from '@/features/vora-studio/utils/time';
import { supabase } from '@/lib/supabase/client';

type SubtitleResponse = {
  cues: StudioSubtitleCue[];
  provider: string;
};

/**
 * Otomatik altyazı — edge function üzerinden konuşma tanıma.
 * Servis yoksa demo altyazı döner (geliştirme modu).
 */
export async function generateAutoSubtitles(
  videoUri: string,
  durationSec: number,
  language = 'tr',
): Promise<StudioSubtitleCue[]> {
  const { data, error } = await supabase.functions.invoke('vora-studio-subtitles', {
    body: { videoUri, durationSec, language },
  });

  if (!error && data) {
    const parsed = data as SubtitleResponse;
    if (parsed.cues?.length) return parsed.cues;
  }

  if (__DEV__) {
    return buildDemoSubtitles(durationSec);
  }

  throw new Error('Otomatik altyazı şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
}

function buildDemoSubtitles(durationSec: number): StudioSubtitleCue[] {
  const segment = Math.max(3, Math.floor(durationSec / 3));
  const samples = [
    'Bugün Trabzon Meydan\'dayız...',
    'Son dakika gelişmelerini aktarıyoruz.',
    'VORA ile güvenilir içerik paylaşın.',
  ];

  return samples.map((text, index) => ({
    id: generateId('sub'),
    startSec: index * segment,
    endSec: Math.min(durationSec, (index + 1) * segment),
    text,
  }));
}
