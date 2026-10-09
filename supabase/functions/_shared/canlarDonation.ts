import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import type Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';

type Admin = SupabaseClient;

function intentId(value: string | Stripe.PaymentIntent | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

async function feeMinor(stripe: Stripe, paymentIntentId: string | null): Promise<number | null> {
  if (!paymentIntentId) return null;
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge.balance_transaction'],
    });
    const charge = paymentIntent.latest_charge;
    if (!charge || typeof charge === 'string') return null;
    const balance = charge.balance_transaction;
    if (!balance || typeof balance === 'string') return null;
    return typeof balance.fee === 'number' ? balance.fee : null;
  } catch {
    return null;
  }
}

async function apply(
  admin: Admin,
  args: Record<string, unknown>,
): Promise<void> {
  const { error } = await admin.rpc('canlar_apply_payment_event', args);
  if (error) throw new Error(error.message);
}

function isCanlar(metadata: Stripe.Metadata | null | undefined): boolean {
  return metadata?.checkout_type === 'canlar_donation';
}

export async function dispatchCanlarStripeEvent(
  admin: Admin,
  stripe: Stripe,
  event: Stripe.Event,
): Promise<boolean> {
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded' || event.type === 'checkout.session.async_payment_failed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (!isCanlar(session.metadata)) return false;
    const paymentIntent = intentId(session.payment_intent);
    const paid = session.payment_status === 'paid';
    const failed = event.type === 'checkout.session.async_payment_failed' || session.payment_status === 'unpaid' && event.type.endsWith('failed');
    await apply(admin, {
      p_event_id: event.id,
      p_kind: paid ? 'succeeded' : failed ? 'failed' : 'pending',
      p_donation_id: session.metadata?.donation_id ?? null,
      p_session_id: session.id,
      p_payment_intent_id: paymentIntent,
      p_charge_id: null,
      p_gross_minor: session.amount_total,
      p_fee_minor: paid ? await feeMinor(stripe, paymentIntent) : null,
      p_refunded_total_minor: null,
      p_dispute_minor: null,
    });
    return true;
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    if (!isCanlar(paymentIntent.metadata)) return false;
    await apply(admin, {
      p_event_id: event.id,
      p_kind: 'failed',
      p_donation_id: paymentIntent.metadata?.donation_id ?? null,
      p_session_id: null,
      p_payment_intent_id: paymentIntent.id,
      p_charge_id: null,
      p_gross_minor: paymentIntent.amount,
      p_fee_minor: null,
      p_refunded_total_minor: null,
      p_dispute_minor: null,
    });
    return true;
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntent = intentId(charge.payment_intent);
    if (!paymentIntent) return false;
    const { data: donation } = await admin
      .from('canlar_donations')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntent)
      .maybeSingle();
    if (!donation) return false;
    await apply(admin, {
      p_event_id: event.id,
      p_kind: 'refund',
      p_donation_id: donation.id,
      p_session_id: null,
      p_payment_intent_id: paymentIntent,
      p_charge_id: charge.id,
      p_gross_minor: charge.amount,
      p_fee_minor: null,
      p_refunded_total_minor: charge.amount_refunded,
      p_dispute_minor: null,
    });
    return true;
  }

  if (event.type === 'charge.dispute.created' || event.type === 'charge.dispute.closed') {
    const dispute = event.data.object as Stripe.Dispute;
    const paymentIntent = intentId(dispute.payment_intent);
    if (!paymentIntent) return false;
    const { data: donation } = await admin
      .from('canlar_donations')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntent)
      .maybeSingle();
    if (!donation) return false;
    const won = event.type === 'charge.dispute.closed' && dispute.status === 'won';
    await apply(admin, {
      p_event_id: event.id,
      p_kind: won ? 'dispute_won' : 'dispute',
      p_donation_id: donation.id,
      p_session_id: null,
      p_payment_intent_id: paymentIntent,
      p_charge_id: typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id ?? null,
      p_gross_minor: null,
      p_fee_minor: null,
      p_refunded_total_minor: null,
      p_dispute_minor: dispute.amount,
    });
    return true;
  }

  return false;
}
