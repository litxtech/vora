import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import type Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { upsertStripeSubscription } from '../_shared/premiumSubscription.ts';
import { corsHeaders, getStripe, stripeCryptoProvider } from '../_shared/stripe.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!webhookSecret) {
    return new Response(JSON.stringify({ error: 'Webhook secret missing' }), { status: 500 });
  }

  try {
    const stripe = getStripe();
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing signature' }), { status: 400 });
    }

    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      stripeCryptoProvider,
    );

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'payment' && session.metadata?.checkout_type === 'event_ticket') {
          const eventId = session.metadata.event_id;
          const userId = session.metadata.user_id ?? session.client_reference_id;
          const amountCents = parseInt(session.metadata.amount_cents ?? '0', 10);
          const paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

          if (eventId && userId) {
            await admin.rpc('fulfill_event_ticket', {
              p_event_id: eventId,
              p_user_id: userId,
              p_session_id: session.id,
              p_payment_intent_id: paymentIntentId,
              p_amount_cents: amountCents || session.amount_total || 0,
            });
          }
        } else if (session.mode === 'payment' && session.metadata?.checkout_type === 'marketplace_order') {
          const listingId = session.metadata.listing_id;
          const userId = session.metadata.user_id ?? session.client_reference_id;
          const amountCents = parseInt(session.metadata.amount_cents ?? '0', 10);
          const paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

          if (listingId && userId) {
            await admin.rpc('fulfill_marketplace_order', {
              p_listing_id: listingId,
              p_buyer_id: userId,
              p_session_id: session.id,
              p_payment_intent_id: paymentIntentId,
              p_gross_cents: amountCents || session.amount_total || 0,
            });
          }
        } else if (session.mode === 'payment' && session.metadata?.checkout_type === 'vora_service_offer') {
          const requestId = session.metadata.request_id;
          const offerId = session.metadata.offer_id;
          const userId = session.metadata.user_id ?? session.client_reference_id;
          const amountCents = parseInt(session.metadata.amount_cents ?? '0', 10);
          const paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

          if (requestId && offerId && userId) {
            await admin.rpc('fulfill_vora_service_payment', {
              p_request_id: requestId,
              p_offer_id: offerId,
              p_payer_id: userId,
              p_session_id: session.id,
              p_payment_intent_id: paymentIntentId,
              p_gross_cents: amountCents || session.amount_total || 0,
            });
          }
        } else if (session.mode === 'payment' && session.metadata?.checkout_type === 'ad_wallet_topup') {
          const userId = session.metadata.user_id ?? session.client_reference_id;
          const amountCents = parseInt(session.metadata.amount_cents ?? '0', 10);

          if (userId && amountCents > 0) {
            await admin.rpc('fulfill_ad_wallet_topup', {
              p_user_id: userId,
              p_amount_cents: amountCents || session.amount_total || 0,
              p_session_id: session.id,
              p_idempotency_key: `ad_topup:${session.id}`,
            });
          }
        } else if (session.mode === 'setup' && session.metadata?.checkout_type === 'ad_card_setup') {
          const userId = session.metadata.user_id ?? session.client_reference_id;
          const setupIntentId = typeof session.setup_intent === 'string'
            ? session.setup_intent
            : session.setup_intent?.id ?? null;

          if (userId && setupIntentId) {
            const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
            const paymentMethodId = typeof setupIntent.payment_method === 'string'
              ? setupIntent.payment_method
              : setupIntent.payment_method?.id ?? null;

            if (paymentMethodId) {
              await admin.rpc('fulfill_ad_card_setup', {
                p_user_id: userId,
                p_payment_method_id: paymentMethodId,
              });
            }
          }
        } else if (session.mode === 'setup' && session.metadata?.checkout_type === 'ride_reservation') {
          const reservationId = session.metadata.reservation_id;
          const userId = session.metadata.user_id ?? session.client_reference_id;
          const setupIntentId = typeof session.setup_intent === 'string'
            ? session.setup_intent
            : session.setup_intent?.id ?? null;

          if (reservationId && userId && setupIntentId) {
            const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
            const paymentMethodId = typeof setupIntent.payment_method === 'string'
              ? setupIntent.payment_method
              : setupIntent.payment_method?.id ?? null;

            if (paymentMethodId) {
              await admin.rpc('fulfill_ride_reservation_card', {
                p_reservation_id: reservationId,
                p_passenger_id: userId,
                p_session_id: session.id,
                p_setup_intent_id: setupIntentId,
                p_payment_method_id: paymentMethodId,
              });
            }
          }
        } else if (session.mode === 'payment' && session.metadata?.checkout_type === 'ride_reservation') {
          const reservationId = session.metadata.reservation_id;
          const userId = session.metadata.user_id ?? session.client_reference_id;
          const amountCents = parseInt(session.metadata.amount_cents ?? '0', 10);
          const paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

          if (reservationId && userId) {
            await admin.rpc('fulfill_ride_reservation_payment', {
              p_reservation_id: reservationId,
              p_passenger_id: userId,
              p_session_id: session.id,
              p_payment_intent_id: paymentIntentId,
              p_amount_cents: amountCents || session.amount_total || 0,
            });
          }
        } else if (session.mode === 'payment' && session.metadata?.checkout_type === 'platform_contribution') {
          const userId = session.metadata.user_id ?? session.client_reference_id;
          const tier = session.metadata.tier;
          const amountCents = parseInt(session.metadata.amount_cents ?? '0', 10);
          const paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

          if (userId && tier) {
            await admin.rpc('fulfill_platform_contribution', {
              p_user_id: userId,
              p_tier: tier,
              p_session_id: session.id,
              p_payment_intent_id: paymentIntentId,
              p_amount_cents: amountCents || session.amount_total || 0,
            });
          }
        } else if (session.mode === 'payment' && session.metadata?.checkout_type === 'hotel_reservation') {
          const reservationId = session.metadata.reservation_id;
          const userId = session.metadata.user_id ?? session.client_reference_id;
          const amountCents = parseInt(session.metadata.amount_cents ?? '0', 10);
          const paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

          if (reservationId && userId) {
            await admin.rpc('fulfill_hotel_reservation_payment', {
              p_reservation_id: reservationId,
              p_guest_id: userId,
              p_payment_intent_id: paymentIntentId,
              p_amount_cents: amountCents || session.amount_total || 0,
            });
          }
        } else if (session.mode === 'payment' && session.metadata?.checkout_type === 'business_shop_boost') {
          const boostId = session.metadata.boost_id;
          const userId = session.metadata.user_id ?? session.client_reference_id;
          const amountCents = parseInt(session.metadata.amount_cents ?? '0', 10);
          const paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null;

          if (boostId && userId) {
            const { error: fulfillError } = await admin.rpc('fulfill_business_shop_boost', {
              p_boost_id: boostId,
              p_session_id: session.id,
              p_payment_intent_id: paymentIntentId,
              p_amount_cents: amountCents || session.amount_total || 0,
            });
            if (fulfillError) {
              console.error('fulfill_business_shop_boost failed:', fulfillError.message);
            }
          }
        } else if (session.mode === 'subscription' && session.subscription) {
          if (session.payment_status !== 'paid') {
            break;
          }
          const userId = session.metadata?.user_id ?? session.client_reference_id;
          if (!userId) {
            break;
          }
          const subId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;
          let sub = await stripe.subscriptions.retrieve(subId);
          if (!sub.metadata?.user_id || !sub.metadata?.plan) {
            sub = await stripe.subscriptions.update(subId, {
              metadata: {
                ...sub.metadata,
                user_id: userId,
                plan: session.metadata?.plan ?? sub.metadata?.plan ?? 'monthly',
              },
            });
          }
          const result = await upsertStripeSubscription(admin, stripe, sub, {
            userId,
            plan: session.metadata?.plan as 'monthly' | 'yearly' | undefined,
            paymentVerified: true,
          });
          if (result.error) {
            console.error('checkout.session.completed upsert failed:', result.error);
          }
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (!userId) {
          console.error(`${event.type}: missing user_id metadata`, sub.id);
          break;
        }
        const result = await upsertStripeSubscription(admin, stripe, sub, { userId });
        if (result.error) {
          console.error(`${event.type} upsert failed:`, result.error);
        }
        break;
      }
      default:
        break;
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.metadata?.checkout_type === 'hotel_reservation') {
        const reservationId = pi.metadata.reservation_id;
        const userId = pi.metadata.user_id;
        const amountCents = pi.amount_received ?? pi.amount ?? 0;
        if (reservationId && userId) {
          await admin.rpc('fulfill_hotel_reservation_payment', {
            p_reservation_id: reservationId,
            p_guest_id: userId,
            p_payment_intent_id: pi.id,
            p_amount_cents: amountCents,
          });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('stripe-webhook error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
