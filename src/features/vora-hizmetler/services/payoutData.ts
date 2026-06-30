import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type AdminVoraPayoutRow = {
  paymentId: string;
  requestId: string;
  requestTitle: string;
  providerName: string;
  providerNetCents: number;
  payoutDueAt: string | null;
  payoutCompletedAt: string | null;
  disputeOpenedAt: string | null;
  status: string;
};

export async function adminListVoraPayouts(
  limit = 50,
): Promise<{ rows: AdminVoraPayoutRow[]; error?: string }> {
  const { data, error } = await supabase.rpc('admin_list_vora_service_payouts', {
    p_limit: limit,
  });

  if (error) return { rows: [], error: supabaseErrorMessage(error) };

  return {
    rows: (data as Record<string, unknown>[] | null)?.map((row) => ({
      paymentId: String(row.payment_id),
      requestId: String(row.request_id),
      requestTitle: String(row.request_title ?? ''),
      providerName: String(row.provider_name ?? ''),
      providerNetCents: Number(row.provider_net_cents ?? 0),
      payoutDueAt: row.payout_due_at ? String(row.payout_due_at) : null,
      payoutCompletedAt: row.payout_completed_at ? String(row.payout_completed_at) : null,
      disputeOpenedAt: row.dispute_opened_at ? String(row.dispute_opened_at) : null,
      status: String(row.status ?? ''),
    })) ?? [],
  };
}

export async function adminMarkVoraPayout(
  paymentId: string,
  reference?: string,
): Promise<{ error?: string }> {
  const { data, error } = await supabase.rpc('admin_mark_vora_service_payout', {
    p_payment_id: paymentId,
    p_reference: reference ?? null,
  });

  if (error) return { error: supabaseErrorMessage(error) };
  const result = data as { ok?: boolean; error?: string } | null;
  if (result?.error) return { error: result.error };
  if (!result?.ok) return { error: 'Ödeme işaretlenemedi' };
  return {};
}

export async function adminRefundVoraServicePayment(
  paymentId: string,
): Promise<{ error?: string; message?: string }> {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; message?: string; error?: string }>(
    'stripe-admin-refund',
    { body: { payment_type: 'vora_service', record_id: paymentId } },
  );

  if (error) return { error: supabaseErrorMessage(error) };
  if (data?.error) return { error: data.error };
  return { message: data?.message ?? 'Stripe iadesi başlatıldı' };
}

export function formatHizmetCents(cents: number): string {
  return `${(cents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 0 })} ₺`;
}
