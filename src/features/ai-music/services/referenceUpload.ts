import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import type { AiMusicReferenceKind, AiMusicReferenceSource } from '@/features/ai-music/types';
import { prepareSoundAudioForUpload } from '@/features/sounds/services/prepareSoundAudioForUpload';
import { uploadSoundAudio } from '@/features/sounds/services/soundUpload';
import { supabase } from '@/lib/supabase/client';

export type AiMusicReferenceFile = {
  path: string;
  name: string;
  kind: AiMusicReferenceKind;
  source: AiMusicReferenceSource;
  durationSec: number | null;
};

export async function pickAiMusicReference(
  kind: AiMusicReferenceKind,
): Promise<{ file: AiMusicReferenceFile | null; error: string | null }> {
  if (kind === 'video') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { file: null, error: 'Galeri izni gerekli.' };
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });
    if (picked.canceled || !picked.assets[0]?.uri) return { file: null, error: null };
    const asset = picked.assets[0];
    return uploadReference(asset.uri, asset.fileName ?? 'Video', 'video', 'upload', null);
  }

  const picked = await DocumentPicker.getDocumentAsync({
    type: ['audio/*', 'video/*', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'video/mp4'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled || !picked.assets[0]?.uri) return { file: null, error: null };
  const asset = picked.assets[0];
  const mime = asset.mimeType ?? '';
  const fileKind: AiMusicReferenceKind = mime.startsWith('video') ? 'video' : 'audio';
  return uploadReference(asset.uri, asset.name ?? 'Referans', fileKind, 'upload', null);
}

export async function uploadAiMusicVoiceRecording(
  uri: string,
  durationSec: number,
): Promise<{ file: AiMusicReferenceFile | null; error: string | null }> {
  return uploadReference(uri, 'Ses kaydın', 'audio', 'recording', durationSec);
}

async function uploadReference(
  uri: string,
  name: string,
  kind: AiMusicReferenceKind,
  source: AiMusicReferenceSource,
  durationSec: number | null,
): Promise<{ file: AiMusicReferenceFile | null; error: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { file: null, error: 'Giriş gerekli.' };

  const prepared = await prepareSoundAudioForUpload(uri, { mode: 'aggressive' });
  if (!prepared.ok) return { file: null, error: prepared.error };

  const uploaded = await uploadSoundAudio(userId, prepared.uri);
  if (uploaded.error || !uploaded.path) {
    return { file: null, error: uploaded.error ?? 'Referans yüklenemedi.' };
  }
  return { file: { path: uploaded.path, name, kind, source, durationSec }, error: null };
}
