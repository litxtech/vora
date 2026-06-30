import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage, toUserFacingError } from '@/lib/errors';

export type VoraPresenceConfig = {
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

export type VoraPresenceSettings = {
  enabled: boolean;
  master_enabled: boolean;
  config: VoraPresenceConfig;
};

export type AiPersonaRow = {
  id: string;
  profile_id: string;
  persona_key: string;
  gender: string;
  display_name: string;
  username: string;
  region_id: string;
  district: string | null;
  bio: string;
  enabled: boolean;
  post_count: number;
  last_post_at: string | null;
  avatar_url: string | null;
};

export type VoraPresenceStats = {
  personas_total: number;
  personas_active: number;
  personas_today?: number;
  posts_total: number;
  last_run: {
    started_at: string;
    status: string;
    posts_created: number;
    details?: Record<string, unknown>;
  } | null;
};

const DEFAULT_PRESENCE_CONFIG: VoraPresenceConfig = {
  interval_minutes: 120,
  max_posts_per_run: 25,
  categories: {
    general: true,
    daily: true,
    entertainment: true,
    event: false,
    business: false,
    news: false,
    traffic: false,
    job: false,
    lost_found: false,
    emergency: false,
  },
  active_regions: ['trabzon', 'rize', 'ordu', 'samsun', 'giresun', 'artvin'],
  allow_photos: true,
  photo_chance: 0.7,
  allow_videos: false,
  daily_persona_quota: 25,
  auto_daily_personas: false,
  allow_engagement: true,
  engagement_likes_per_run: 6,
  engagement_comments_per_run: 3,
  default_persona_gender: 'mixed',
  persona_username_style: 'underscore',
  persona_avatar_mode: 'always',
  manual_persona_batch_max: 100,
};

async function readFunctionError(error: unknown): Promise<string> {
  if (!error || typeof error !== 'object') return 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';
  const message = 'message' in error && typeof error.message === 'string' ? error.message : null;
  const context = 'context' in error ? (error as { context?: Response }).context : undefined;
  if (context && typeof context.json === 'function') {
    try {
      const payload = (await context.json()) as { error?: string; ok?: boolean };
      if (payload?.error) {
        return toUserFacingError(payload.error, { fallback: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.' });
      }
    } catch {
      // ignore parse errors
    }
  }
  return toUserFacingError(message, { fallback: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.' });
}

export async function fetchVoraPresenceSettings(): Promise<VoraPresenceSettings> {
  const { data, error } = await supabase.rpc('admin_get_vora_presence_config');
  if (error || !data) {
    return { enabled: false, master_enabled: true, config: DEFAULT_PRESENCE_CONFIG };
  }
  const row = data as { enabled?: boolean; master_enabled?: boolean; config?: VoraPresenceConfig };
  return {
    enabled: row.enabled === true,
    master_enabled: row.master_enabled !== false,
    config: { ...DEFAULT_PRESENCE_CONFIG, ...(row.config ?? {}) },
  };
}

export async function updateVoraPresenceSettings(
  enabled: boolean,
  config: VoraPresenceConfig,
  adminId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_update_vora_presence_config', {
    p_enabled: enabled,
    p_config: config,
    p_admin_id: adminId,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function setVoraMasterEnabled(
  enabled: boolean,
  adminId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_set_vora_master_enabled', {
    p_enabled: enabled,
    p_admin_id: adminId,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function fetchAiPersonas(limit = 200): Promise<AiPersonaRow[]> {
  const { data, error } = await supabase.rpc('admin_list_ai_personas', { p_limit: limit });
  if (error || !data) return [];
  return data as AiPersonaRow[];
}

export type AiPersonaContentStats = {
  personas_total: number;
  personas_active: number;
  posts_total: number;
  comments_total: number;
};

export type AiPersonaDeletePostsResult = {
  posts_deleted?: number;
  comments_deleted?: number;
  likes_deleted?: number;
  personas_affected?: number;
};

export async function fetchAiPersonaContentStats(): Promise<AiPersonaContentStats | null> {
  const { data, error } = await supabase.rpc('admin_ai_persona_content_stats');
  if (error || !data) return null;
  return data as AiPersonaContentStats;
}

export async function deleteAiPersonaPosts(
  personaId?: string,
): Promise<{ error: string | null; result?: AiPersonaDeletePostsResult }> {
  const { data, error } = await supabase.rpc('admin_delete_ai_persona_posts', {
    p_persona_id: personaId ?? null,
  });
  if (error) return { error: supabaseErrorMessage(error)! };
  return { error: null, result: data as AiPersonaDeletePostsResult };
}

export async function deleteAiPersona(
  personaId: string,
): Promise<{ error: string | null; displayName?: string }> {
  const { data, error } = await supabase.rpc('admin_delete_ai_persona', {
    p_persona_id: personaId,
  });
  if (error) return { error: supabaseErrorMessage(error)! };
  const row = data as { display_name?: string } | null;
  return { error: null, displayName: row?.display_name };
}

export async function deleteAllAiPersonas(): Promise<{ error: string | null; deleted?: number }> {
  const { data, error } = await supabase.rpc('admin_delete_all_ai_personas');
  if (error) return { error: supabaseErrorMessage(error)! };
  const row = data as { personas_deleted?: number } | null;
  return { error: null, deleted: row?.personas_deleted ?? 0 };
}

export async function setAiPersonaEnabled(
  personaId: string,
  enabled: boolean,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_set_ai_persona_enabled', {
    p_persona_id: personaId,
    p_enabled: enabled,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function fetchVoraPresenceStats(): Promise<VoraPresenceStats | null> {
  const { data, error } = await supabase.rpc('admin_vora_presence_stats');
  if (error || !data) return null;
  return data as VoraPresenceStats;
}

export type CreateAiPersonaInput = {
  username: string;
  fullName: string;
  gender: 'female' | 'male';
  regionId: string;
  district?: string;
  bio?: string;
  avatarUrl?: string;
};

export type RunPresenceResult = {
  error: string | null;
  posts_created?: number;
  message?: string;
  skipped?: boolean;
  reason?: string;
};

export async function createAiPersona(
  input: CreateAiPersonaInput,
): Promise<{ error: string | null; username?: string }> {
  const { data, error } = await supabase.rpc('admin_create_ai_persona', {
    p_username: input.username,
    p_full_name: input.fullName,
    p_gender: input.gender,
    p_region_id: input.regionId,
    p_district: input.district ?? null,
    p_bio: input.bio ?? '',
    p_avatar_url: input.avatarUrl ?? null,
  });
  if (error) return { error: supabaseErrorMessage(error)! };
  const result = data as { ok?: boolean; error?: string; username?: string } | null;
  if (!result?.ok) return { error: result?.error ?? 'Profil oluşturulamadı.' };
  return { error: null, username: result.username };
}

export async function generateAiPersonas(
  count: number,
  gender: 'female' | 'male' | 'mixed' = 'mixed',
  options?: Pick<
    VoraPresenceConfig,
    'persona_username_style' | 'persona_avatar_mode' | 'manual_persona_batch_max'
  >,
): Promise<{ error: string | null; created?: number; skipped?: number }> {
  const maxBatch = Math.max(1, Math.min(options?.manual_persona_batch_max ?? 100, 200));
  const { data, error } = await supabase.functions.invoke('vora-presence', {
    body: {
      action: 'generate',
      count: Math.min(count, maxBatch),
      gender,
      username_style: options?.persona_username_style,
      avatar_mode: options?.persona_avatar_mode,
      max_batch: maxBatch,
    },
  });
  if (error) return { error: await readFunctionError(error) };
  const result = data as { ok?: boolean; error?: string; created?: number; skipped?: number };
  if (result?.ok === false || result?.error) return { error: result.error ?? 'Profil üretilemedi.' };
  return { error: null, created: result.created ?? 0, skipped: result.skipped ?? 0 };
}

export type SuggestedPersona = {
  username: string;
  fullName: string;
  gender: 'female' | 'male';
  regionId: string;
  district: string;
  bio: string;
  avatarUrl: string;
};

export async function suggestKaradenizPersona(
  gender: 'female' | 'male',
  regionId: string,
  options?: Pick<VoraPresenceConfig, 'persona_username_style' | 'persona_avatar_mode'>,
): Promise<{ error: string | null; profile?: SuggestedPersona }> {
  const { data, error } = await supabase.functions.invoke('vora-presence', {
    body: {
      action: 'suggest',
      gender,
      region_id: regionId,
      username_style: options?.persona_username_style,
      avatar_mode: options?.persona_avatar_mode,
    },
  });
  if (error) return { error: await readFunctionError(error) };
  const result = data as { ok?: boolean; profile?: SuggestedPersona; error?: string };
  if (result?.error) return { error: result.error };
  return { error: null, profile: result.profile };
}

export async function runVoraPresenceNow(
  maxPosts?: number,
): Promise<RunPresenceResult> {
  const { data, error } = await supabase.functions.invoke('vora-presence', {
    body: {
      action: 'run',
      source: 'admin',
      force: true,
      ...(maxPosts && maxPosts > 0 ? { max_posts: maxPosts } : {}),
    },
  });
  if (error) return { error: await readFunctionError(error) };
  const result = data as {
    ok?: boolean;
    error?: string;
    message?: string;
    posts_created?: number;
    skipped?: boolean;
    reason?: string;
  };
  if (result?.ok === false || result?.error) {
    return { error: result.error ?? result.message ?? 'Paylaşım tetiklenemedi.' };
  }
  if (result?.skipped) {
    return {
      error: null,
      posts_created: 0,
      skipped: true,
      reason: result.reason,
      message: result.message ?? 'Paylaşım atlandı.',
    };
  }
  return {
    error: null,
    posts_created: result.posts_created ?? 0,
    message: result.message,
    skipped: result.skipped,
    reason: result.reason,
  };
}
