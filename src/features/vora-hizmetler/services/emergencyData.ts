import type { ServiceCategory } from '@/features/vora-hizmetler/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type EmergencySessionSummary = {
  id: string;
  category: ServiceCategory;
  requesterId: string;
  matchedProviderId: string | null;
  matchedProviderName: string | null;
  matchedAt: string | null;
  requestId: string | null;
  expiresAt: string;
  isExpired: boolean;
};

export async function fetchEmergencySession(
  sessionId: string,
): Promise<{ session: EmergencySessionSummary | null; error?: string }> {
  const { data, error } = await supabase.rpc('fetch_vora_emergency_session', {
    p_session_id: sessionId,
  });

  if (error) return { session: null, error: supabaseErrorMessage(error) };
  const row = data as Record<string, unknown> | null;
  if (row?.error) return { session: null, error: String(row.error) };
  if (!row?.id) return { session: null, error: 'Oturum bulunamadı' };

  return {
    session: {
      id: String(row.id),
      category: row.category as ServiceCategory,
      requesterId: String(row.requester_id),
      matchedProviderId: row.matched_provider_id ? String(row.matched_provider_id) : null,
      matchedProviderName: row.matched_provider_name ? String(row.matched_provider_name) : null,
      matchedAt: row.matched_at ? String(row.matched_at) : null,
      requestId: row.request_id ? String(row.request_id) : null,
      expiresAt: String(row.expires_at),
      isExpired: Boolean(row.is_expired),
    },
  };
}

export async function acceptEmergencySession(
  sessionId: string,
): Promise<{ requestId?: string; providerName?: string; error?: string }> {
  const { data, error } = await supabase.rpc('accept_vora_emergency_session', {
    p_session_id: sessionId,
  });

  if (error) return { error: supabaseErrorMessage(error) };
  const result = data as {
    ok?: boolean;
    error?: string;
    request_id?: string;
    provider_name?: string;
  } | null;
  if (result?.error) return { error: result.error };
  if (!result?.ok) return { error: 'Kabul edilemedi' };
  return { requestId: result.request_id, providerName: result.provider_name };
}

export function subscribeEmergencySession(
  sessionId: string,
  onUpdate: () => void,
): () => void {
  const channel = supabase
    .channel(`vora-emergency-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'vora_service_emergency_sessions',
        filter: `id=eq.${sessionId}`,
      },
      () => onUpdate(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
