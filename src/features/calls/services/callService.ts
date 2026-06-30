import { canCallUser } from '@/features/moderation/services/interactions';
import { supabase } from '@/lib/supabase/client';
import type { CallSession, CallType } from '../types';
import { buildChannelName } from '../utils';

const SESSION_SELECT = `
  *,
  caller:caller_id (id, username, full_name, avatar_url),
  callee:callee_id (id, username, full_name, avatar_url)
`;

export async function fetchCallSession(sessionId: string): Promise<CallSession | null> {
  const { data, error } = await supabase
    .from('call_sessions')
    .select(SESSION_SELECT)
    .eq('id', sessionId)
    .maybeSingle();

  if (error) throw error;
  return data as CallSession | null;
}

export async function initiateCall(calleeId: string, callType: CallType, callerId: string) {
  const callCheck = await canCallUser(callerId, calleeId);
  if (!callCheck.allowed) {
    throw new Error(callCheck.error ?? 'Arama başlatılamadı');
  }

  const channelName = buildChannelName(callerId, calleeId);

  const { data, error } = await supabase
    .from('call_sessions')
    .insert({
      channel_name: channelName,
      caller_id: callerId,
      callee_id: calleeId,
      call_type: callType,
      status: 'ringing',
    })
    .select(SESSION_SELECT)
    .single();

  if (error) throw error;
  return data as CallSession;
}

export async function acceptCall(sessionId: string) {
  const { data, error } = await supabase
    .from('call_sessions')
    .update({
      status: 'accepted',
      started_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select(SESSION_SELECT)
    .single();

  if (error) throw error;
  return data as CallSession;
}

export async function declineCall(sessionId: string) {
  const { error } = await supabase
    .from('call_sessions')
    .update({
      status: 'declined',
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) throw error;
}

export async function cancelCall(sessionId: string) {
  const { error } = await supabase
    .from('call_sessions')
    .update({
      status: 'cancelled',
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) throw error;
}

export async function markCallMissed(sessionId: string) {
  const { error } = await supabase
    .from('call_sessions')
    .update({
      status: 'missed',
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .eq('status', 'ringing');

  if (error) throw error;
}

export async function endCall(sessionId: string) {
  const { error } = await supabase
    .from('call_sessions')
    .update({
      status: 'ended',
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) throw error;
}

export async function fetchCallableProfiles(excludeUserId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .neq('id', excludeUserId)
    .order('username')
    .limit(30);

  if (error) throw error;
  return data ?? [];
}
