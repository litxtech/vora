import type { SafetyCenterData, SafetyPreferences } from '@/features/moderation/types';
import { supabase } from '@/lib/supabase/client';
import type { ReportReason } from '@/types/database';
import { supabaseErrorMessage } from '@/lib/errors';

export async function fetchSafetyCenter(userId: string): Promise<SafetyCenterData> {
  const [profileRes, warningsRes, reportsRes, blocksRes, mutesRes, sessionsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('trust_score, account_status, safety_preferences')
      .eq('id', userId)
      .single(),
    supabase
      .from('user_warnings')
      .select('id, level, reason, expires_at, acknowledged_at, created_at')
      .eq('user_id', userId)
      .is('acknowledged_at', null)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('content_reports')
      .select('id, target_type, target_id, reason, status, created_at')
      .eq('reporter_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('user_blocks').select('blocked_id', { count: 'exact', head: true }).eq('blocker_id', userId),
    supabase.from('user_mutes').select('muted_id', { count: 'exact', head: true }).eq('muter_id', userId),
    supabase
      .from('user_sessions')
      .select('id, device_name, device_type, last_active_at, is_current')
      .eq('user_id', userId)
      .order('last_active_at', { ascending: false })
      .limit(10),
  ]);

  const profile = profileRes.data;

  return {
    trustScore: profile?.trust_score ?? 0,
    accountStatus: profile?.account_status ?? 'active',
    activeWarnings: (warningsRes.data ?? []).map((w) => ({
      id: w.id,
      level: w.level as SafetyCenterData['activeWarnings'][0]['level'],
      reason: w.reason,
      expiresAt: w.expires_at,
      acknowledgedAt: w.acknowledged_at,
      createdAt: w.created_at,
    })),
    reportHistory: (reportsRes.data ?? []).map((r) => ({
      id: r.id,
      targetType: r.target_type,
      targetId: r.target_id,
      reason: r.reason as ReportReason,
      status: r.status ?? 'pending',
      createdAt: r.created_at,
    })),
    blockedCount: blocksRes.count ?? 0,
    mutedCount: mutesRes.count ?? 0,
    sessions: (sessionsRes.data ?? []).map((s) => ({
      id: s.id,
      deviceName: s.device_name,
      deviceType: s.device_type,
      lastActiveAt: s.last_active_at,
      isCurrent: s.is_current,
    })),
  };
}

export async function acknowledgeWarning(warningId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('user_warnings')
    .update({ acknowledged_at: new Date().toISOString() })
    .eq('id', warningId);
  return { error: supabaseErrorMessage(error) };
}

export async function fetchSafetyPreferences(userId: string): Promise<SafetyPreferences> {
  const { data } = await supabase
    .from('profiles')
    .select('safety_preferences')
    .eq('id', userId)
    .single();

  const prefs = (data?.safety_preferences ?? {}) as Partial<SafetyPreferences>;
  return {
    show_sensitive_content: prefs.show_sensitive_content ?? false,
    blur_sensitive_content: prefs.blur_sensitive_content ?? true,
  };
}

export async function updateSafetyPreferences(
  userId: string,
  prefs: Partial<SafetyPreferences>,
): Promise<{ error: string | null }> {
  const current = await fetchSafetyPreferences(userId);
  const { error } = await supabase
    .from('profiles')
    .update({ safety_preferences: { ...current, ...prefs } })
    .eq('id', userId);
  return { error: supabaseErrorMessage(error) };
}

export async function revokeSession(sessionId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('user_sessions').delete().eq('id', sessionId);
  return { error: supabaseErrorMessage(error) };
}
