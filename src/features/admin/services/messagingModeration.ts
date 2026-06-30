import { supabase } from '@/lib/supabase/client';
import type { ReportQueueStatus } from '@/features/admin/types';
import type { ReportReason } from '@/types/database';
import { supabaseErrorMessage } from '@/lib/errors';
import {
  MESSAGING_TARGET_TYPES,
  type MessagingReportRow,
} from '@/features/admin/services/messagingPresentation';

export type { MessagingReportRow };

export type MessagingRecentMessage = {
  content: string | null;
  sender: string | null;
  created_at: string;
};

export type MessagingMessageContext = {
  type: 'message';
  content: string | null;
  sender_id: string | null;
  sender_username: string | null;
  conversation_id: string | null;
  created_at: string | null;
};

export type MessagingConversationContext = {
  type: 'conversation';
  title: string | null;
  conversation_type: string | null;
  admin_locked: boolean;
  member_count: number;
  recent_messages: MessagingRecentMessage[];
};

export type MessagingCallContext = {
  type: 'call';
  caller_id: string;
  callee_id: string;
  caller_username: string;
  callee_username: string;
  call_type: string;
  status: string;
  channel_name: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

export type MessagingContext = MessagingMessageContext | MessagingConversationContext | MessagingCallContext;

type FetchFilters = {
  status?: ReportQueueStatus;
  targetType?: (typeof MESSAGING_TARGET_TYPES)[number];
  limit?: number;
};

export async function fetchMessagingModerationReports(
  filters?: FetchFilters,
): Promise<{ data: MessagingReportRow[]; error: string | null }> {
  let query = supabase
    .from('content_reports')
    .select(
      `
        id,
        reporter_id,
        target_type,
        target_id,
        reason,
        details,
        status,
        priority,
        assigned_to,
        resolved_at,
        resolution_note,
        created_at,
        reporter:profiles!content_reports_reporter_id_fkey(username)
      `,
    )
    .in('target_type', [...MESSAGING_TARGET_TYPES])
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(filters?.limit ?? 100);

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.targetType) query = query.eq('target_type', filters.targetType);

  const { data, error } = await query;

  if (error) {
    return { data: [], error: supabaseErrorMessage(error)! };
  }

  const rows: MessagingReportRow[] = (data ?? []).map((row) => {
    const reporter = row.reporter as { username: string } | null;
    return {
      id: row.id,
      reporter_id: row.reporter_id,
      reporter_username: reporter?.username ?? null,
      target_type: row.target_type,
      target_id: row.target_id,
      reason: row.reason as ReportReason,
      details: row.details,
      status: row.status as ReportQueueStatus,
      priority: row.priority,
      assigned_to: row.assigned_to,
      resolved_at: row.resolved_at,
      resolution_note: row.resolution_note,
      created_at: row.created_at,
    };
  });

  return { data: rows, error: null };
}

async function fetchCallContext(targetId: string): Promise<MessagingCallContext | null> {
  const { data, error } = await supabase
    .from('call_sessions')
    .select(
      `
        id,
        caller_id,
        callee_id,
        call_type,
        status,
        channel_name,
        started_at,
        ended_at,
        created_at,
        caller:profiles!call_sessions_caller_id_fkey(username),
        callee:profiles!call_sessions_callee_id_fkey(username)
      `,
    )
    .eq('id', targetId)
    .maybeSingle();

  if (error || !data) return null;

  const caller = data.caller as { username: string } | null;
  const callee = data.callee as { username: string } | null;

  return {
    type: 'call',
    caller_id: data.caller_id,
    callee_id: data.callee_id,
    caller_username: caller?.username ?? '—',
    callee_username: callee?.username ?? '—',
    call_type: data.call_type,
    status: data.status,
    channel_name: data.channel_name,
    started_at: data.started_at,
    ended_at: data.ended_at,
    created_at: data.created_at,
  };
}

function parseRpcContext(raw: Record<string, unknown>): MessagingContext | null {
  const type = raw.type as string | undefined;
  if (type === 'message') {
    return {
      type: 'message',
      content: (raw.content as string | null) ?? null,
      sender_id: (raw.sender_id as string | null) ?? null,
      sender_username: (raw.sender_username as string | null) ?? null,
      conversation_id: (raw.conversation_id as string | null) ?? null,
      created_at: (raw.created_at as string | null) ?? null,
    };
  }

  if (type === 'conversation') {
    const recent = Array.isArray(raw.recent_messages) ? raw.recent_messages : [];
    return {
      type: 'conversation',
      title: (raw.title as string | null) ?? null,
      conversation_type: (raw.conversation_type as string | null) ?? null,
      admin_locked: Boolean(raw.admin_locked),
      member_count: typeof raw.member_count === 'number' ? raw.member_count : 0,
      recent_messages: recent.map((item) => {
        const msg = item as Record<string, unknown>;
        return {
          content: (msg.content as string | null) ?? null,
          sender: (msg.sender as string | null) ?? null,
          created_at: (msg.created_at as string) ?? '',
        };
      }),
    };
  }

  return null;
}

export async function fetchMessagingContext(
  targetType: string,
  targetId: string,
): Promise<{ data: MessagingContext | null; error: string | null }> {
  if (targetType === 'call') {
    const callCtx = await fetchCallContext(targetId);
    if (!callCtx) return { data: null, error: 'Arama kaydı bulunamadı.' };
    return { data: callCtx, error: null };
  }

  const { data, error } = await supabase.rpc('admin_get_messaging_context', {
    p_target_type: targetType,
    p_target_id: targetId,
  });

  if (error) {
    return { data: null, error: supabaseErrorMessage(error)! };
  }

  if (!data || typeof data !== 'object') {
    return { data: null, error: 'İçerik bulunamadı veya silinmiş olabilir.' };
  }

  const parsed = parseRpcContext(data as Record<string, unknown>);
  if (!parsed) {
    return { data: null, error: 'Bağlam verisi okunamadı.' };
  }

  if (parsed.type === 'message' && !parsed.content && !parsed.sender_id) {
    return { data: parsed, error: 'Mesaj silinmiş veya erişilemiyor olabilir.' };
  }

  return { data: parsed, error: null };
}

export function extractSubjectUserId(
  report: MessagingReportRow,
  context: MessagingContext | null,
): { userId: string; username: string } | null {
  if (context?.type === 'message' && context.sender_id) {
    return {
      userId: context.sender_id,
      username: context.sender_username ?? 'kullanıcı',
    };
  }

  if (context?.type === 'call') {
    return { userId: context.caller_id, username: context.caller_username };
  }

  return null;
}
