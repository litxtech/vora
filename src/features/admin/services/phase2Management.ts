import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

// AI Moderation
export type AiModerationRow = {
  id: string;
  user_id: string | null;
  username: string | null;
  target_type: string | null;
  target_id: string | null;
  text_sample: string | null;
  flags: unknown;
  score: number | null;
  action: string;
  provider: string;
  created_at: string;
};

export async function fetchAiModerationQueue(): Promise<AiModerationRow[]> {
  const { data, error } = await supabase.rpc('admin_list_ai_moderation_queue', { p_limit: 50 });
  if (error || !data) return [];
  return data as AiModerationRow[];
}

export async function resolveAiModeration(logId: string, action: 'allowed' | 'blocked', note?: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_resolve_ai_moderation', { p_log_id: logId, p_action: action, p_note: note ?? null });
  return { error: supabaseErrorMessage(error) };
}

// Messaging actions
export async function getMessagingContext(targetType: string, targetId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase.rpc('admin_get_messaging_context', { p_target_type: targetType, p_target_id: targetId });
  if (error || !data) return null;
  return data as Record<string, unknown>;
}

export async function lockConversation(conversationId: string, lock: boolean, reason?: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_lock_conversation', { p_conversation_id: conversationId, p_lock: lock, p_reason: reason ?? null });
  return { error: supabaseErrorMessage(error) };
}

export async function platformMuteUser(userId: string, hours = 24, reason?: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_platform_mute_user', { p_user_id: userId, p_hours: hours, p_reason: reason ?? null });
  return { error: supabaseErrorMessage(error) };
}

// Tasks
export type DailyTaskRow = {
  key: string;
  title: string;
  description: string;
  target_count: number;
  reward_type: string;
  reward_value: number;
  reward_key: string | null;
  sort_order: number;
  is_active: boolean;
};

export async function fetchDailyTasks(): Promise<DailyTaskRow[]> {
  const { data, error } = await supabase.rpc('admin_list_daily_tasks');
  if (error || !data) return [];
  return data as DailyTaskRow[];
}

export async function updateDailyTask(task: Pick<DailyTaskRow, 'key' | 'title' | 'description' | 'target_count' | 'reward_value' | 'is_active'>): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_update_daily_task', {
    p_key: task.key,
    p_title: task.title,
    p_description: task.description,
    p_target_count: task.target_count,
    p_reward_value: task.reward_value,
    p_is_active: task.is_active,
  });
  return { error: supabaseErrorMessage(error) };
}

// Hashtags
export type HashtagRow = {
  id: string;
  tag: string;
  post_count: number;
  is_hidden: boolean;
  is_featured: boolean;
  created_at: string;
};

export async function fetchHashtags(
  search?: string,
  limit = 30,
  offset = 0,
): Promise<HashtagRow[]> {
  const { data, error } = await supabase.rpc('admin_list_hashtags', {
    p_limit: limit,
    p_offset: offset,
    p_search: search?.trim() || null,
  });
  if (error || !data) return [];
  return data as HashtagRow[];
}

export async function setHashtagFlags(hashtagId: string, hidden?: boolean, featured?: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_set_hashtag_flags', {
    p_hashtag_id: hashtagId,
    p_hidden: hidden ?? null,
    p_featured: featured ?? null,
  });
  return { error: supabaseErrorMessage(error) };
}

// Security
export type UserSessionRow = {
  id: string;
  user_id: string;
  username: string;
  device_name: string | null;
  device_type: string | null;
  ip_address: string | null;
  last_active_at: string;
  is_current: boolean;
};

export async function fetchUserSessions(userId?: string): Promise<UserSessionRow[]> {
  const { data, error } = await supabase.rpc('admin_list_user_sessions', { p_user_id: userId ?? null, p_limit: 50 });
  if (error || !data) return [];
  return data as UserSessionRow[];
}

export async function revokeUserSession(sessionId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_revoke_user_session', { p_session_id: sessionId });
  return { error: supabaseErrorMessage(error) };
}

export async function revokeAllUserSessions(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_revoke_all_user_sessions', { p_user_id: userId });
  return { error: supabaseErrorMessage(error) };
}

export type UserWarningRow = {
  id: string;
  user_id: string;
  username: string;
  level: string;
  reason: string;
  issued_by_username: string;
  expires_at: string | null;
  created_at: string;
};

export async function fetchUserWarnings(userId?: string): Promise<UserWarningRow[]> {
  const { data, error } = await supabase.rpc('admin_list_user_warnings', { p_user_id: userId ?? null, p_limit: 50 });
  if (error || !data) return [];
  return data as UserWarningRow[];
}

// Stripe
export type StripeSubscriptionRow = {
  id: string;
  user_id: string;
  username: string;
  plan: string;
  status: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  cancel_at_period_end: boolean;
  starts_at: string;
  expires_at: string;
};

export async function fetchStripeSubscriptions(): Promise<StripeSubscriptionRow[]> {
  const { data, error } = await supabase.rpc('admin_list_stripe_subscriptions', { p_limit: 50 });
  if (error || !data) return [];
  return data as StripeSubscriptionRow[];
}

export type StripeWebhookSummary = {
  active_subscriptions: number;
  expired_subscriptions: number;
  canceled_subscriptions: number;
  stripe_linked_subscriptions: number;
  contribution_payments: number;
  contribution_total: number;
  last_subscription_at: string | null;
};

export async function fetchStripeWebhookSummary(): Promise<StripeWebhookSummary | null> {
  const { data, error } = await supabase.rpc('get_admin_stripe_summary');
  if (error || !data) return null;
  return data as StripeWebhookSummary;
}

export async function cancelStripeSubscription(subscriptionId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_cancel_stripe_subscription', { p_subscription_id: subscriptionId });
  return { error: supabaseErrorMessage(error) };
}

// Permissions
export type RolePermissionRow = { role: string; permission_key: string; allowed: boolean };

export async function fetchRolePermissions(): Promise<RolePermissionRow[]> {
  const { data, error } = await supabase.rpc('admin_get_role_permissions');
  if (error || !data) return [];
  return data as RolePermissionRow[];
}

export async function setRolePermission(role: string, permissionKey: string, allowed: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_set_role_permission', {
    p_role: role,
    p_permission_key: permissionKey,
    p_allowed: allowed,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function setRolePermissionsBulk(
  role: string,
  permissions: Record<string, boolean>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_set_role_permissions_bulk', {
    p_role: role,
    p_permissions: permissions,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function fetchMyPermissions(): Promise<Record<string, boolean>> {
  const { data, error } = await supabase.rpc('admin_get_my_permissions');
  if (error || !data || typeof data !== 'object') return {};
  return data as Record<string, boolean>;
}

// System
export async function fetchSystemConfig(): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase.rpc('admin_get_system_config');
  if (error || !data) return null;
  return data as Record<string, unknown>;
}

export async function updateSystemConfig(key: string, value: Record<string, unknown>): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_update_system_config', { p_key: key, p_value: value });
  return { error: supabaseErrorMessage(error) };
}
