import { AI_MUSIC_TAG } from '@/features/ai-music/constants';
import type {
  AiMusicReferenceKind,
  AiMusicShare,
  AiMusicShareKind,
  AiMusicStatus,
  AiMusicStyle,
  AiMusicVocal,
  AiMusicWork,
  GenerateAiMusicInput,
} from '@/features/ai-music/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

const WORK_COLUMNS = `
  id, author_id, title, prompt, style, duration_sec, instrumental, vocal, lyrics,
  status, stage, progress, audio_url, cover_url, cover_storage_path, sound_id, music_track_id,
  copyright_code, rights_holder, rights_notice, reference_name, reference_kind, error_message,
  account_usage_count, share_count, approved_at, created_at
`;

type WorkRow = {
  id: string;
  author_id: string;
  title: string;
  prompt: string;
  style: string;
  duration_sec: number;
  instrumental: boolean;
  vocal: string | null;
  lyrics: string | null;
  status: string;
  stage: string | null;
  progress: number | null;
  audio_url: string | null;
  cover_url: string | null;
  cover_storage_path: string | null;
  sound_id: string | null;
  music_track_id: string | null;
  copyright_code: string;
  rights_holder: string;
  rights_notice: string;
  reference_name: string | null;
  reference_kind: string | null;
  error_message: string | null;
  account_usage_count: number;
  share_count: number;
  approved_at: string | null;
  created_at: string;
};

type ShareRow = {
  kind: string;
  content_id: string;
  author_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  caption: string | null;
  thumb_url: string | null;
  created_at: string;
};

export function mapAiMusicWork(row: WorkRow): AiMusicWork {
  return {
    id: row.id,
    authorId: row.author_id,
    title: row.title,
    prompt: row.prompt,
    style: row.style as AiMusicStyle,
    durationSec: Number(row.duration_sec),
    instrumental: row.instrumental,
    vocal: (row.vocal as AiMusicVocal) || (row.instrumental ? 'instrumental' : 'female'),
    lyrics: row.lyrics,
    status: row.status as AiMusicStatus,
    stage: row.stage ?? 'ready',
    progress: row.progress ?? (row.status === 'generating' ? 8 : 100),
    audioUrl: row.audio_url,
    coverUrl: row.cover_url,
    coverStoragePath: row.cover_storage_path,
    soundId: row.sound_id,
    musicTrackId: row.music_track_id,
    copyrightCode: row.copyright_code,
    rightsHolder: row.rights_holder,
    rightsNotice: row.rights_notice,
    referenceName: row.reference_name,
    referenceKind: (row.reference_kind as AiMusicReferenceKind | null) ?? null,
    errorMessage: row.error_message,
    accountUsageCount: row.account_usage_count,
    shareCount: row.share_count,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
  };
}

function mapShare(row: ShareRow): AiMusicShare {
  return {
    kind: row.kind as AiMusicShareKind,
    contentId: row.content_id,
    authorId: row.author_id,
    username: row.username ?? 'kullanici',
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    caption: row.caption ?? '',
    thumbUrl: row.thumb_url,
    createdAt: row.created_at,
  };
}

async function readFunctionError(error: unknown): Promise<string> {
  const response = (error as { context?: Response })?.context;
  if (response && typeof response.json === 'function') {
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) return body.error;
    } catch {
      /* yanıt gövdesi okunamadı */
    }
  }
  return 'Müzik üretilemedi. Biraz sonra yeniden dene.';
}

export async function generateAiMusic(
  input: GenerateAiMusicInput,
): Promise<{ work: AiMusicWork | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke<{ work?: WorkRow; error?: string }>(
    'elevenlabs-music',
    { body: input },
  );
  if (error) return { work: null, error: await readFunctionError(error) };
  if (data?.error) return { work: null, error: data.error };
  if (!data?.work) return { work: null, error: 'Üretim kaydı dönmedi.' };
  return { work: mapAiMusicWork(data.work), error: null };
}

export function startAiMusicGeneration(input: GenerateAiMusicInput): void {
  void generateAiMusic(input);
}

export async function fetchMyAiMusic(userId: string): Promise<AiMusicWork[]> {
  const { data, error } = await supabase
    .from('ai_music_works')
    .select(WORK_COLUMNS)
    .eq('author_id', userId)
    .neq('status', 'removed')
    .order('created_at', { ascending: false })
    .limit(60);
  if (error || !data) return [];
  return (data as WorkRow[]).map(mapAiMusicWork);
}

export async function fetchGeneratingAiMusic(userId: string): Promise<AiMusicWork[]> {
  const { data, error } = await supabase
    .from('ai_music_works')
    .select(WORK_COLUMNS)
    .eq('author_id', userId)
    .eq('status', 'generating')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error || !data) return [];
  return (data as WorkRow[]).map(mapAiMusicWork);
}

export async function fetchAiMusicWork(workId: string): Promise<AiMusicWork | null> {
  const { data, error } = await supabase
    .from('ai_music_works')
    .select(WORK_COLUMNS)
    .eq('id', workId)
    .maybeSingle();
  if (error || !data) return null;
  return mapAiMusicWork(data as WorkRow);
}

export async function approveAiMusicWork(workId: string): Promise<string | null> {
  const { error } = await supabase.rpc('approve_ai_music_work', { p_work_id: workId });
  return error ? supabaseErrorMessage(error) : null;
}

export async function publishAiMusicWork(
  workId: string,
): Promise<{ soundId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('publish_ai_music_work', { p_work_id: workId });
  if (error) return { soundId: null, error: supabaseErrorMessage(error) };
  return { soundId: (data as string | null) ?? null, error: null };
}

export async function setAiMusicCover(
  workId: string,
  coverUrl: string,
  coverStoragePath: string,
): Promise<{ previousPath: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('set_ai_music_cover', {
    p_work_id: workId,
    p_cover_url: coverUrl,
    p_cover_storage_path: coverStoragePath,
  });
  if (error) return { previousPath: null, error: supabaseErrorMessage(error) };
  const previousPath = typeof data === 'string' && data.length > 0 ? data : null;
  if (previousPath && previousPath !== coverStoragePath) {
    await supabase.storage.from('user-sounds').remove([previousPath]);
  }
  return { previousPath, error: null };
}

export async function updateAiMusicTitle(workId: string, title: string): Promise<string | null> {
  const { error } = await supabase.rpc('update_ai_music_work', {
    p_work_id: workId,
    p_title: title,
  });
  return supabaseErrorMessage(error);
}

export async function withdrawAiMusicWork(workId: string): Promise<string | null> {
  const { error } = await supabase.rpc('withdraw_ai_music_work', { p_work_id: workId });
  return supabaseErrorMessage(error);
}

export async function deleteAiMusicWork(workId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('delete_ai_music_work', { p_work_id: workId });
  if (error) return supabaseErrorMessage(error);
  const paths = data as {
    audio_path?: string | null;
    reference_path?: string | null;
    cover_path?: string | null;
  } | null;
  const files = [paths?.audio_path, paths?.reference_path, paths?.cover_path].filter(
    (path): path is string => !!path,
  );
  if (files.length > 0) {
    await supabase.storage.from('user-sounds').remove(files);
  }
  return null;
}

export async function fetchAiMusicShares(workId: string): Promise<AiMusicShare[]> {
  const { data, error } = await supabase.rpc('list_ai_music_shares', { p_work_id: workId });
  if (error || !data) return [];
  return (data as ShareRow[]).map(mapShare);
}

export function isAiMusicTag(tags: string[] | null | undefined): boolean {
  return Boolean(tags?.includes(AI_MUSIC_TAG));
}
