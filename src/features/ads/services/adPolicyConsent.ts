import { supabase } from '@/lib/supabase/client';
import type { Json } from '@/types/database';
import { supabaseErrorMessage } from '@/lib/errors';

function asRecord(value: Json | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function readAdPolicyAcceptedAt(policyConsents: Json | null | undefined): string | null {
  const value = asRecord(policyConsents).ad_policy_accepted_at;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function hasAdPolicyAccepted(policyConsents: Json | null | undefined): boolean {
  return readAdPolicyAcceptedAt(policyConsents) !== null;
}

export async function fetchAdPolicyAccepted(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('policy_consents')
    .eq('id', userId)
    .maybeSingle();

  if (error) return false;
  return hasAdPolicyAccepted(data?.policy_consents);
}

export async function saveAdPolicyAcceptance(
  userId: string,
  policyConsents: Json | null | undefined,
): Promise<{ error: string | null; acceptedAt: string | null }> {
  const acceptedAt = new Date().toISOString();
  const merged: Json = {
    ...asRecord(policyConsents),
    ad_policy_accepted_at: acceptedAt,
    ad_policy_version: '1.0',
  };

  const { error } = await supabase.from('profiles').update({ policy_consents: merged }).eq('id', userId);

  return { error: supabaseErrorMessage(error), acceptedAt: error ? null : acceptedAt };
}
