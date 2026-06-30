import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase/client';
import { edgeFunctionErrorMessage, supabaseErrorMessage } from '@/lib/errors';

function hizmetCheckoutReturnUrl(requestId: string, result: 'success' | 'cancelled'): string {
  return Linking.createURL(`detail/vora-hizmetler/request/${requestId}`, {
    queryParams: { checkout: result },
  });
}

export async function startHizmetStripeCheckout(
  requestId: string,
  offerId: string,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    'stripe-create-hizmet-checkout',
    {
      body: {
        requestId,
        offerId,
        successUrl: hizmetCheckoutReturnUrl(requestId, 'success'),
        cancelUrl: hizmetCheckoutReturnUrl(requestId, 'cancelled'),
      },
    },
  );

  if (error) {
    return {
      error: await edgeFunctionErrorMessage(error, data, {
        fallback: 'Ödeme sunucusuna ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.',
      }),
    };
  }
  if (data?.error) return { error: data.error };
  if (!data?.url) return { error: 'Ödeme sayfası açılamadı.' };

  await WebBrowser.openAuthSessionAsync(data.url, hizmetCheckoutReturnUrl(requestId, 'success'));
  return { error: null };
}

export async function fetchRequestPayments(
  requestId: string,
): Promise<{ payments: ServicePaymentSummary[] }> {
  const { data } = await supabase
    .from('vora_service_payments')
    .select(
      'id, amount, method, status, job_completed_at, payout_due_at, payout_completed_at, provider_net_cents, dispute_opened_at',
    )
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });

  return { payments: (data as ServicePaymentSummary[] | null) ?? [] };
}

export type ServicePaymentSummary = {
  id: string;
  amount: number;
  method: string;
  status: string;
  job_completed_at: string | null;
  payout_due_at: string | null;
  payout_completed_at: string | null;
  provider_net_cents: number | null;
  dispute_opened_at: string | null;
};

export async function completeServiceJob(
  requestId: string,
): Promise<{ payoutDueAt?: string; error?: string }> {
  const { data, error } = await supabase.rpc('complete_vora_service_job', {
    p_request_id: requestId,
  });

  if (error) return { error: supabaseErrorMessage(error) };
  const result = data as { ok?: boolean; error?: string; payout_due_at?: string } | null;
  if (result?.error) return { error: result.error };
  if (!result?.ok) return { error: 'İş tamamlanamadı.' };
  return { payoutDueAt: result.payout_due_at };
}

export type HizmetWalletPaymentRow = {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  requestTitle: string | null;
  direction: 'out' | 'in';
  payoutDueAt?: string | null;
  payoutCompletedAt?: string | null;
};

const PAYMENT_STATUS_WALLET: Record<string, 'completed' | 'pending' | 'scheduled'> = {
  authorized: 'pending',
  pending: 'pending',
  completed: 'completed',
  refunded: 'completed',
};

export async function fetchUserHizmetWalletPayments(
  userId: string,
  providerId?: string | null,
  limit = 30,
): Promise<HizmetWalletPaymentRow[]> {
  const rows: HizmetWalletPaymentRow[] = [];

  const { data: asPayer } = await supabase
    .from('vora_service_payments')
    .select('id, amount, method, status, created_at, payout_due_at, payout_completed_at, vora_service_requests(title)')
    .eq('payer_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  for (const row of asPayer ?? []) {
    const request = Array.isArray(row.vora_service_requests)
      ? row.vora_service_requests[0]
      : row.vora_service_requests;
    rows.push({
      id: row.id,
      amount: Number(row.amount),
      method: row.method,
      status: row.status,
      createdAt: row.created_at,
      requestTitle: request?.title ?? null,
      direction: 'out',
      payoutDueAt: row.payout_due_at ?? null,
      payoutCompletedAt: row.payout_completed_at ?? null,
    });
  }

  if (providerId) {
    const { data: asPayee } = await supabase
      .from('vora_service_payments')
      .select('id, amount, method, status, created_at, payout_due_at, payout_completed_at, vora_service_requests(title)')
      .eq('payee_provider_id', providerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    for (const row of asPayee ?? []) {
      const request = Array.isArray(row.vora_service_requests)
        ? row.vora_service_requests[0]
        : row.vora_service_requests;
      rows.push({
        id: row.id,
        amount: Number(row.amount),
        method: row.method,
        status: row.status,
        createdAt: row.created_at,
        requestTitle: request?.title ?? null,
        direction: 'in',
        payoutDueAt: row.payout_due_at ?? null,
        payoutCompletedAt: row.payout_completed_at ?? null,
      });
    }
  }

  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return rows.slice(0, limit);
}

export function hizmetPaymentWalletStatus(
  status: string,
  payoutDueAt?: string | null,
  payoutCompletedAt?: string | null,
): 'completed' | 'pending' | 'scheduled' {
  if (status === 'completed' || payoutCompletedAt) return 'completed';
  if (status === 'authorized' && payoutDueAt) return 'scheduled';
  return PAYMENT_STATUS_WALLET[status] ?? 'pending';
}

export function requestHasPaidPayment(
  payments: { status: string }[],
): boolean {
  return payments.some((p) => p.status === 'authorized' || p.status === 'completed');
}
