import { supabase } from '@/lib/supabase/client';
import type { Json } from '@/types/database';
import { supabaseErrorMessage } from '@/lib/errors';

function asRecord(value: Json | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function readPremiumTermsAcceptedAt(policyConsents: Json | null | undefined): string | null {
  const value = asRecord(policyConsents).premium_terms_accepted_at;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function hasPremiumTermsAccepted(policyConsents: Json | null | undefined): boolean {
  return readPremiumTermsAcceptedAt(policyConsents) !== null;
}

export async function fetchPremiumTermsAccepted(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('policy_consents')
    .eq('id', userId)
    .maybeSingle();

  if (error) return false;
  return hasPremiumTermsAccepted(data?.policy_consents);
}

export async function savePremiumTermsAcceptance(
  userId: string,
  policyConsents: Json | null | undefined,
): Promise<{ error: string | null; acceptedAt: string | null }> {
  const acceptedAt = new Date().toISOString();
  const merged: Json = {
    ...asRecord(policyConsents),
    premium_terms_accepted_at: acceptedAt,
  };

  const { error } = await supabase.from('profiles').update({ policy_consents: merged }).eq('id', userId);

  return { error: supabaseErrorMessage(error), acceptedAt: error ? null : acceptedAt };
}
