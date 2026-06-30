import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import type { HeyetCase, HeyetCaseListItem, HeyetStatus, HeyetSubjectType } from '../types';

type HeyetCaseRow = {
  id: string;
  conversation_id: string;
  subject_type: HeyetSubjectType;
  subject_id: string | null;
  party_a_id: string;
  party_b_id: string;
  opened_by: string;
  status: HeyetCase['status'];
  decision_text: string | null;
  decision_by: string | null;
  decision_at: string | null;
  closed_at: string | null;
  created_at: string;
  custom_title?: string | null;
  party_a_username?: string | null;
  party_b_username?: string | null;
};

function mapHeyetCase(raw: HeyetCaseRow | Record<string, unknown>): HeyetCase {
  const row = raw as HeyetCaseRow;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    partyAId: row.party_a_id,
    partyBId: row.party_b_id,
    openedBy: row.opened_by,
    status: row.status,
    decisionText: row.decision_text,
    decisionBy: row.decision_by,
    decisionAt: row.decision_at,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    customTitle: row.custom_title ?? null,
  };
}

function mapHeyetListItem(raw: HeyetCaseRow | Record<string, unknown>): HeyetCaseListItem {
  const row = raw as HeyetCaseRow;
  return {
    ...mapHeyetCase(row),
    partyAUsername: row.party_a_username ?? null,
    partyBUsername: row.party_b_username ?? null,
  };
}

export async function fetchHeyetCaseBySubject(
  subjectType: HeyetSubjectType,
  subjectId: string,
): Promise<{ heyetCase: HeyetCase | null; error: string | null }> {
  const { data, error } = await supabase.rpc('get_heyet_case_by_subject', {
    p_subject_type: subjectType,
    p_subject_id: subjectId,
  });
  if (error) return { heyetCase: null, error: supabaseErrorMessage(error) };
  if (!data) return { heyetCase: null, error: null };
  return { heyetCase: mapHeyetCase(data as Record<string, unknown>), error: null };
}

export async function fetchHeyetCaseForConversation(
  conversationId: string,
): Promise<{ heyetCase: HeyetCase | null; error: string | null }> {
  const { data, error } = await supabase.rpc('get_heyet_case_for_conversation', {
    p_conversation_id: conversationId,
  });
  if (error) return { heyetCase: null, error: supabaseErrorMessage(error) };
  if (!data) return { heyetCase: null, error: null };
  return { heyetCase: mapHeyetCase(data as Record<string, unknown>), error: null };
}

export async function adminOpenHeyet(
  subjectType: HeyetSubjectType,
  subjectId: string,
): Promise<{ conversationId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_open_heyet', {
    p_subject_type: subjectType,
    p_subject_id: subjectId,
  });
  if (error) return { conversationId: null, error: supabaseErrorMessage(error) };
  return { conversationId: data as string, error: null };
}

export async function adminCloseHeyet(caseId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_close_heyet', { p_case_id: caseId });
  return { error: error ? supabaseErrorMessage(error) : null };
}

export async function adminReopenHeyet(caseId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_reopen_heyet', { p_case_id: caseId });
  return { error: error ? supabaseErrorMessage(error) : null };
}

export async function adminPostHeyetDecision(
  caseId: string,
  decisionText: string,
  closeAfter = true,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_post_heyet_decision', {
    p_case_id: caseId,
    p_decision_text: decisionText,
    p_close_after: closeAfter,
  });
  return { error: error ? supabaseErrorMessage(error) : null };
}

export async function adminOpenGeneralHeyet(
  title: string,
  memberIds: string[],
): Promise<{ conversationId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_open_general_heyet', {
    p_title: title,
    p_member_ids: memberIds,
  });
  if (error) return { conversationId: null, error: supabaseErrorMessage(error) };
  return { conversationId: data as string, error: null };
}

export async function adminHeyetAddMembers(
  caseId: string,
  memberIds: string[],
): Promise<{ added: number; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_heyet_add_members', {
    p_case_id: caseId,
    p_member_ids: memberIds,
  });
  if (error) return { added: 0, error: supabaseErrorMessage(error) };
  return { added: Number(data ?? 0), error: null };
}

export async function adminHeyetRemoveMember(
  caseId: string,
  memberId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_heyet_remove_member', {
    p_case_id: caseId,
    p_member_id: memberId,
  });
  return { error: error ? supabaseErrorMessage(error) : null };
}

export async function listAdminHeyetCases(
  status: HeyetStatus | null = null,
  limit = 50,
): Promise<{ items: HeyetCaseListItem[]; error: string | null }> {
  const { data, error } = await supabase.rpc('list_admin_heyet_cases', {
    p_status: status,
    p_limit: limit,
  });
  if (error) return { items: [], error: supabaseErrorMessage(error) };
  const rows = (data ?? []) as Record<string, unknown>[];
  return { items: rows.map(mapHeyetListItem), error: null };
}
