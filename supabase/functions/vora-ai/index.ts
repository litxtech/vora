import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  aiProviderLabel,
  askChatCompletion,
  askVisionCompletion,
  missingAiKeyMessage,
  missingVisionKeyMessage,
  resolveTextAiConfig,
  resolveVisionAiConfig,
  type AiChatConfig,
} from '../_shared/aiChat.ts';
import { corsHeaders, json, jsonSafeError, requireAuth } from '../_shared/supabaseAuth.ts';

type VoraAiPayload = {
  action: string;
  module: string;
  context?: Record<string, unknown>;
};

type AiResult = {
  text: string;
  provider: string;
  items?: Array<{
    id: string;
    title: string;
    subtitle?: string;
    type?: string;
    latitude?: number;
    longitude?: number;
    distanceKm?: number;
  }>;
  cached?: boolean;
  commentPosted?: boolean;
  commentId?: string;
};

const VORA_AI_PROFILE_ID = 'f0000000-0000-4000-8000-00000000a101';
const PROCESSING_VIDEO_PREFIX = 'vora://video-processing/';
const VISION_SYSTEM =
  'Sen Vora AI adlı Karadeniz bölgesi sosyal uygulamasının yapay zekâ rehberisin. Görselleri ve video karelerini dikkatle incele. Türkçe, samimi ve bilgilendirici yanıt ver; nesneleri, mekânı, etkinliği, manzarayı ve kültürel bağlamı açıkla. Karadeniz turizmi ve yerel yaşam hakkında pratik öneriler sun. Emin olmadığın yerlerde tahminini belirt.';

const MODULES = new Set([
  'posts', 'reels', 'map', 'events', 'comments', 'moderation',
  'recommendations', 'news', 'trends', 'map_animation', 'vision',
]);

async function isModuleEnabled(admin: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.49.1').createClient>, module: string): Promise<boolean> {
  const { data: master } = await admin.from('ai_settings').select('enabled').eq('module', 'master').maybeSingle();
  if (master?.enabled === false && module !== 'master') {
    return false;
  }
  const { data } = await admin.from('ai_settings').select('enabled').eq('module', module).maybeSingle();
  return data?.enabled !== false;
}

async function isVisionEnabled(admin: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.49.1').createClient>): Promise<boolean> {
  return isModuleEnabled(admin, 'vision');
}

function truncate(text: string, max = 400): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isVideoUrl(url: string): boolean {
  if (!url) return false;
  if (url.includes('processing') || url.includes('uploading')) return false;
  if (url.includes('stream.mux.com') || url.includes('.m3u8')) return true;
  if (/\.(mp4|mov|m4v|webm|mkv)(\?|$)/i.test(url)) return true;
  return false;
}

function isImageUrl(url: string): boolean {
  if (!url) return false;
  if (url.includes('image.mux.com')) return true;
  if (/\.(jpe?g|png|gif|webp|bmp|heic)(\?|$)/i.test(url)) return true;
  if (url.includes('/storage/v1/object/public/')) return !isVideoUrl(url);
  return false;
}

function parseProcessingVideoId(url: string): string | null {
  if (!url.startsWith(PROCESSING_VIDEO_PREFIX)) return null;
  const id = url.slice(PROCESSING_VIDEO_PREFIX.length).trim();
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

function muxPlaybackIdFromUrl(url: string): string | null {
  const match = url.match(/(?:stream|image)\.mux\.com\/([^./?]+)/);
  return match?.[1] ?? null;
}

function muxThumbnailFrames(playbackId: string): string[] {
  return [1, 4, 9].map((time) => `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}`);
}

function resolveVisionImageUrls(url: string): string[] {
  if (!url || url.includes('processing')) return [];
  const playbackId = muxPlaybackIdFromUrl(url);
  if (playbackId) return muxThumbnailFrames(playbackId);
  if (isImageUrl(url)) return [url];
  return [];
}

function collectVisionUrls(mediaUrls: string[]): string[] {
  const out: string[] = [];
  for (const url of mediaUrls) {
    for (const resolved of resolveVisionImageUrls(url)) {
      if (!out.includes(resolved)) out.push(resolved);
      if (out.length >= 4) return out;
    }
  }
  return out;
}

async function expandMediaUrls(
  admin: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.49.1').createClient>,
  mediaUrls: string[],
  context?: Record<string, unknown>,
): Promise<string[]> {
  const expanded = [...mediaUrls];

  const playbackId = context?.playbackId as string | undefined;
  const thumbnailUrl = context?.thumbnailUrl as string | undefined;
  if (thumbnailUrl) expanded.unshift(thumbnailUrl);
  if (playbackId) {
    expanded.push(...muxThumbnailFrames(playbackId));
    expanded.push(`https://stream.mux.com/${playbackId}.m3u8`);
  }

  const processingIds = [
    ...new Set(expanded.map(parseProcessingVideoId).filter((id): id is string => !!id)),
  ];

  if (processingIds.length > 0) {
    const { data: videos } = await admin
      .from('videos')
      .select('mux_playback_id, thumbnail_url, status')
      .in('id', processingIds);

    for (const video of videos ?? []) {
      if (video.status !== 'ready' || !video.mux_playback_id) continue;
      if (video.thumbnail_url) expanded.push(video.thumbnail_url);
      expanded.push(...muxThumbnailFrames(video.mux_playback_id));
      expanded.push(`https://stream.mux.com/${video.mux_playback_id}.m3u8`);
    }
  }

  return expanded;
}

async function analyzeMediaContext(
  admin: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.49.1').createClient>,
  opts: {
    textConfig?: AiChatConfig | null;
    visionConfig?: AiChatConfig | null;
    textContext: string;
    mediaUrls: string[];
    question?: string;
    mode: 'observe' | 'ask';
    context?: Record<string, unknown>;
  },
): Promise<{ text: string; provider: string }> {
  const visionOn = await isVisionEnabled(admin);
  const expandedMediaUrls = await expandMediaUrls(admin, opts.mediaUrls, opts.context);
  const images = collectVisionUrls(expandedMediaUrls);
  const visionConfig = opts.visionConfig ?? null;
  const textConfig = opts.textConfig ?? null;
  const hasVision = visionOn && !!visionConfig && images.length > 0;
  const hasPendingVideo = opts.mediaUrls.some((url) => !!parseProcessingVideoId(url)) && images.length === 0;

  const observePrompt =
    `Bu paylaşımdaki görsel ve/veya video karesini dikkatlice incele. Grok tarzı zengin bir analiz yap:\n` +
    `- Görünen nesneler, mekân, atmosfer ve aktivite\n` +
    `- Karadeniz bağlamında olası konum veya kültürel ipuçları\n` +
    `- Dikkat çeken detaylar ve ziyaret/keşif önerileri\n\n` +
    `Metin bağlamı:\n${opts.textContext}`;

  const askPrompt = opts.question
    ? `Kullanıcı sorusu: ${opts.question}\n\nPaylaşım bağlamı:\n${opts.textContext}\n\n` +
      `Görsel veya video karesi varsa buna dayanarak soruyu tam, bilgilendirici ve samimi yanıtla.`
    : observePrompt;

  const userPrompt = opts.mode === 'observe' ? observePrompt : askPrompt;
  const system = hasVision ? VISION_SYSTEM : 'Sen Vora AI adlı Karadeniz bölgesi sosyal uygulamasının yapay zekâ rehberisin. Türkçe, kısa ve net yanıt ver.';

  if (hasVision && visionConfig) {
    const ai = await askVisionCompletion(visionConfig, system, userPrompt, images, { maxTokens: 900 });
    if (ai) return { text: ai, provider: aiProviderLabel(visionConfig, true) };
  }

  let text =
    opts.mode === 'observe'
      ? `Medya özeti: ${truncate(opts.textContext, 320)}`
      : `${truncate(opts.textContext, 200)}\n\nSoru: ${opts.question ?? ''}`;

  if (images.length === 0) {
    if (hasPendingVideo) {
      text += ' Video hâlâ işleniyor; birkaç dakika sonra tekrar deneyin.';
    } else if (expandedMediaUrls.length > 0) {
      text += ' Medya bağlantısı çözümlenemedi.';
    } else {
      text += ' Bu paylaşımda analiz edilebilir görsel bulunamadı.';
    }
  } else if (!visionConfig) {
    text += missingVisionKeyMessage();
  } else if (!visionOn) {
    text += ' Görsel analizi modülü şu an kapalı.';
  }

  if (textConfig) {
    const ai = await askChatCompletion(textConfig, [
      { role: 'system', content: system },
      { role: 'user', content: userPrompt },
    ]);
    if (ai) text = ai;
  } else {
    text += missingAiKeyMessage();
  }

  return { text, provider: aiProviderLabel(textConfig) };
}

async function postVoraAiPostComment(
  admin: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.49.1').createClient>,
  postId: string,
  content: string,
  parentId?: string | null,
): Promise<string | null> {
  const trimmed = content.trim().slice(0, 2000);
  if (!trimmed) return null;
  const { data, error } = await admin
    .from('post_comments')
    .insert({
      post_id: postId,
      author_id: VORA_AI_PROFILE_ID,
      content: trimmed,
      parent_id: parentId ?? null,
    })
    .select('id')
    .single();
  if (error) return null;
  return data?.id ?? null;
}

async function postVoraAiReelComment(
  admin: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.49.1').createClient>,
  reelId: string,
  content: string,
  parentId?: string | null,
): Promise<string | null> {
  const trimmed = content.trim().slice(0, 2000);
  if (!trimmed) return null;
  const { data, error } = await admin
    .from('reel_comments')
    .insert({
      reel_id: reelId,
      author_id: VORA_AI_PROFILE_ID,
      content: trimmed,
      parent_id: parentId ?? null,
    })
    .select('id')
    .single();
  if (error) return null;
  return data?.id ?? null;
}

async function askTextAi(
  textConfig: AiChatConfig | null | undefined,
  system: string,
  user: string,
  maxTokens = 600,
): Promise<string | null> {
  if (!textConfig) return null;
  return askChatCompletion(textConfig, [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], { maxTokens });
}

function summarizeHeuristic(content: string, title?: string | null): string {
  const body = [title, content].filter(Boolean).join(' — ');
  const sentences = body.split(/[.!?]\s+/).filter((s) => s.length > 12);
  if (sentences.length <= 2) return truncate(body, 280);
  return truncate(`${sentences[0]}. ${sentences[1]}.`, 280);
}

async function fetchPostContext(admin: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.49.1').createClient>, postId: string) {
  const { data } = await admin
    .from('posts')
    .select('id, title, content, category, location_label, latitude, longitude, region_id, district, media_urls')
    .eq('id', postId)
    .maybeSingle();
  return data;
}

async function fetchReelContext(admin: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.49.1').createClient>, reelId: string) {
  const { data } = await admin
    .from('reels')
    .select(`
      id, caption, region_id,
      music_track_id,
      music_tracks (display_title, artist),
      videos (thumbnail_url, mux_playback_id, status)
    `)
    .eq('id', reelId)
    .maybeSingle();
  return data;
}

function reelVisionUrls(reel: {
  videos?: { thumbnail_url?: string | null; mux_playback_id?: string | null; status?: string | null } | { thumbnail_url?: string | null; mux_playback_id?: string | null; status?: string | null }[] | null;
} | null): string[] {
  if (!reel?.videos) return [];
  const video = Array.isArray(reel.videos) ? reel.videos[0] : reel.videos;
  if (!video || video.status === 'failed') return [];
  const urls: string[] = [];
  if (video.thumbnail_url) urls.push(video.thumbnail_url);
  if (video.mux_playback_id) {
    urls.push(...muxThumbnailFrames(video.mux_playback_id));
    urls.push(`https://stream.mux.com/${video.mux_playback_id}.m3u8`);
  }
  return urls;
}

async function fetchNearbyItems(
  admin: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.49.1').createClient>,
  lat: number,
  lng: number,
  category?: string,
  maxKm = 50,
) {
  const items: NonNullable<AiResult['items']> = [];
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  const { data: events } = await admin
    .from('events')
    .select('id, title, venue_name, starts_at, latitude, longitude')
    .not('latitude', 'is', null)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(20);

  for (const e of events ?? []) {
    if (!e.latitude || !e.longitude) continue;
    const distanceKm = hasCoords ? haversineKm(lat, lng, e.latitude, e.longitude) : undefined;
    if (hasCoords && distanceKm != null && distanceKm > maxKm) continue;
    items.push({
      id: e.id,
      title: e.title,
      subtitle: e.venue_name ?? undefined,
      type: category === 'event' || category === 'concert' ? 'event' : 'event',
      latitude: e.latitude,
      longitude: e.longitude,
      distanceKm,
    });
  }

  const { data: businesses } = await admin
    .from('businesses')
    .select('id, name, category, latitude, longitude')
    .eq('status', 'approved')
    .not('latitude', 'is', null)
    .limit(24);

  for (const b of businesses ?? []) {
    const cat = (b.category ?? '').toLowerCase();
    const match =
      !category ||
      (category === 'restaurant' && /restoran|yemek|lokanta/.test(cat)) ||
      (category === 'cafe' && /kafe|cafe|kahve/.test(cat)) ||
      (category === 'hotel' && /otel|hotel|konaklama/.test(cat)) ||
      (category === 'historic' && /tarih|müze|turizm|museum/.test(cat));
    if (!match || !b.latitude || !b.longitude) continue;
    const distanceKm = hasCoords ? haversineKm(lat, lng, b.latitude, b.longitude) : undefined;
    if (hasCoords && distanceKm != null && distanceKm > maxKm) continue;
    items.push({
      id: b.id,
      title: b.name,
      subtitle: b.category ?? undefined,
      type: 'business',
      latitude: b.latitude,
      longitude: b.longitude,
      distanceKm,
    });
  }

  const { data: posts } = await admin
    .from('posts')
    .select('id, title, content, category, latitude, longitude, location_label')
    .in('category', ['news', 'traffic', 'event'])
    .not('latitude', 'is', null)
    .order('created_at', { ascending: false })
    .limit(12);

  for (const p of posts ?? []) {
    if (!p.latitude || !p.longitude) continue;
    if (category === 'traffic' && p.category !== 'traffic') continue;
    if (category === 'historic' && p.category !== 'tourism') continue;
    const distanceKm = hasCoords ? haversineKm(lat, lng, p.latitude, p.longitude) : undefined;
    if (hasCoords && distanceKm != null && distanceKm > maxKm) continue;
    items.push({
      id: p.id,
      title: p.title ?? truncate(p.content, 60),
      subtitle: p.location_label ?? p.category,
      type: 'post',
      latitude: p.latitude,
      longitude: p.longitude,
      distanceKm,
    });
  }

  if (hasCoords) {
    items.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }

  return items.slice(0, 10);
}

async function buildMapOverlayData(
  admin: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.49.1').createClient>,
  regionId: string,
) {
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const points: Array<Record<string, unknown>> = [];

  const { data: hotPosts } = await admin
    .from('posts')
    .select('id, title, content, latitude, longitude, like_count, category')
    .eq('region_id', regionId)
    .not('latitude', 'is', null)
    .order('like_count', { ascending: false })
    .limit(5);

  for (const p of hotPosts ?? []) {
    if (!p.latitude || !p.longitude) continue;
    points.push({
      region_id: regionId,
      data_type: 'trend',
      latitude: p.latitude,
      longitude: p.longitude,
      payload: { label: p.title ?? truncate(p.content, 40), intensity: Math.min(p.like_count / 50, 1) },
      expires_at: expires,
    });
  }

  const { data: upcoming } = await admin
    .from('events')
    .select('id, title, latitude, longitude, starts_at')
    .eq('region_id', regionId)
    .not('latitude', 'is', null)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(4);

  for (const e of upcoming ?? []) {
    if (!e.latitude || !e.longitude) continue;
    points.push({
      region_id: regionId,
      data_type: 'live_event',
      latitude: e.latitude,
      longitude: e.longitude,
      payload: { label: e.title, eventId: e.id },
      expires_at: expires,
    });
  }

  if (points.length) {
    await admin.from('ai_map_data').delete().eq('region_id', regionId).lt('expires_at', new Date().toISOString());
    await admin.from('ai_map_data').insert(points);
  }

  return points;
}

async function handleRequest(
  admin: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.49.1').createClient>,
  userId: string,
  body: VoraAiPayload,
  textConfig: AiChatConfig | null,
  visionConfig: AiChatConfig | null,
): Promise<AiResult> {
  const { action, module, context = {} } = body;

  if (!MODULES.has(module)) {
    return { text: 'Geçersiz modül.', provider: 'vora' };
  }

  if (!(await isModuleEnabled(admin, module))) {
    return { text: 'Vora AI bu özellik şu an kapalı.', provider: 'vora' };
  }

  const systemPrompt =
    'Sen Vora AI adlı Karadeniz bölgesi sosyal uygulamasının yapay zekâ rehberisin. Türkçe, kısa ve net yanıt ver.';

  // Cache check for post summaries
  if (module === 'posts' && ['summarize', 'explain'].includes(action) && context.postId) {
    const { data: cached } = await admin
      .from('ai_summaries')
      .select('summary, provider')
      .eq('target_type', 'post')
      .eq('target_id', context.postId as string)
      .eq('action', action)
      .maybeSingle();
    if (cached?.summary) {
      return { text: cached.summary, provider: cached.provider ?? 'vora', cached: true };
    }
  }

  if (module === 'posts') {
    const postId = context.postId as string | undefined;
    const post = postId ? await fetchPostContext(admin, postId) : null;
    const content = (context.content as string) ?? post?.content ?? '';
    const title = (context.title as string | null) ?? post?.title;
    const locationLabel = (context.locationLabel as string) ?? post?.location_label;

    if (action === 'summarize') {
      let text = summarizeHeuristic(content, title);
      if (textConfig) {
        const ai = await askTextAi(textConfig, systemPrompt, `Bu gönderiyi 2-3 cümleyle özetle:\n${title ?? ''}\n${content}`);
        if (ai) text = ai;
      }
      if (postId) {
        await admin.from('ai_summaries').upsert({
          target_type: 'post',
          target_id: postId,
          action: 'summarize',
          summary: text,
          provider: aiProviderLabel(textConfig),
        }, { onConflict: 'target_type,target_id,action' });
      }
      return { text, provider: aiProviderLabel(textConfig) };
    }

    if (action === 'explain') {
      let text = `${title ? `${title}: ` : ''}${summarizeHeuristic(content, null)} Bu paylaşım ${post?.category ?? 'genel'} kategorisinde.`;
      if (textConfig) {
        const ai = await askTextAi(textConfig, systemPrompt, `Bu gönderiyi sade bir dille açıkla:\n${content}`);
        if (ai) text = ai;
      }
      return { text, provider: aiProviderLabel(textConfig) };
    }

    if (action === 'similar') {
      const { data: similar } = await admin
        .from('posts')
        .select('id, title, content, category')
        .eq('category', post?.category ?? 'general')
        .neq('id', postId ?? '')
        .order('created_at', { ascending: false })
        .limit(5);
      const items = (similar ?? []).map((p) => ({
        id: p.id,
        title: p.title ?? truncate(p.content, 50),
        subtitle: p.category,
        type: 'post',
      }));
      return {
        text: items.length ? `${items.length} benzer gönderi bulundu.` : 'Benzer gönderi bulunamadı.',
        provider: 'vora',
        items,
      };
    }

    if (action === 'location') {
      const label = locationLabel ?? post?.district ?? 'Konum bilgisi paylaşılmamış';
      const text = post?.latitude
        ? `${label} — Haritada işaretli bir konum.`
        : `Bu gönderide kesin konum yok. Metinden tahmin: ${truncate(content, 120)}`;
      return { text, provider: 'vora' };
    }

    if (action === 'event_time') {
      const text = post?.category === 'event'
        ? 'Etkinlik detayları gönderi metninde. Etkinlik Merkezi\'nden tam tarih ve bilet bilgisine ulaşabilirsin.'
        : 'Bu gönderi doğrudan bir etkinlik duyurusu gibi görünmüyor.';
      return { text, provider: 'vora' };
    }

    if (action === 'directions') {
      if (post?.latitude && post?.longitude) {
        return {
          text: `${locationLabel ?? 'Hedef'}: ${post.latitude.toFixed(4)}, ${post.longitude.toFixed(4)} — Harita üzerinden yol tarifi alabilirsin.`,
          provider: 'vora',
        };
      }
      return { text: 'Yol tarifi için gönderide konum bilgisi gerekli.', provider: 'vora' };
    }

    if (action === 'news') {
      const { data: news } = await admin
        .from('posts')
        .select('id, title, content')
        .eq('category', 'news')
        .order('created_at', { ascending: false })
        .limit(5);
      const items = (news ?? []).map((n) => ({
        id: n.id,
        title: n.title ?? truncate(n.content, 50),
        type: 'news',
      }));
      return {
        text: items.length ? 'İlgili son haberler:' : 'İlgili haber bulunamadı.',
        provider: 'vora',
        items,
      };
    }

    if (action === 'observe') {
      const mediaUrls = (context.mediaUrls as string[] | undefined) ?? (post?.media_urls as string[] | undefined) ?? [];
      const textContext = [title, content, locationLabel ? `Konum: ${locationLabel}` : null]
        .filter(Boolean)
        .join('\n');
      const analyzed = await analyzeMediaContext(admin, {
        textConfig,
        visionConfig,
        textContext,
        mediaUrls,
        mode: 'observe',
        context,
      });
      let commentId: string | null = null;
      if (context.postAsComment === true && postId) {
        commentId = await postVoraAiPostComment(admin, postId, analyzed.text);
      }
      if (postId) {
        await admin.from('ai_summaries').upsert({
          target_type: 'post',
          target_id: postId,
          action: 'observe',
          summary: analyzed.text,
          provider: analyzed.provider,
        }, { onConflict: 'target_type,target_id,action' });
      }
      return {
        ...analyzed,
        commentPosted: !!commentId,
        commentId: commentId ?? undefined,
      };
    }
  }

  if (module === 'reels') {
    const reelId = context.reelId as string | undefined;
    const reel = reelId ? await fetchReelContext(admin, reelId) : null;
    const caption = (context.caption as string) ?? reel?.caption ?? '';
    const musicTrack = Array.isArray(reel?.music_tracks) ? reel.music_tracks[0] : reel?.music_tracks;
    const musicTitle = (context.musicTitle as string) ?? musicTrack?.display_title ?? null;
    const musicArtist = (context.musicArtist as string) ?? musicTrack?.artist ?? null;
    const locationLabel = (context.locationLabel as string) ?? null;

    if (action === 'music') {
      const text = musicTitle
        ? `🎵 ${musicTitle}${musicArtist ? ` — ${musicArtist}` : ''}`
        : 'Bu reel\'de müzik bilgisi eklenmemiş.';
      return { text, provider: 'vora' };
    }

    if (action === 'location' || action === 'venue') {
      const label = locationLabel ?? 'Konum etiketi yok';
      let text = action === 'venue'
        ? `Mekân: ${label}. ${caption ? `Video açıklaması: ${truncate(caption, 100)}` : ''}`
        : `Tahmini konum: ${label}. Açıklamadan ipucu: ${truncate(caption, 80)}`;
      if (textConfig && caption) {
        const ai = await askTextAi(textConfig, systemPrompt, `Bu reel açıklamasından Karadeniz'deki yeri tahmin et: ${caption}`);
        if (ai) text = ai;
      }
      return { text, provider: aiProviderLabel(textConfig) };
    }

    if (action === 'similar') {
      const { data: similar } = await admin
        .from('reels')
        .select('id, caption')
        .neq('id', reelId ?? '')
        .order('view_count', { ascending: false })
        .limit(5);
      const items = (similar ?? []).map((r) => ({
        id: r.id,
        title: truncate(r.caption, 50) || 'Reel',
        type: 'reel',
      }));
      return { text: `${items.length} benzer reel önerildi.`, provider: 'vora', items };
    }

    if (action === 'analyze' || action === 'observe') {
      const mediaUrls =
        (context.mediaUrls as string[] | undefined) ??
        reelVisionUrls(reel) ??
        [];
      const textContext = [
        caption,
        locationLabel ? `Konum: ${locationLabel}` : null,
        musicTitle ? `Müzik: ${musicTitle}${musicArtist ? ` — ${musicArtist}` : ''}` : null,
      ]
        .filter(Boolean)
        .join('\n');
      const analyzed = await analyzeMediaContext(admin, {
        textConfig,
        visionConfig,
        textContext,
        mediaUrls,
        mode: 'observe',
        context,
      });
      let commentId: string | null = null;
      if (context.postAsComment === true && reelId) {
        commentId = await postVoraAiReelComment(admin, reelId, analyzed.text);
      }
      if (reelId) {
        await admin.from('ai_summaries').upsert({
          target_type: 'reel',
          target_id: reelId,
          action: 'observe',
          summary: analyzed.text,
          provider: analyzed.provider,
        }, { onConflict: 'target_type,target_id,action' });
      }
      return {
        ...analyzed,
        commentPosted: !!commentId,
        commentId: commentId ?? undefined,
      };
    }
  }

  if (module === 'map') {
    const lat = Number(context.latitude);
    const lng = Number(context.longitude);
    const category = (context.category as string | undefined) ?? (action !== 'nearby' ? action : undefined);
    const items = await fetchNearbyItems(admin, lat, lng, category);
    const label = category ?? 'genel';
    const nearest = items?.[0];
    const distanceHint =
      nearest?.distanceKm != null ? ` En yakın öneri ~${nearest.distanceKm.toFixed(1)} km.` : '';
    return {
      text: items?.length
        ? `Yakınında ${items.length} ${label} önerisi var.${distanceHint}`
        : 'Yakında öneri bulunamadı. Harita katmanlarını genişletmeyi dene.',
      provider: 'vora',
      items,
    };
  }

  if (module === 'events') {
    const regionId = (context.regionId as string) ?? 'trabzon';
    const { data: events } = await admin
      .from('events')
      .select('id, title, venue_name, starts_at')
      .eq('region_id', regionId)
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(8);

    const items = (events ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      subtitle: e.venue_name ?? new Date(e.starts_at).toLocaleString('tr-TR'),
      type: 'event',
    }));

    let text = action === 'tonight'
      ? 'Bu akşam için yakındaki etkinlikler:'
      : action === 'weather'
        ? 'Hava açıksa açık hava etkinlikleri, kapalıysa kapalı mekân etkinlikleri önerilir:'
        : 'Arkadaş grubu için uygun etkinlikler:';

    if (textConfig && items.length) {
      const ai = await askTextAi(
        textConfig,
        systemPrompt,
        `${text}\n${items.map((i) => i.title).join(', ')}`,
      );
      if (ai) text = ai;
    } else if (!items.length) {
      text = 'Yakında planlanmış etkinlik bulunamadı.';
    }

    await admin.from('ai_events').insert({
      user_id: userId,
      query: action,
      results: items,
      region_id: regionId,
    });

    return { text, provider: aiProviderLabel(textConfig), items };
  }

  if (module === 'comments') {
    const postId = context.postId as string | undefined;
    const reelId = context.reelId as string | undefined;
    const question = (context.question as string)?.trim() ?? '';
    const postAsComment = context.postAsComment === true;
    const parentId = (context.parentId as string | undefined) ?? null;

    if (action === 'observe' || action === 'ask') {
      let textContext = '';
      let mediaUrls: string[] = (context.mediaUrls as string[] | undefined) ?? [];
      let targetPostId: string | undefined = postId;
      let targetReelId: string | undefined = reelId;

      if (postId) {
        const post = await fetchPostContext(admin, postId);
        textContext = [post?.title, post?.content, post?.location_label ? `Konum: ${post.location_label}` : null]
          .filter(Boolean)
          .join('\n');
        if (!mediaUrls.length) mediaUrls = (post?.media_urls as string[] | undefined) ?? [];
      } else if (reelId) {
        const reel = await fetchReelContext(admin, reelId);
        const locationLabel = (context.locationLabel as string) ?? null;
        textContext = [
          reel?.caption,
          locationLabel ? `Konum: ${locationLabel}` : null,
        ]
          .filter(Boolean)
          .join('\n');
        if (!mediaUrls.length) mediaUrls = reelVisionUrls(reel);
      }

      const { data: comments } = postId
        ? await admin
          .from('post_comments')
          .select('content')
          .eq('post_id', postId)
          .order('created_at', { ascending: false })
          .limit(12)
        : reelId
        ? await admin
          .from('reel_comments')
          .select('content')
          .eq('reel_id', reelId)
          .order('created_at', { ascending: false })
          .limit(12)
        : { data: [] };

      const commentSummary = (comments ?? []).map((c) => c.content).join('\n- ');
      if (commentSummary) {
        textContext += `\n\nYorumlar:\n- ${truncate(commentSummary, 400)}`;
      }

      const mode = action === 'observe' || !question ? 'observe' : 'ask';
      const analyzed = await analyzeMediaContext(admin, {
        textConfig,
        visionConfig,
        textContext,
        mediaUrls,
        question: question || undefined,
        mode,
        context,
      });

      let commentId: string | null = null;
      if (postAsComment) {
        if (targetPostId) {
          commentId = await postVoraAiPostComment(admin, targetPostId, analyzed.text, parentId);
        } else if (targetReelId) {
          commentId = await postVoraAiReelComment(admin, targetReelId, analyzed.text, parentId);
        }
      }

      if (postId) {
        const { data: thread } = await admin
          .from('ai_comment_threads')
          .select('id, messages')
          .eq('post_id', postId)
          .eq('user_id', userId)
          .maybeSingle();

        const userContent = question || 'Görseli/videoyu incele';
        const messages = [
          ...((thread?.messages as unknown[]) ?? []),
          { role: 'user', content: userContent, createdAt: new Date().toISOString() },
          { role: 'assistant', content: analyzed.text, createdAt: new Date().toISOString() },
        ];

        if (thread?.id) {
          await admin.from('ai_comment_threads').update({ messages, updated_at: new Date().toISOString() }).eq('id', thread.id);
        } else {
          await admin.from('ai_comment_threads').insert({ post_id: postId, user_id: userId, messages });
        }
      }

      return {
        ...analyzed,
        commentPosted: !!commentId,
        commentId: commentId ?? undefined,
      };
    }
  }

  if (module === 'news' && action === 'digest') {
    const regionId = (context.regionId as string) ?? 'trabzon';
    const { data: news } = await admin
      .from('posts')
      .select('id, title, content, district')
      .eq('category', 'news')
      .eq('region_id', regionId)
      .order('created_at', { ascending: false })
      .limit(6);

    const headlines = (news ?? []).map((n) => n.title ?? truncate(n.content, 60));
    let text = headlines.length
      ? `📰 ${regionId} gündemi:\n${headlines.map((h) => `• ${h}`).join('\n')}`
      : 'Bu bölge için güncel haber bulunamadı.';

    if (textConfig && headlines.length) {
      const ai = await askTextAi(textConfig, systemPrompt, `Bu haber başlıklarını 3 cümleyle özetle:\n${headlines.join('\n')}`);
      if (ai) text = ai;
    }

    return { text, provider: aiProviderLabel(textConfig) };
  }

  if (module === 'recommendations' && action === 'personal') {
    const regionId = (context.regionId as string) ?? 'trabzon';
    const lat = Number(context.latitude);
    const lng = Number(context.longitude);

    const { data: memories } = await admin
      .from('ai_memories')
      .select('memory_key, value')
      .eq('user_id', userId);

    const cities = (memories ?? []).find((m) => m.memory_key === 'favorite_cities')?.value ?? [regionId];

    const { data: likedPosts } = await admin
      .from('post_likes')
      .select('posts (category, location_label)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(8);

    const categories = new Set<string>();
    for (const row of likedPosts ?? []) {
      const post = row.posts as { category?: string } | { category?: string }[] | null;
      const p = Array.isArray(post) ? post[0] : post;
      if (p?.category) categories.add(p.category);
    }

    const nearby = Number.isFinite(lat) && Number.isFinite(lng)
      ? await fetchNearbyItems(admin, lat, lng, undefined, 30)
      : [];

    const items: NonNullable<AiResult['items']> = nearby.slice(0, 5).map((item) => ({
      ...item,
      subtitle: item.distanceKm != null ? `${item.distanceKm.toFixed(1)} km` : item.subtitle,
    }));

    let text = `Sana özel öneriler (${Array.isArray(cities) ? cities.join(', ') : regionId}): `;
    if (categories.size) {
      text += `İlgi alanların: ${[...categories].slice(0, 3).join(', ')}. `;
    }
    if (items.length) {
      text += `Yakınında ${items.length} keşif noktası var — ${items.slice(0, 3).map((i) => i.title).join(', ')}.`;
    } else {
      text += 'Keşfet sekmesindeki trend içeriklere ve yakındaki etkinliklere göz at.';
    }

    if (textConfig && (items.length || categories.size)) {
      const ai = await askTextAi(
        textConfig,
        systemPrompt,
        `${text}\nKısa ve motive edici bir kişisel öneri paragrafı yaz.`,
      );
      if (ai) text = ai;
    }

    const recs = [
      { rec_type: 'feed', payload: { hint: 'trend_posts', regionId, categories: [...categories] }, score: 0.8 },
      { rec_type: 'events', payload: { hint: 'nearby_events', regionId }, score: 0.7 },
      ...items.map((item) => ({
        rec_type: item.type ?? 'place',
        payload: { id: item.id, title: item.title, distanceKm: item.distanceKm },
        score: 0.75,
      })),
    ];
    await admin.from('ai_recommendations').insert(
      recs.map((r) => ({ ...r, user_id: userId, expires_at: new Date(Date.now() + 86400000).toISOString() })),
    );

    return { text, provider: aiProviderLabel(textConfig), items };
  }

  if (module === 'trends' && action === 'detect') {
    const regionId = (context.regionId as string) ?? 'trabzon';
    const { data: trending } = await admin
      .from('posts')
      .select('id, title, content, like_count')
      .eq('region_id', regionId)
      .order('like_count', { ascending: false })
      .limit(5);

    const items = (trending ?? []).map((p) => ({
      id: p.id,
      title: p.title ?? truncate(p.content, 50),
      subtitle: `${p.like_count} beğeni`,
      type: 'trend',
    }));

    await buildMapOverlayData(admin, regionId);

    return {
      text: items.length ? 'Bölgedeki trend konular:' : 'Henüz belirgin bir trend yok.',
      provider: 'vora',
      items,
    };
  }

  if (module === 'map_animation' && action === 'refresh') {
    const regionId = (context.regionId as string) ?? 'trabzon';
    const points = await buildMapOverlayData(admin, regionId);
    return {
      text: `${points.length} canlı harita noktası güncellendi.`,
      provider: 'vora',
      items: points.map((p, i) => ({
        id: `overlay_${i}`,
        title: (p.payload as Record<string, string>)?.label ?? p.data_type as string,
        type: p.data_type as string,
        latitude: p.latitude as number,
        longitude: p.longitude as number,
      })),
    };
  }

  if (module === 'vision' && (action === 'analyze' || action === 'observe')) {
    const mediaUrls = (context.mediaUrls as string[] | undefined) ?? [];
    const textContext = (context.text as string | undefined) ?? (context.caption as string | undefined) ?? '';
    return analyzeMediaContext(admin, {
      textConfig,
      visionConfig,
      textContext,
      mediaUrls,
      question: (context.question as string | undefined),
      mode: context.question ? 'ask' : 'observe',
      context,
    });
  }

  return { text: 'Bu işlem henüz desteklenmiyor.', provider: 'vora' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;

    const { user, admin } = authResult;
    const textConfig = resolveTextAiConfig();
    const visionConfig = resolveVisionAiConfig();
    const body = (await req.json()) as VoraAiPayload;

    if (!body.action || !body.module) {
      return json({ error: 'action and module required' }, 400);
    }

    const result = await handleRequest(admin, user.id, body, textConfig, visionConfig);
    return json(result);
  } catch (error) {
    return jsonSafeError(error, 500);
  }
});
