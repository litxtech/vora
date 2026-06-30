import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, json, jsonSafeError, requireAuth } from '../_shared/supabaseAuth.ts';

const MAX_DURATION_SEC = 600;
const MAX_URI_LENGTH = 2048;

type SubtitlePayload = {
  videoUri: string;
  durationSec: number;
  language?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;

    const body = (await req.json()) as SubtitlePayload;
    const durationSec = Number(body.durationSec);
    const videoUri = typeof body.videoUri === 'string' ? body.videoUri.trim() : '';

    if (!videoUri || videoUri.length > MAX_URI_LENGTH) {
      return json({ error: 'Invalid videoUri' }, 400);
    }

    if (!Number.isFinite(durationSec) || durationSec <= 0 || durationSec > MAX_DURATION_SEC) {
      return json({ error: 'Invalid durationSec' }, 400);
    }

    const whisperUrl = Deno.env.get('VORA_WHISPER_URL');

    if (whisperUrl) {
      const response = await fetch(whisperUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUri,
          language: body.language ?? 'tr',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return json(data);
      }
    }

    const segment = Math.max(3, Math.floor(durationSec / 3));
    const samples = [
      'Bugün Trabzon Meydan\'dayız...',
      'Son dakika gelişmelerini aktarıyoruz.',
      'VORA ile güvenilir içerik paylaşın.',
    ];

    const cues = samples.map((text, index) => ({
      id: `sub_${index}`,
      startSec: index * segment,
      endSec: Math.min(durationSec, (index + 1) * segment),
      text,
    }));

    return json({ cues, provider: 'vora-demo' });
  } catch (error) {
    return jsonSafeError(error, 500);
  }
});
