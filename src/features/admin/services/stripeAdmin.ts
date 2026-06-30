import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

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

export type StripeWebhookSummary = {
  active_subscriptions: number;
  expired_subscriptions: number;
  canceled_subscriptions: number;
  stripe_linked_subscriptions: number;
  contribution_payments: number;
  contribution_total: number;
  event_ticket_payments?: number;
  event_ticket_total?: number;
  refunded_payments?: number;
  refunded_total?: number;
  pending_payments?: number;
  last_subscription_at: string | null;
  last_payment_at?: string | null;
};

export type StripePaymentRow = {
  id: string;
  payment_type: 'contribution' | 'event_ticket';
  user_id: string;
  username: string;
  label: string;
  amount_cents: number;
  status: string;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  created_at: string;
};

export type StripeAdminSnapshot = {
  summary: StripeWebhookSummary | null;
  subscriptions: StripeSubscriptionRow[];
  payments: StripePaymentRow[];
};

export async function fetchStripeAdminSnapshot(): Promise<StripeAdminSnapshot> {
  const [summaryRes, subscriptionsRes, paymentsRes] = await Promise.all([
    supabase.rpc('get_admin_stripe_summary'),
    supabase.rpc('admin_list_stripe_subscriptions', { p_limit: 50 }),
    supabase.rpc('admin_list_stripe_payments', { p_limit: 50 }),
  ]);

  return {
    summary: summaryRes.error || !summaryRes.data ? null : (summaryRes.data as StripeWebhookSummary),
    subscriptions: subscriptionsRes.error || !subscriptionsRes.data ? [] : (subscriptionsRes.data as StripeSubscriptionRow[]),
    payments: paymentsRes.error || !paymentsRes.data ? [] : (paymentsRes.data as StripePaymentRow[]),
  };
}

export async function cancelStripeSubscription(subscriptionId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_cancel_stripe_subscription', { p_subscription_id: subscriptionId });
  return { error: supabaseErrorMessage(error) };
}

export async function refundStripePayment(
  paymentType: StripePaymentRow['payment_type'],
  recordId: string,
): Promise<{ error: string | null; message?: string }> {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; message?: string; error?: string }>(
    'stripe-admin-refund',
    { body: { payment_type: paymentType, record_id: recordId } },
  );

  if (error) return { error: supabaseErrorMessage(error)! };
  if (data?.error) return { error: data.error };
  return { error: null, message: data?.message };
}
