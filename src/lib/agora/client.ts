import { env } from '@/config/env';
import { supabase } from '@/lib/supabase/client';

export type CallType = 'audio' | 'video';

export type AgoraTokenResponse = {
  token: string;
  channelName: string;
  uid: number;
  expiresAt: number;
};

/**
 * Agora RTC token'ı Supabase Edge Function ile alınır.
 * react-native-agora entegrasyonu development build gerektirir.
 */
export async function fetchAgoraToken(
  channelName: string,
  callType: CallType,
  sessionId: string,
) {
  if (!env.agora.appId) {
    throw new Error('EXPO_PUBLIC_AGORA_APP_ID tanımlanmalı.');
  }

  const { data, error } = await supabase.functions.invoke<AgoraTokenResponse>('agora-token', {
    body: { channelName, callType, sessionId },
  });

  if (error) throw error;
  if (!data?.token) throw new Error('Agora token alınamadı.');

  return data;
}

export function getAgoraAppId(): string {
  return env.agora.appId;
}
