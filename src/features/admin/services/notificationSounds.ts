import { Audio } from 'expo-av';
import type { NotificationEventType } from '@/constants/notifications';
import { MAX_NOTIFICATION_SOUND_SECONDS } from '@/constants/notifications';
import { validateSoundDuration } from '@/lib/notifications/soundSync';
import { supabase } from '@/lib/supabase/client';

export async function uploadNotificationSound(
  adminId: string,
  eventType: NotificationEventType,
  localUri: string,
  originalName: string,
): Promise<{ error: string | null }> {
  const duration = await getDuration(localUri);
  if (!validateSoundDuration(duration)) {
    return {
      error: `Ses dosyası en fazla ${MAX_NOTIFICATION_SOUND_SECONDS} saniye olabilir (mevcut: ${duration.toFixed(1)}s).`,
    };
  }

  const ext = originalName.split('.').pop()?.toLowerCase() ?? 'mp3';
  const filename = `${eventType}.${ext}`;
  const storagePath = `sounds/${filename}`;

  const response = await fetch(localUri);
  const buffer = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('notification-sounds')
    .upload(storagePath, buffer, {
      contentType: guessMime(ext),
      upsert: true,
    });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = supabase.storage.from('notification-sounds').getPublicUrl(storagePath);

  const { error: dbError } = await supabase
    .from('notification_sound_settings')
    .update({
      sound_storage_path: storagePath,
      sound_filename: filename,
      sound_url: urlData.publicUrl,
      duration_seconds: duration,
      is_custom_enabled: true,
      updated_by: adminId,
    })
    .eq('event_type', eventType);

  return { error: dbError?.message ?? null };
}

export async function removeNotificationSound(
  eventType: NotificationEventType,
): Promise<{ error: string | null }> {
  const { data: setting } = await supabase
    .from('notification_sound_settings')
    .select('sound_storage_path')
    .eq('event_type', eventType)
    .maybeSingle();

  if (setting?.sound_storage_path) {
    await supabase.storage.from('notification-sounds').remove([setting.sound_storage_path]);
  }

  const { error } = await supabase
    .from('notification_sound_settings')
    .update({
      sound_storage_path: null,
      sound_filename: null,
      sound_url: null,
      duration_seconds: null,
      is_custom_enabled: false,
    })
    .eq('event_type', eventType);

  return { error: error?.message ?? null };
}

async function getDuration(uri: string): Promise<number> {
  const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
  try {
    const status = await sound.getStatusAsync();
    if (!status.isLoaded) return 0;
    return (status.durationMillis ?? 0) / 1000;
  } finally {
    await sound.unloadAsync();
  }
}

function guessMime(ext: string): string {
  const map: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    caf: 'audio/x-caf',
  };
  return map[ext] ?? 'audio/mpeg';
}
