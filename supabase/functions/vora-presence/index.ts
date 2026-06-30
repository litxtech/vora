import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  askChatCompletion,
  resolveTextAiConfig,
  type AiChatConfig,
} from '../_shared/aiChat.ts';
import { corsHeaders, json } from '../_shared/supabaseAuth.ts';
import { pickPersonaPhoto } from './personaMedia.ts';
import { generatePersonaProfile } from './personaCatalog.ts';
import { generatePersonas, personasCreatedToday } from './personaGenerator.ts';
import { runPersonaEngagement } from './personaEngagement.ts';
import {
  buildPostPrompt,
  fallbackPostContent,
  photoChanceForPersona,
  pickCategoryForPersona,
} from './personaContent.ts';

type PresenceConfig = {
  interval_minutes?: number;
  max_posts_per_run?: number;
  categories?: Record<string, boolean>;
  active_regions?: string[];
  allow_photos?: boolean;
  photo_chance?: number;
  allow_videos?: boolean;
  daily_persona_quota?: number;
  auto_daily_personas?: boolean;
  allow_engagement?: boolean;
  engagement_likes_per_run?: number;
  engagement_comments_per_run?: number;
  default_persona_gender?: 'female' | 'male' | 'mixed';
  persona_username_style?: 'underscore' | 'dot' | 'compact' | 'plain';
  persona_avatar_mode?: 'always' | 'never' | 'random';
  manual_persona_batch_max?: number;
};

type PersonaRow = {
  id: string;
  profile_id: string;
  persona_key: string;
  gender: string;
  display_name: string;
  region_id: string;
  district: string | null;
  bio: string;
  tone: string;
  post_count: number;
  last_post_at: string | null;
  avatar_seed: string;
  interests?: string[] | null;
};

const REGION_NAMES: Record<string, string> = {
  trabzon: 'Trabzon',
  rize: 'Rize',
  ordu: 'Ordu',
  samsun: 'Samsun',
  giresun: 'Giresun',
  artvin: 'Artvin',
};

function enabledCategories(config: PresenceConfig): string[] {
  const cats = config.categories ?? {};
  return Object.entries(cats)
    .filter(([, enabled]) => enabled === true)
    .map(([key]) => key);
}

function shouldAttachPhoto(config: PresenceConfig, category: string, personaKey: string): boolean {
  if (config.allow_photos === false) return false;
  const base = Math.min(Math.max(Number(config.photo_chance ?? 0.7), 0), 1);
  return photoChanceForPersona(base, category, personaKey, []);
}

async function generatePostContent(
  textConfig: AiChatConfig,
  persona: PersonaRow,
  category: string,
  withPhoto: boolean,
  recentPosts: Array<{ content: string; category: string }>,
): Promise<string | null> {
  const regionName = REGION_NAMES[persona.region_id] ?? persona.region_id;
  const prompt = buildPostPrompt(persona, regionName, category, withPhoto, recentPosts);

  return askChatCompletion(textConfig, [
    { role: 'system', content: prompt.system },
    { role: 'user', content: prompt.user },
  ], { temperature: 0.88, maxTokens: 120 });
}

function fallbackPost(
  persona: PersonaRow,
  category: string,
  withPhoto: boolean,
): string {
  const regionName = REGION_NAMES[persona.region_id] ?? persona.region_id;
  return fallbackPostContent(category, {
    regionName,
    district: persona.district ?? '',
    personaKey: persona.persona_key,
    postCount: persona.post_count,
    withPhoto,
  });
}

async function isMasterEnabled(admin: ReturnType<typeof createClient>): Promise<boolean> {
  const { data } = await admin.from('ai_settings').select('enabled').eq('module', 'master').maybeSingle();
  return data?.enabled !== false;
}

async function loadPresence(admin: ReturnType<typeof createClient>) {
  const { data } = await admin.from('ai_settings').select('enabled, config').eq('module', 'presence').maybeSingle();
  return {
    enabled: data?.enabled === true,
    config: (data?.config ?? {}) as PresenceConfig,
  };
}

async function finishRun(
  admin: ReturnType<typeof createClient>,
  runId: string | undefined,
  patch: Record<string, unknown>,
) {
  if (!runId) return;
  await admin.from('ai_presence_runs').update({
    finished_at: new Date().toISOString(),
    ...patch,
  }).eq('id', runId);
}

async function touchPersonaActivity(
  admin: ReturnType<typeof createClient>,
  persona: PersonaRow,
) {
  const now = new Date().toISOString();
  await admin.from('ai_personas').update({
    last_post_at: now,
    post_count: persona.post_count + 1,
    updated_at: now,
  }).eq('id', persona.id);

  await admin.from('profiles').update({
    last_seen_at: now,
    district: persona.district,
  }).eq('id', persona.profile_id);
}

async function maybeCreateDailyPersonas(
  admin: ReturnType<typeof createClient>,
  config: PresenceConfig,
): Promise<{ created: number; skipped: number }> {
  if (config.auto_daily_personas !== true) return { created: 0, skipped: 0 };

  const quota = Math.max(
    1,
    Math.min(
      Number(config.daily_persona_quota ?? 25),
      Number(config.manual_persona_batch_max ?? 100),
      200,
    ),
  );
  const today = await personasCreatedToday(admin);
  const need = quota - today;
  if (need <= 0) return { created: 0, skipped: 0 };

  const result = await generatePersonas(
    admin,
    need,
    config.default_persona_gender ?? 'mixed',
    {
      usernameStyle: config.persona_username_style,
      avatarMode: config.persona_avatar_mode,
    },
    Math.min(Number(config.manual_persona_batch_max ?? 100), 200),
  );
  return { created: result.created, skipped: result.skipped };
}

async function fetchRecentPostsMap(
  admin: ReturnType<typeof createClient>,
  profileIds: string[],
): Promise<Map<string, Array<{ content: string; category: string }>>> {
  const map = new Map<string, Array<{ content: string; category: string }>>();
  if (!profileIds.length) return map;

  const { data } = await admin
    .from('posts')
    .select('author_id, content, category, created_at')
    .in('author_id', profileIds)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(Math.min(profileIds.length * 5, 250));

  for (const row of (data ?? []) as Array<{ author_id: string; content: string; category: string }>) {
    const bucket = map.get(row.author_id) ?? [];
    if (bucket.length < 5) bucket.push({ content: row.content, category: row.category });
    map.set(row.author_id, bucket);
  }

  return map;
}

type PreparedPost = {
  persona: PersonaRow;
  category: string;
  withPhoto: boolean;
  content: string;
  mediaUrls: string[];
};

async function preparePersonaPost(
  textConfig: AiChatConfig | null,
  persona: PersonaRow,
  config: PresenceConfig,
  categories: string[],
  recentMap: Map<string, Array<{ content: string; category: string }>>,
  useAi: boolean,
): Promise<PreparedPost | null> {
  const recentPosts = recentMap.get(persona.profile_id) ?? [];
  const recentCategories = recentPosts.map((p) => p.category);
  const category = pickCategoryForPersona(
    persona.persona_key,
    categories,
    persona.post_count,
    recentCategories,
  );
  const withPhoto = shouldAttachPhoto(config, category, persona.persona_key);

  let content: string | null = null;
  if (useAi && textConfig) {
    content = await generatePostContent(textConfig, persona, category, withPhoto, recentPosts);
  }
  if (!content) content = fallbackPost(persona, category, withPhoto);
  content = content.trim().slice(0, 500);
  if (!content) return null;

  return {
    persona,
    category,
    withPhoto,
    content,
    mediaUrls: withPhoto
      ? [pickPersonaPhoto(category, persona.region_id, persona.persona_key, persona.post_count)]
      : [],
  };
}

async function publishPreparedPost(
  admin: ReturnType<typeof createClient>,
  prepared: PreparedPost,
): Promise<{ ok: boolean; detail: Record<string, unknown> }> {
  const { persona, category, content, mediaUrls } = prepared;

  const { data: post, error: postError } = await admin
    .from('posts')
    .insert({
      author_id: persona.profile_id,
      region_id: persona.region_id,
      district: persona.district,
      content,
      category,
      media_urls: mediaUrls,
      status: 'published',
      audience: 'public',
    })
    .select('id')
    .single();

  if (postError) {
    return { ok: false, detail: { persona_id: persona.id, error: postError.message } };
  }

  await touchPersonaActivity(admin, persona);
  return {
    ok: true,
    detail: {
      persona_id: persona.id,
      post_id: post?.id,
      region_id: persona.region_id,
      category,
      has_photo: mediaUrls.length > 0,
    },
  };
}

async function notifyFeedActivityForRegions(
  admin: ReturnType<typeof createClient>,
  details: Array<Record<string, unknown>>,
  postsCreated: number,
): Promise<number> {
  if (postsCreated <= 0) return 0;

  const byRegion = new Map<string, { count: number; samplePostId: string }>();
  for (const item of details) {
    const regionId = item.region_id;
    const postId = item.post_id;
    if (typeof regionId !== 'string' || typeof postId !== 'string') continue;
    const bucket = byRegion.get(regionId) ?? { count: 0, samplePostId: postId };
    bucket.count += 1;
    byRegion.set(regionId, bucket);
  }

  let notified = 0;
  for (const [regionId, meta] of byRegion) {
    const { data, error } = await admin.rpc('enqueue_regional_feed_activity', {
      p_region_id: regionId,
      p_sample_post_id: meta.samplePostId,
      p_post_count: meta.count,
      p_force: true,
    });
    if (!error && typeof data === 'number') notified += data;
  }

  return notified;
}

async function runPresence(
  admin: ReturnType<typeof createClient>,
  textConfig: AiChatConfig | null,
  options?: { force?: boolean; maxPosts?: number },
) {
  const runInsert = await admin
    .from('ai_presence_runs')
    .insert({ status: 'running' })
    .select('id')
    .single();
  const runId = runInsert.data?.id as string | undefined;

  try {
    if (!(await isMasterEnabled(admin))) {
      await finishRun(admin, runId, { status: 'skipped', details: { reason: 'master_disabled' } });
      return { ok: true, skipped: true, reason: 'master_disabled', posts_created: 0 };
    }

    const presence = await loadPresence(admin);
    if (!presence.enabled) {
      await finishRun(admin, runId, { status: 'skipped', details: { reason: 'presence_disabled' } });
      return { ok: true, skipped: true, reason: 'presence_disabled', posts_created: 0 };
    }

    const config = presence.config;
    const force = options?.force === true;

    const dailyPersonas = await maybeCreateDailyPersonas(admin, config);

    const intervalMinutes = Math.max(30, Number(config.interval_minutes ?? 120));
    const configMaxPosts = Math.max(1, Math.min(Number(config.max_posts_per_run ?? 25), 50));
    const categories = enabledCategories(config);
    const regions = config.active_regions ?? [];

    if (!categories.length) {
      await finishRun(admin, runId, { status: 'skipped', details: { reason: 'no_categories' } });
      return { ok: true, skipped: true, reason: 'no_categories', posts_created: 0, message: 'En az bir paylaşım kategorisi açık olmalı.' };
    }

    const cutoff = force ? null : new Date(Date.now() - intervalMinutes * 60_000).toISOString();

    let personaQuery = admin
      .from('ai_personas')
      .select(
        'id, profile_id, persona_key, gender, display_name, region_id, district, bio, tone, post_count, last_post_at, avatar_seed',
      )
      .eq('enabled', true)
      .order('last_post_at', { ascending: true, nullsFirst: true })
      .limit(force ? 200 : Math.min(configMaxPosts * 4, 200));

    if (cutoff) {
      personaQuery = personaQuery.or(`last_post_at.is.null,last_post_at.lt.${cutoff}`);
    }

    if (regions.length) {
      personaQuery = personaQuery.in('region_id', regions);
    }

    const { data: personas, error: personaError } = await personaQuery;
    if (personaError) throw new Error(personaError.message);

    const candidates = (personas ?? []) as PersonaRow[];
    if (!candidates.length) {
      const message = force
        ? 'Aktif persona bulunamadı. Önce persona profili oluşturun.'
        : 'Paylaşım zamanı gelen persona yok. Manuel tetikleme için admin panelinden tekrar deneyin.';
      await finishRun(admin, runId, {
        status: 'skipped',
        personas_considered: 0,
        details: { reason: 'no_persona_due', force },
      });
      return { ok: true, skipped: true, reason: 'no_persona_due', posts_created: 0, message };
    }

    let postTarget = configMaxPosts;
    if (force) {
      const requested = options?.maxPosts;
      postTarget = Math.min(
        candidates.length,
        50,
        requested && requested > 0 ? requested : candidates.length,
      );
    }

    const toProcess = candidates.slice(0, postTarget);
    const recentMap = await fetchRecentPostsMap(admin, toProcess.map((p) => p.profile_id));
    const useAi = !!textConfig;

    let postsCreated = 0;
    const details: Array<Record<string, unknown>> = [];
    const batchSize = 10;

    for (let i = 0; i < toProcess.length; i += batchSize) {
      const batch = toProcess.slice(i, i + batchSize);
      const preparedList = (
        await Promise.all(
          batch.map((persona) =>
            preparePersonaPost(textConfig, persona, config, categories, recentMap, useAi),
          ),
        )
      ).filter((item): item is PreparedPost => item !== null);

      for (const prepared of preparedList) {
        const result = await publishPreparedPost(admin, prepared);
        details.push(result.detail);
        if (result.ok) postsCreated += 1;
      }
    }

    await finishRun(admin, runId, {
      status: postsCreated > 0 ? 'completed' : 'failed',
      personas_considered: candidates.length,
      posts_created: postsCreated,
      details: { items: details, force, post_target: postTarget, use_ai: useAi },
      error_message: postsCreated === 0 ? 'Gönderi kaydedilemedi' : null,
    });

    if (postsCreated === 0) {
      const firstError = details.find((item) => item.error)?.error;
      return {
        ok: false,
        posts_created: 0,
        personas_considered: candidates.length,
        personas_created: dailyPersonas.created,
        details,
        error: typeof firstError === 'string' ? firstError : 'Gönderi oluşturulamadı.',
      };
    }

    let engagement = { likes: 0, comments: 0 };
    if (config.allow_engagement !== false) {
      const scale = Math.max(1, Math.ceil(postsCreated / 4));
      engagement = await runPersonaEngagement(admin, candidates, textConfig, {
        maxLikes: Math.max(0, Number(config.engagement_likes_per_run ?? 6)) * scale,
        maxComments: Math.max(0, Number(config.engagement_comments_per_run ?? 3)) * scale,
      });
    }

    const feedActivityNotified = await notifyFeedActivityForRegions(admin, details, postsCreated);

    return {
      ok: true,
      posts_created: postsCreated,
      personas_considered: candidates.length,
      personas_created: dailyPersonas.created,
      engagement_likes: engagement.likes,
      engagement_comments: engagement.comments,
      feed_activity_notified: feedActivityNotified,
      details,
      message: `${postsCreated}/${toProcess.length} persona paylaştı · ${engagement.likes} beğeni · ${engagement.comments} yorum`,
    };
  } catch (err) {
    await finishRun(admin, runId, {
      status: 'failed',
      error_message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

async function authorizeAdmin(
  admin: ReturnType<typeof createClient>,
  authHeader: string,
  serviceKey: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (authHeader === `Bearer ${serviceKey}`) {
    return { ok: true };
  }

  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!anonKey) return { ok: false, error: 'Sunucu yapılandırması eksik.' };

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return { ok: false, error: 'Oturum gerekli. Yeniden giriş yapın.' };
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (!profile || !['admin', 'super_admin'].includes(profile.role as string)) {
    return { ok: false, error: 'Bu işlem için admin yetkisi gerekli.' };
  }

  return { ok: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return json({ ok: false, error: 'Supabase credentials missing' });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const authHeader = req.headers.get('Authorization') ?? '';
    const body = await req.json().catch(() => ({}));
    const action = (body.action as string) ?? 'run';

    const auth = await authorizeAdmin(admin, authHeader, serviceKey);
    if (!auth.ok) {
      return json({ ok: false, error: auth.error });
    }

    if (action === 'seed') {
      const count = Math.min(Math.max(Number(body.count) || 12, 1), 16);
      const { data, error } = await admin.rpc('admin_seed_ai_personas', { p_target_count: count });
      if (error) return json({ ok: false, error: error.message });
      return json({ ok: true, ...(data as Record<string, unknown>) });
    }

    if (action === 'generate') {
      const presence = await loadPresence(admin);
      const config = presence.config;
      const maxBatch = Math.max(1, Math.min(Number(config.manual_persona_batch_max ?? body.max_batch ?? 100), 200));
      const count = Math.min(Math.max(Number(body.count) || 1, 1), maxBatch);
      const gender = (body.gender as string | undefined) ?? config.default_persona_gender ?? 'mixed';
      const options = {
        usernameStyle: (body.username_style ?? config.persona_username_style ?? 'underscore') as PresenceConfig['persona_username_style'],
        avatarMode: (body.avatar_mode ?? config.persona_avatar_mode ?? 'always') as PresenceConfig['persona_avatar_mode'],
        regionId: typeof body.region_id === 'string' ? body.region_id : undefined,
      };
      const result = await generatePersonas(admin, count, gender, options, maxBatch);
      return json({ ok: true, ...result, total: result.created });
    }

    if (action === 'suggest') {
      const presence = await loadPresence(admin);
      const config = presence.config;
      const gender = body.gender === 'male' ? 'male' : 'female';
      const regionId = typeof body.region_id === 'string' ? body.region_id : undefined;
      const profile = generatePersonaProfile(gender, regionId, undefined, {
        usernameStyle: (body.username_style ?? config.persona_username_style ?? 'underscore') as PresenceConfig['persona_username_style'],
        avatarMode: (body.avatar_mode ?? config.persona_avatar_mode ?? 'always') as PresenceConfig['persona_avatar_mode'],
      });
      return json({ ok: true, profile });
    }

    if (action === 'run') {
      const textConfig = resolveTextAiConfig();
      const force = body.force === true || body.source === 'admin';
      const maxPosts = Number(body.max_posts);
      const result = await runPresence(admin, textConfig, {
        force,
        maxPosts: Number.isFinite(maxPosts) && maxPosts > 0 ? maxPosts : undefined,
      });
      return json(result);
    }

    return json({ ok: false, error: 'Bilinmeyen işlem.' });
  } catch (error) {
    console.error('[vora-presence]', error);
    const message = error instanceof Error ? error.message : String(error);
    return json({ ok: false, error: message || 'Beklenmeyen hata.' });
  }
});
