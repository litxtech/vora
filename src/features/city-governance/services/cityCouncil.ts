import type { RegionId } from '@/constants/regions';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type CouncilProposal = {
  id: string;
  regionId: RegionId;
  title: string;
  description: string | null;
  status: string;
  supportCount: number;
  createdAt: string;
};

export async function fetchCouncilProposals(regionId: RegionId): Promise<CouncilProposal[]> {
  const { data, error } = await supabase
    .from('city_council_proposals')
    .select('id, region_id, title, description, status, support_count, created_at')
    .eq('region_id', regionId)
    .order('support_count', { ascending: false })
    .limit(30);

  if (error) throw new Error(supabaseErrorMessage(error));
  return (data ?? []).map((row) => ({
    id: row.id,
    regionId: row.region_id as RegionId,
    title: row.title,
    description: row.description,
    status: row.status,
    supportCount: row.support_count,
    createdAt: row.created_at,
  }));
}

export async function createCouncilProposal(
  regionId: RegionId,
  title: string,
  description?: string,
): Promise<void> {
  const { error } = await supabase.rpc('create_city_council_proposal', {
    p_region_id: regionId,
    p_title: title,
    p_description: description ?? null,
  });
  if (error) throw new Error(supabaseErrorMessage(error));
}

export async function supportCouncilProposal(proposalId: string): Promise<void> {
  const { error } = await supabase.rpc('support_city_council_proposal', { p_proposal_id: proposalId });
  if (error) throw new Error(supabaseErrorMessage(error));
}

export async function startCouncilSession(regionId: RegionId, title: string, agenda?: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_city_council_session', {
    p_region_id: regionId,
    p_title: title,
    p_agenda: agenda ?? null,
  });
  if (error) throw new Error(supabaseErrorMessage(error));
  return (data as { id: string }).id;
}

export type AgendaFeedItem = {
  id: string;
  feedType: string;
  regionId: string;
  title: string;
  subtitle: string | null;
  referenceId: string | null;
  occurredAt: string;
};

export type CouncilSession = {
  id: string;
  regionId: RegionId;
  regionName: string;
  title: string;
  agenda: string | null;
  status: string;
  sessionType: string;
  voiceRoomId: string | null;
  startedAt: string | null;
  endedAt: string | null;
};

export type CouncilDecision = {
  id: string;
  title: string;
  decisionText: string;
  status: string;
};

export async function fetchCouncilSession(sessionId: string): Promise<CouncilSession | null> {
  const { data, error } = await supabase
    .from('city_council_sessions')
    .select('id, region_id, title, agenda, status, session_type, voice_room_id, started_at, ended_at, regions:region_id (name)')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) throw new Error(supabaseErrorMessage(error));
  if (!data) return null;

  const region = Array.isArray(data.regions) ? data.regions[0] : data.regions;

  return {
    id: data.id,
    regionId: data.region_id as RegionId,
    regionName: region?.name ?? data.region_id,
    title: data.title,
    agenda: data.agenda,
    status: data.status,
    sessionType: data.session_type,
    voiceRoomId: data.voice_room_id,
    startedAt: data.started_at,
    endedAt: data.ended_at,
  };
}

export async function fetchCouncilSessionDecisions(sessionId: string): Promise<CouncilDecision[]> {
  const { data, error } = await supabase
    .from('city_council_decisions')
    .select('id, title, decision_text, status')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(supabaseErrorMessage(error));
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    decisionText: row.decision_text,
    status: row.status,
  }));
}

export async function fetchCityAgendaFeed(limit = 20): Promise<AgendaFeedItem[]> {
  const { data, error } = await supabase.rpc('get_city_agenda_feed', { p_limit: limit });
  if (error) throw new Error(supabaseErrorMessage(error));
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    feedType: String(row.feed_type),
    regionId: String(row.region_id),
    title: String(row.title),
    subtitle: row.subtitle ? String(row.subtitle) : null,
    referenceId: row.reference_id ? String(row.reference_id) : null,
    occurredAt: String(row.occurred_at),
  }));
}
