import type { NotificationEventType } from '@/constants/notifications';
import { MAX_NOTIFICATION_SOUND_SECONDS } from '@/constants/notifications';
import {
  ALLOWED_SOUND_EXTENSIONS,
  SOUND_MIME_TYPES,
  parseSoundExtension,
  soundSlugForEvent,
} from '@/lib/notifications/soundConstants';
import { validateSoundDuration, getAudioDurationSeconds } from '@/lib/notifications/soundSync';
import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export async function uploadNotificationSound(
  adminId: string,
  eventType: NotificationEventType,
  localUri: string,
  originalName: string,
): Promise<{ error: string | null }> {
  const ext = parseSoundExtension(originalName);
  if (!ext) {
    return {
      error: `Desteklenen formatlar: ${ALLOWED_SOUND_EXTENSIONS.join(', ').toUpperCase()}. WAV önerilir.`,
    };
  }

  const duration = await getAudioDurationSeconds(localUri);
  if (!validateSoundDuration(duration)) {
    return {
      error: `Ses dosyası en fazla ${MAX_NOTIFICATION_SOUND_SECONDS} saniye olabilir (mevcut: ${duration.toFixed(1)}s).`,
    };
  }

  const slug = soundSlugForEvent(eventType);
  const filename = `${slug}.${ext}`;
  const storagePath = `sounds/${filename}`;

  const buffer = await readLocalFileBytes(localUri);

  const { error: uploadError } = await supabase.storage
    .from('notification-sounds')
    .upload(storagePath, buffer, {
      contentType: SOUND_MIME_TYPES[ext],
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

  return { error: supabaseErrorMessage(error) };
}
