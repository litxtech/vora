import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import type { RegionId } from '@/constants/regions';

export type CityVoiceRoom = {
  id: string;
  livekitRoomName: string;
  roomType: string;
  regionIds: RegionId[];
  title: string;
  status: string;
  listenerCount: number;
  startedAt: string;
  diplomacyRequestId: string | null;
};

export type CityVoiceParticipant = {
  id: string;
  userId: string;
  regionId: RegionId | null;
  role: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
};

export type LiveKitTokenResponse = {
  token: string;
  url: string;
  roomName: string;
  canPublish: boolean;
};

export async function fetchCityVoiceRoom(roomId: string): Promise<CityVoiceRoom | null> {
  const { data, error } = await supabase
    .from('city_voice_rooms')
    .select('id, livekit_room_name, room_type, region_ids, title, status, listener_count, started_at, diplomacy_request_id')
    .eq('id', roomId)
    .maybeSingle();

  if (error) throw new Error(supabaseErrorMessage(error));
  if (!data) return null;

  return {
    id: data.id,
    livekitRoomName: data.livekit_room_name,
    roomType: data.room_type,
    regionIds: data.region_ids as RegionId[],
    title: data.title,
    status: data.status,
    listenerCount: data.listener_count,
    startedAt: data.started_at,
    diplomacyRequestId: data.diplomacy_request_id,
  };
}

export async function joinCityVoiceRoom(roomId: string): Promise<void> {
  const { error } = await supabase.rpc('join_city_voice_room', { p_room_id: roomId });
  if (error) throw new Error(supabaseErrorMessage(error));
}

export async function leaveCityVoiceRoom(roomId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_city_voice_room', { p_room_id: roomId });
  if (error) throw new Error(supabaseErrorMessage(error));
}

export async function requestSpeaker(roomId: string): Promise<void> {
  const { error } = await supabase.rpc('request_city_voice_speaker', { p_room_id: roomId });
  if (error) throw new Error(supabaseErrorMessage(error));
}

export async function approveSpeaker(roomId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('approve_city_voice_speaker', {
    p_room_id: roomId,
    p_user_id: userId,
  });
  if (error) throw new Error(supabaseErrorMessage(error));
}

export async function endCityVoiceRoom(roomId: string): Promise<void> {
  const { error } = await supabase.rpc('end_city_voice_room', { p_room_id: roomId });
  if (error) throw new Error(supabaseErrorMessage(error));
}

export async function fetchLiveKitToken(roomId: string): Promise<LiveKitTokenResponse> {
  const { data, error } = await supabase.functions.invoke<LiveKitTokenResponse>('livekit-token', {
    body: { roomId },
  });
  if (error) throw error;
  if (!data?.token) throw new Error('LiveKit token alınamadı');
  return data;
}

export async function fetchRoomParticipants(roomId: string): Promise<CityVoiceParticipant[]> {
  const { data, error } = await supabase
    .from('city_voice_room_participants')
    .select('id, user_id, region_id, role, profiles:user_id (username, full_name, avatar_url)')
    .eq('room_id', roomId)
    .is('left_at', null);

  if (error) throw new Error(supabaseErrorMessage(error));

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      userId: row.user_id,
      regionId: row.region_id as RegionId | null,
      role: row.role,
      username: profile?.username ?? 'user',
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    };
  });
}

export async function fetchSpeakerRequests(roomId: string) {
  const { data, error } = await supabase
    .from('city_voice_speaker_requests')
    .select('id, user_id, region_id, status, profiles:user_id (username, full_name, avatar_url)')
    .eq('room_id', roomId)
    .eq('status', 'pending');

  if (error) throw new Error(supabaseErrorMessage(error));
  return data ?? [];
}

export function roomSharePath(roomId: string): string {
  return `/room/${roomId}`;
}

export function buildRoomShareMessage(title: string, listenerCount: number, url: string): string {
  return `🔴 ${title} VORA'DA CANLI\n\nŞu anda ${listenerCount} kişi içeride.\n\nVora'ya Gel.\n${url}`;
}
