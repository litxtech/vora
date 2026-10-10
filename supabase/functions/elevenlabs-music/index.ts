import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  getCombinedUnreadBadgeCount,
  sendPushToDevices,
  type PushTokenRow,
} from '../_shared/notifications.ts';
import { corsHeaders, json, jsonSafeError, requireAuth } from '../_shared/supabaseAuth.ts';

const STYLES = new Set(['kaval', 'kemence', 'horon', 'tulum', 'karma', 'serbest']);
const VOCALS = new Set(['instrumental', 'female', 'male']);
const DAILY_LIMIT = 20;
const MIN_SEC = 10;
const MAX_SEC = 180;
const MODEL = 'music_v2_5';

const STYLE_DIRECTION: Record<string, string> = {
  kaval: 'Black Sea kaval flute color',
  kemence: 'Black Sea kemençe bowed fiddle color',
  horon: 'Black Sea horon dance rhythm',
  tulum: 'Black Sea tulum bagpipe color',
  karma: 'Black Sea kemençe and kaval together',
  serbest: 'original music shaped by the listener request',
};

type GenerateBody = {
  title?: string;
  prompt?: string;
  style?: string;
  durationSec?: number;
  vocal?: string;
  lyrics?: string;
  referenceStoragePath?: string | null;
  referenceName?: string | null;
  referenceKind?: string | null;
  referenceSource?: string | null;
  referenceDurationSec?: number | null;
};

type EdgeWait = { waitUntil: (task: Promise<unknown>) => void };

function rightsNotice(code: string): string {
  return `Bu müzik Vora Karadeniz platformunda üretildi. Telif hakları Vora Karadeniz platformuna aittir. Başka mecralarda paylaşırken bu bildirim korunur. Lisans: ${code}`;
}

function copyrightCode(): string {
  return `VORA-${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}

function clampDuration(value: unknown): number {
  const sec = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(sec)) return 30;
  return Math.max(MIN_SEC, Math.min(MAX_SEC, Math.round(sec)));
}

function sectionDurations(totalMs: number): number[] {
  if (totalMs <= 50_000) return [totalMs];
  if (totalMs <= 120_000) {
    const opening = Math.max(20_000, Math.round(totalMs * 0.58));
    const lift = totalMs - opening;
    if (lift < 12_000) return [totalMs];
    return [opening, lift];
  }
  return splitDuration(totalMs);
}

function splitDuration(totalMs: number): number[] {
  const min = 10_000;
  const max = 120_000;
  if (totalMs <= max) return [totalMs];
  const chunks: number[] = [];
  let left = totalMs;
  while (left > max) {
    chunks.push(max);
    left -= max;
  }
  if (left < min && chunks.length > 0) {
    const need = min - left;
    chunks[chunks.length - 1] -= need;
    left = min;
  }
  chunks.push(left);
  return chunks;
}

function lyricLines(lyrics: string): string[] {
  return lyrics
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 24)
    .map((line) => line.slice(0, 200));
}

const IMMEDIATE_POSITIVE = [
  'music starts at the first beat',
  'full arrangement from the opening instant',
  'no intro',
];

const IMMEDIATE_NEGATIVE = [
  'silence',
  'long intro',
  'fade in',
  'empty opening',
  'music starts late',
  'slow buildup before the melody',
];

const STUDIO_POSITIVE = [
  'professional studio production',
  'polished stereo mix',
  'clear memorable melody',
  'tight musical arrangement',
  'balanced dynamics',
  'high fidelity',
];

const STUDIO_NEGATIVE = [
  'muddy mix',
  'clipping',
  'amateur demo',
  'off pitch',
  'harsh noise',
  'thin production',
  'monotonous loop',
];

function chunkText(
  index: number,
  lyrics: string,
  vocal: string,
  guide: 'voice' | 'file' | 'prompt',
): string {
  const lines = lyricLines(lyrics);
  const opening = index === 0
    ? '{music is already playing at the first instant, ignore any leading silence}'
    : '';

  if (guide === 'voice') {
    const sung = lines.length > 0
      ? lines.join('\n')
      : '{sing the exact words heard in the user recording}';
    if (index === 0) return `[Main]\n${opening}\n${sung}`;
    return `[Lift]\n{the same sung melody, fuller arrangement, no pause}`;
  }

  if (vocal === 'instrumental') {
    if (index === 0) {
      return guide === 'file'
        ? `[Main]\n${opening}\n{new instrumental using the reference only for mood, tempo and timbre}`
        : `[Main]\n${opening}\n{melody, harmony and rhythm together from the first beat}`;
    }
    return `[Lift]\n{same instrumental, fuller and more melodic, no break}`;
  }

  if (index === 0 && lines.length > 0) return `[Main]\n${opening}\n${lines.join('\n')}`;
  if (index === 0) {
    return guide === 'file'
      ? `[Main]\n${opening}\n{original lyrics that fit the prompt, not a transcription of the file}`
      : `[Main]\n${opening}\n{original singable lyrics that fit the prompt}`;
  }
  return `[Lift]\n{same song, fuller chorus energy, no pause}`;
}

function positiveStyles(
  prompt: string,
  style: string,
  vocal: string,
  guide: 'voice' | 'file' | 'prompt',
): string[] {
  const vocalStyle = guide === 'voice'
    ? vocal === 'female'
      ? 'clear in-tune female lead vocal matching the recording'
      : vocal === 'male'
        ? 'clear in-tune male lead vocal matching the recording'
        : 'clear in-tune lead vocal matching the recording'
    : vocal === 'female'
      ? 'clear in-tune female lead vocal, natural phrasing, studio vocal'
      : vocal === 'male'
        ? 'clear in-tune male lead vocal, natural phrasing, studio vocal'
        : 'rich instrumental arrangement, no vocals';
  const brief = prompt.trim().slice(0, 280);
  const styles = [
    'original composition',
    vocalStyle,
    STYLE_DIRECTION[style] ?? STYLE_DIRECTION.serbest,
    brief ? `musical brief: ${brief}` : 'emotionally clear original piece',
  ];
  if (guide === 'voice') {
    styles.push('lyrics and melody taken from the user voice recording');
    styles.push('sing the words the user said or sang');
  } else if (guide === 'file') {
    styles.push('reference guides mood, tempo and timbre only');
    styles.push('write a new melody from the prompt');
  }
  return styles;
}

function negativeStyles(vocal: string, guide: 'voice' | 'file' | 'prompt'): string[] {
  if (guide === 'voice') return ['different lyrics', 'unrelated melody', 'spoken word', 'mumbled vocal'];
  if (guide === 'file') {
    const copied = ['verbatim copy of the reference', 'transcribed speech from the file'];
    if (vocal === 'female') return ['male vocal', 'male singer', ...copied];
    if (vocal === 'male') return ['female vocal', 'female singer', ...copied];
    return ['vocals', 'singing', 'lyrics', 'speech', ...copied];
  }
  if (vocal === 'female') return ['male vocal', 'male singer', 'spoken word', 'off-key vocal'];
  if (vocal === 'male') return ['female vocal', 'female singer', 'spoken word', 'off-key vocal'];
  return ['vocals', 'singing', 'lyrics', 'speech', 'humming'];
}

async function readElevenError(response: Response): Promise<string> {
  const text = await response.text();
  console.error('[elevenlabs-music]', response.status, text.slice(0, 500));
  if (/copyright|infring/i.test(text)) {
    return 'Yüklenen dosyada telifli bir eser bulundu. Kendi kaydını veya telifsiz bir ses dene.';
  }
  return 'Müzik üretilemedi. Tarifini biraz değiştirip yeniden dene.';
}

async function setStage(
  admin: SupabaseClient,
  workId: string,
  stage: string,
  progress: number,
): Promise<void> {
  await admin.from('ai_music_works').update({ stage, progress }).eq('id', workId);
}

async function notifyReady(
  admin: SupabaseClient,
  userId: string,
  workId: string,
  title: string,
  failed: boolean,
): Promise<void> {
  const heading = failed ? 'Müzik hazırlanamadı' : 'Müziğin hazır';
  const body = failed
    ? `${title} tamamlanamadı. Stüdyodan yeniden deneyebilirsin.`
    : `${title} hazır. Dinleyebilirsin.`;
  const pushData: Record<string, unknown> = {
    eventType: 'system',
    deep_link: `/sounds/ai/${workId}`,
    deepLink: `/sounds/ai/${workId}`,
  };

  const { data: inserted } = await admin
    .from('notifications')
    .insert({
      user_id: userId,
      event_type: 'system',
      category: 'system',
      title: heading,
      body,
      data: pushData,
    })
    .select('id')
    .single();

  if (inserted?.id) pushData.notificationId = inserted.id;

  const { data: tokens } = await admin
    .from('push_tokens')
    .select('expo_push_token, device_push_token, platform')
    .eq('user_id', userId)
    .eq('is_active', true);

  const active = (tokens ?? []) as PushTokenRow[];
  if (active.length === 0) return;

  const badgeCount = await getCombinedUnreadBadgeCount(admin, userId);
  await sendPushToDevices(active, {
    title: heading,
    body,
    channelId: 'vora_system',
    useCustom: false,
    slug: '',
    fullFilename: '',
    pushData,
    badgeCount,
  });
}

async function uploadReference(
  apiKey: string,
  bytes: Uint8Array,
  filename: string,
  mime: string,
): Promise<{ songId: string } | { error: string }> {
  const form = new FormData();
  form.append('file', new File([bytes], filename, { type: mime }));
  const response = await fetch('https://api.elevenlabs.io/v1/music/upload', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: form,
  });
  if (!response.ok) return { error: await readElevenError(response) };
  const payload = (await response.json()) as { song_id?: string };
  if (!payload.song_id) return { error: 'Referans dosya dinlenemedi.' };
  return { songId: payload.song_id };
}

function mimeForPath(path: string): { mime: string; filename: string } {
  const lower = path.toLowerCase();
  if (lower.endsWith('.wav')) return { mime: 'audio/wav', filename: 'reference.wav' };
  if (lower.endsWith('.m4a') || lower.endsWith('.mp4')) return { mime: 'audio/mp4', filename: 'reference.m4a' };
  if (lower.endsWith('.ogg')) return { mime: 'audio/ogg', filename: 'reference.ogg' };
  return { mime: 'audio/mpeg', filename: 'reference.mp3' };
}

async function produce(
  admin: SupabaseClient,
  apiKey: string,
  userId: string,
  workId: string,
  input: {
    title: string;
    prompt: string;
    style: string;
    durationSec: number;
    vocal: string;
    lyrics: string;
    referenceStoragePath: string | null;
    followVoice: boolean;
    referenceDurationSec: number;
  },
): Promise<void> {
  try {
    await setStage(admin, workId, 'queued', 8);
    let songId: string | null = null;

    if (input.referenceStoragePath) {
      await setStage(admin, workId, 'listening', 24);
      const downloaded = await admin.storage.from('user-sounds').download(input.referenceStoragePath);
      if (downloaded.error || !downloaded.data) {
        throw new Error('Referans dosya okunamadı.');
      }
      const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
      if (bytes.byteLength < 1000) throw new Error('Referans dosya boş görünüyor.');
      const file = mimeForPath(input.referenceStoragePath);
      const uploaded = await uploadReference(apiKey, bytes, file.filename, file.mime);
      if ('error' in uploaded) throw new Error(uploaded.error);
      songId = uploaded.songId;
    }

    await setStage(admin, workId, 'composing', 48);
    const durationMs = input.durationSec * 1000;
    const guide: 'voice' | 'file' | 'prompt' = songId
      ? (input.followVoice ? 'voice' : 'file')
      : 'prompt';
    const referenceMs = Math.max(10_000, Math.min(90_000, Math.round((input.referenceDurationSec || 30) * 1000)));
    const body = {
      model_id: MODEL,
      composition_plan: {
        chunks: sectionDurations(durationMs).map((duration, index) => ({
          text: chunkText(index, input.lyrics, input.vocal, guide),
          duration_ms: duration,
          positive_styles: index === 0
            ? [
                ...positiveStyles(input.prompt, input.style, input.vocal, guide),
                ...STUDIO_POSITIVE,
                ...IMMEDIATE_POSITIVE,
              ]
            : [
                ...positiveStyles(input.prompt, input.style, input.vocal, guide),
                'fuller arrangement of the same piece',
                'no pause between sections',
              ],
          negative_styles: index === 0
            ? [...negativeStyles(input.vocal, guide), ...STUDIO_NEGATIVE, ...IMMEDIATE_NEGATIVE]
            : [...negativeStyles(input.vocal, guide), ...STUDIO_NEGATIVE, 'silence', 'new intro', 'fade out'],
          ...(index === 0 && songId
            ? {
                conditioning_ref: {
                  song_id: songId,
                  range: { start_ms: 0, end_ms: referenceMs },
                },
                condition_strength: guide === 'voice' ? 'high' : 'medium',
              }
            : {}),
        })),
      },
    };

    await setStage(admin, workId, 'rendering', 70);
    const composed = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify(body),
    });
    if (!composed.ok) throw new Error(await readElevenError(composed));

    const audio = new Uint8Array(await composed.arrayBuffer());
    if (audio.byteLength < 1000) throw new Error('Üretilen ses boş geldi.');

    await setStage(admin, workId, 'saving', 88);
    const storagePath = `${userId}/ai-music/${workId}.mp3`;
    const stored = await admin.storage.from('user-sounds').upload(storagePath, audio, {
      contentType: 'audio/mpeg',
      upsert: true,
    });
    if (stored.error) throw new Error('Müzik kaydedilemedi.');

    const { data: publicUrl } = admin.storage.from('user-sounds').getPublicUrl(storagePath);
    const saved = await admin
      .from('ai_music_works')
      .update({
        status: 'ready',
        stage: 'ready',
        progress: 100,
        audio_storage_path: storagePath,
        audio_url: publicUrl.publicUrl,
        error_message: null,
      })
      .eq('id', workId);
    if (saved.error) throw new Error('Müzik kaydı güncellenemedi.');

    await notifyReady(admin, userId, workId, input.title, false);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Müzik üretilemedi.';
    console.error('[elevenlabs-music] produce', message);
    await admin.rpc('release_ai_music_seconds', { p_work_id: workId });
    await admin
      .from('ai_music_works')
      .update({
        status: 'failed',
        stage: 'failed',
        progress: 0,
        error_message: message,
      })
      .eq('id', workId)
      .neq('status', 'ready');
    await notifyReady(admin, userId, workId, input.title, true);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Desteklenmeyen istek.' }, 405);

  try {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;
    const { user, admin } = auth;

    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) return json({ error: 'Müzik servisi henüz yapılandırılmadı.' }, 503);

    const body = (await req.json()) as GenerateBody;
    const prompt = (body.prompt ?? '').trim();
    const referenceStoragePath = (body.referenceStoragePath ?? '').trim() || null;
    const uploadedFile = !!referenceStoragePath && body.referenceSource !== 'recording';
    const lyrics = uploadedFile ? '' : (body.lyrics ?? '').trim().slice(0, 2000);
    const style = STYLES.has(body.style ?? '') ? (body.style as string) : 'serbest';
    const vocal = VOCALS.has(body.vocal ?? '') ? (body.vocal as string) : 'instrumental';
    const durationSec = clampDuration(body.durationSec);
    const referenceName = (body.referenceName ?? '').trim().slice(0, 120) || null;
    const referenceKind = body.referenceKind === 'video' || body.referenceKind === 'audio'
      ? body.referenceKind
      : null;
    const followVoice = body.referenceSource === 'recording' && !!referenceStoragePath;
    const referenceDurationSec = Number(body.referenceDurationSec);
    const referenceSpan = Number.isFinite(referenceDurationSec) && referenceDurationSec > 0
      ? referenceDurationSec
      : 30;
    const title = ((body.title ?? '').trim() || prompt || 'Vora parçası').slice(0, 120);

    if (prompt.length > 800) return json({ error: 'Tarif 800 karakteri geçemez.' }, 400);
    if (!prompt && !lyrics && !referenceStoragePath) {
      return json({ error: 'Bir tarif, söz veya referans dosya gerekli.' }, 400);
    }
    if (referenceStoragePath && !referenceStoragePath.startsWith(`${user.id}/`)) {
      return json({ error: 'Referans dosya bu hesaba ait değil.' }, 403);
    }

    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const { count, error: countError } = await admin
      .from('ai_music_works')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', user.id)
      .gte('created_at', since.toISOString());
    if (countError) return json({ error: 'Üretim kotası okunamadı.' }, 500);
    if ((count ?? 0) >= DAILY_LIMIT) {
      return json({ error: `Günlük üretim sınırı ${DAILY_LIMIT} parça.` }, 429);
    }

    const workId = crypto.randomUUID();
    const code = copyrightCode();
    const { data: row, error: insertError } = await admin
      .from('ai_music_works')
      .insert({
        id: workId,
        author_id: user.id,
        title,
        prompt,
        style,
        duration_sec: durationSec,
        instrumental: vocal === 'instrumental',
        vocal,
        lyrics: lyrics || null,
        status: 'generating',
        stage: 'queued',
        progress: 4,
        reference_storage_path: referenceStoragePath,
        reference_name: referenceName,
        reference_kind: referenceKind,
        copyright_code: code,
        rights_holder: 'Vora Karadeniz',
        rights_notice: rightsNotice(code),
        model_id: Deno.env.get('ELEVENLABS_MUSIC_MODEL') || MODEL,
      })
      .select('*')
      .single();

    if (insertError || !row) {
      console.error('[elevenlabs-music] insert', insertError?.message);
      return json({ error: 'Üretim kaydı açılamadı.' }, 500);
    }

    const allowance = await admin.rpc('assert_ai_music_allowance', {
      p_user_id: user.id,
      p_seconds: durationSec,
    });
    if (allowance.error) {
      await admin.from('ai_music_works').delete().eq('id', workId);
      const message = allowance.error.message ?? '';
      if (message.includes('Yetersiz')) return json({ error: 'Yetersiz müzik süresi' }, 402);
      console.error('[elevenlabs-music] allowance', message);
      return json({ error: 'Müzik süresi kontrol edilemedi.' }, 500);
    }

    const task = produce(admin, apiKey, user.id, workId, {
      title,
      prompt,
      style,
      durationSec,
      vocal,
      lyrics,
      referenceStoragePath,
      followVoice,
      referenceDurationSec: referenceSpan,
    });
    const runtime = (globalThis as { EdgeRuntime?: EdgeWait }).EdgeRuntime;
    if (runtime?.waitUntil) {
      runtime.waitUntil(task);
      return json({ work: row });
    }

    await task;
    const { data: done } = await admin.from('ai_music_works').select('*').eq('id', workId).single();
    return json({ work: done ?? row });
  } catch (error) {
    return jsonSafeError(error);
  }
});
